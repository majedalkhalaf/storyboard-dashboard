import type { FileCategory } from "./types";

// رفع مجزّأ (multipart) مباشر من المتصفح إلى Cloudflare R2 عبر روابط موقّعة
// لكل جزء — بايتات الملف لا تمر عبر خادمنا إطلاقاً، فلا حد حجم من طبقة
// Netlify Functions. يُستخدم لملفات الفيديو الكبيرة بدل مسار Supabase Storage
// (storage-upload.ts) الذي يبقى للملفات الأخرى (صور/مستندات/إلخ).
const PART_SIZE = 8 * 1024 * 1024; // 8 ميجابايت لكل جزء (الحد الأدنى المسموح به في S3/R2 هو 5MB باستثناء الجزء الأخير)
const MAX_CONCURRENT_PARTS = 3;

export interface R2UploadController {
  cancel: () => void;
  pause: () => void;
  resume: () => void;
}

export interface R2UploadHandlers {
  onProgress?: (loaded: number, total: number) => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export async function startR2Upload(
  params: { file: File; projectId: string; episodeId: string | null; category: FileCategory },
  handlers: R2UploadHandlers
): Promise<{ key: string; controller: R2UploadController }> {
  const createRes = await fetch("/api/uploads/r2/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: params.file.name,
      contentType: params.file.type || "application/octet-stream",
      projectId: params.projectId,
      episodeId: params.episodeId,
      category: params.category,
    }),
  });
  const createJson = (await createRes.json()) as { uploadId?: string; key?: string; error?: string };
  if (!createRes.ok || !createJson.uploadId || !createJson.key) {
    throw new Error(createJson.error || "تعذّر بدء الرفع");
  }
  const uploadId = createJson.uploadId;
  const key = createJson.key;

  let cancelled = false;
  let paused = false;
  let finished = false;
  // يتحوّل true عند فشل رفع أي جزء — يمنع بقية الأجزاء المرفوعة بنجاح من
  // "إكمال" الرفع المجزّأ بقائمة أجزاء ناقصة (كائن R2 مبتور بلا الجزء الفاشل)،
  // وهو تحديداً الخلل الذي كان يجعل ملفات الفيديو الكبيرة (أكثر من جزء واحد،
  // 8 ميجابايت) تنزل "تبدأ ثم تُلغى" عند العميل بعد رفع بدا ناجحاً ظاهرياً.
  let hadFailure = false;
  let nextPartIndex = 0;
  let activeUploads = 0;
  let uploadedBytes = 0;
  const parts: { PartNumber: number; ETag: string }[] = [];
  const totalParts = Math.max(1, Math.ceil(params.file.size / PART_SIZE));

  async function uploadPart(partNumber: number): Promise<void> {
    const start = (partNumber - 1) * PART_SIZE;
    const end = Math.min(start + PART_SIZE, params.file.size);
    const blob = params.file.slice(start, end);

    const urlRes = await fetch("/api/uploads/r2/part-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId, partNumber }),
    });
    const urlJson = (await urlRes.json()) as { url?: string; error?: string };
    if (!urlRes.ok || !urlJson.url) throw new Error(urlJson.error || "تعذّر إصدار رابط رفع الجزء");

    const putRes = await fetch(urlJson.url, { method: "PUT", body: blob });
    if (!putRes.ok) throw new Error(`فشل رفع أحد الأجزاء (خطأ ${putRes.status})`);
    const etag = putRes.headers.get("ETag") || putRes.headers.get("etag");
    if (!etag) throw new Error("لم يُعِد الخادم رمز ETag للجزء المرفوع — تحقق من إعداد CORS (ExposeHeaders: ETag) على الـ bucket");

    parts.push({ PartNumber: partNumber, ETag: etag });
    uploadedBytes += blob.size;
    handlers.onProgress?.(uploadedBytes, params.file.size);
  }

  async function finalize() {
    if (finished) return;
    finished = true;
    try {
      const res = await fetch("/api/uploads/r2/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, uploadId, parts: parts.slice().sort((a, b) => a.PartNumber - b.PartNumber) }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || "تعذّر إنهاء الرفع");
      handlers.onSuccess?.();
    } catch (err) {
      finished = false;
      handlers.onError?.(err instanceof Error ? err.message : "تعذّر إنهاء الرفع");
    }
  }

  async function pump() {
    activeUploads++;
    while (!cancelled && !hadFailure && !paused && nextPartIndex < totalParts) {
      const partNumber = nextPartIndex + 1;
      nextPartIndex++;
      try {
        await uploadPart(partNumber);
      } catch (err) {
        activeUploads--;
        if (!cancelled && !hadFailure) {
          hadFailure = true;
          handlers.onError?.(err instanceof Error ? err.message : "تعذّر رفع الملف");
          // نُلغي الرفع المجزّأ بالكامل بدل تركه معلَّقاً على R2 — أي محاولة إكمال
          // لاحقة بأجزاء ناقصة سترفضها R2 أصلاً، فلا داعي لإبقائه.
          fetch("/api/uploads/r2/abort", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, uploadId }),
          }).catch(() => {});
        }
        return;
      }
    }
    activeUploads--;
    if (!cancelled && !hadFailure && !paused && nextPartIndex >= totalParts && activeUploads === 0) {
      await finalize();
    }
  }

  function runPumps() {
    for (let i = 0; i < MAX_CONCURRENT_PARTS; i++) pump();
  }

  runPumps();

  const controller: R2UploadController = {
    cancel: () => {
      cancelled = true;
      fetch("/api/uploads/r2/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, uploadId }),
      }).catch(() => {});
    },
    pause: () => {
      paused = true;
    },
    resume: () => {
      if (!paused || cancelled) return;
      paused = false;
      runPumps();
    },
  };

  return { key, controller };
}
