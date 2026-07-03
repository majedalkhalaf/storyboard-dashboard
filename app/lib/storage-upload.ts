import type { SupabaseClient } from "@supabase/supabase-js";
import * as tus from "tus-js-client";

// الملفات الأكبر من هذا الحد تُرفع عبر بروتوكول TUS القابل للاستئناف (نفس التوصية
// الرسمية من Supabase لحجم القطعة 6MB)، بينما الأصغر تُرفع مباشرة بطلب واحد أسرع.
export const RESUMABLE_UPLOAD_THRESHOLD = 6 * 1024 * 1024;
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

export interface UploadController {
  /** إلغاء نهائي — لا يمكن استئناف الرفع بعده */
  cancel: () => void;
  /** إيقاف مؤقت — يحتفظ بالتقدّم لاستئنافه لاحقاً (بلا تأثير على الرفع البسيط السريع) */
  pause: () => void;
  /** استئناف بعد إيقاف مؤقت */
  resume: () => void;
}

export interface UploadHandlers {
  onProgress?: (loaded: number, total: number) => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

/** يحوّل استجابة خطأ خادم التخزين إلى رسالة عربية دقيقة بدل "Upload failed" عامة */
function describeStorageError(status: number, bodyText: string): string {
  const lower = bodyText.toLowerCase();
  if (status === 401) return "انتهت جلسة الدخول أو غير صالحة — يرجى تسجيل الدخول من جديد";
  if (status === 403 || lower.includes("row-level security") || lower.includes("row level security"))
    return "لا تملك صلاحية الرفع لهذا الموقع بحسب سياسات الوصول (RLS) في Supabase";
  if (status === 404 || lower.includes("bucket not found")) return "مساحة التخزين (Bucket) غير موجودة على Supabase";
  if (status === 409 || lower.includes("already exists") || lower.includes("duplicate"))
    return "يوجد ملف آخر بنفس المسار مسبقاً";
  if (status === 413 || lower.includes("exceeded") || lower.includes("too large") || lower.includes("payload"))
    return "حجم الملف أكبر من الحد الأقصى المسموح به في إعدادات مشروع Supabase";
  if (lower.includes("invalid key")) return "اسم الملف يحتوي رموزاً غير مدعومة في مسار التخزين";
  if (lower.includes("mime") || lower.includes("content-type")) return "نوع الملف غير مسموح به في إعدادات هذا الـ Bucket";
  if (status === 0) return "انقطع الاتصال بالشبكة أثناء الرفع، أو انتهت مهلة الاتصال";
  return `فشل الرفع (خطأ ${status})${bodyText ? `: ${bodyText.slice(0, 200)}` : ""}`;
}

/**
 * رفع مباشر بطلب واحد (multipart/form-data مطابق تماماً لما ترسله storage-js من
 * المتصفح) عبر XHR بدل fetch — للحصول على حدث تقدّم حقيقي (storage-js لا توفره).
 * مناسب للملفات الصغيرة التي لا تستفيد من الاستئناف القابل للتجزئة.
 */
function uploadSmallFile(supabase: SupabaseClient, bucket: string, path: string, file: File, handlers: UploadHandlers): UploadController {
  const xhr = new XMLHttpRequest();

  (async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      handlers.onError?.("لا توجد جلسة دخول صالحة — يرجى تسجيل الدخول من جديد");
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", file);

    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("x-upsert", "false");
    // لا نضبط Content-Type يدوياً — يضبطه المتصفح تلقائياً بالـ boundary الصحيح لـ multipart

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) handlers.onProgress?.(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) handlers.onSuccess?.();
      else handlers.onError?.(describeStorageError(xhr.status, xhr.responseText ?? ""));
    };
    xhr.onerror = () => handlers.onError?.(describeStorageError(0, ""));
    xhr.onabort = () => handlers.onError?.("تم إلغاء الرفع");
    xhr.send(form);
  })();

  return {
    cancel: () => xhr.abort(),
    // الرفع المباشر بطلب واحد لا يدعم إيقافاً مؤقتاً حقيقياً (لا تجزئة) — الإلغاء فقط متاح
    pause: () => xhr.abort(),
    resume: () => {},
  };
}

/**
 * رفع قابل للاستئناف عبر بروتوكول TUS (مدعوم من Supabase Storage مباشرة) — يحتفظ
 * بموضع الرفع محلياً (localStorage عبر tus-js-client) فينجو من انقطاع الاتصال أو
 * الإيقاف المؤقت دون إعادة الرفع من الصفر.
 */
function uploadLargeFile(supabase: SupabaseClient, bucket: string, path: string, file: File, handlers: UploadHandlers): UploadController {
  let upload: tus.Upload | null = null;
  let cancelled = false;

  (async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      handlers.onError?.("لا توجد جلسة دخول صالحة — يرجى تسجيل الدخول من جديد");
      return;
    }
    if (cancelled) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: TUS_CHUNK_SIZE,
      removeFingerprintOnSuccess: true,
      uploadDataDuringCreation: true,
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        "x-upsert": "false",
      },
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        // أخطاء الشبكة أثناء TUS قابلة لإعادة المحاولة تلقائياً عبر retryDelays أعلاه؛
        // لو وصلنا هنا فالمحاولات استُنفدت فعلاً.
        handlers.onError?.(message.toLowerCase().includes("network") ? "انقطع الاتصال بالشبكة أثناء الرفع بعد عدة محاولات" : message);
      },
      onProgress: (bytesUploaded, bytesTotal) => handlers.onProgress?.(bytesUploaded, bytesTotal),
      onSuccess: () => handlers.onSuccess?.(),
    });

    const previousUploads = await upload.findPreviousUploads();
    if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
    if (!cancelled) upload.start();
  })();

  return {
    cancel: () => {
      cancelled = true;
      upload?.abort(true);
    },
    pause: () => upload?.abort(false),
    resume: () => upload?.start(),
  };
}

/** يختار استراتيجية الرفع المناسبة تلقائياً بحسب حجم الملف */
export function uploadFile(supabase: SupabaseClient, bucket: string, path: string, file: File, handlers: UploadHandlers): UploadController {
  return file.size > RESUMABLE_UPLOAD_THRESHOLD
    ? uploadLargeFile(supabase, bucket, path, file, handlers)
    : uploadSmallFile(supabase, bucket, path, file, handlers);
}

/** توافقية مع الاستدعاءات القديمة (نسبة مئوية فقط) — يُستحسن الانتقال إلى uploadFile */
export async function uploadFileWithProgress(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ error: string | null }> {
  return new Promise((resolve) => {
    uploadFile(supabase, bucket, path, file, {
      onProgress: (loaded, total) => onProgress?.(Math.round((loaded / total) * 100)),
      onSuccess: () => resolve({ error: null }),
      onError: (message) => resolve({ error: message }),
    });
  });
}

export interface VideoMetadata {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  thumbnailBlob: Blob | null;
}

/**
 * يستخرج مدة/أبعاد الفيديو ولقطة مصغّرة حقيقية (وليست Placeholder) عبر تحميل
 * الملف محلياً في عنصر <video> مخفي والتقاط إطار منه على <canvas> — بلا أي
 * اعتمادية خادمية (ffmpeg أو خلافه) لأنها غير متاحة في هذا التطبيق.
 */
export function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;

    const empty: VideoMetadata = { durationSeconds: null, width: null, height: null, thumbnailBlob: null };
    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      const durationSeconds = Number.isFinite(video.duration) ? video.duration : null;
      // نلتقط إطاراً من الثانية الأولى (أو منتصف الفيديو إن كان أقصر) بدل الإطار صفر
      // غالباً الأسود في كثير من الفيديوهات.
      video.currentTime = Math.min(1, (durationSeconds ?? 2) / 2);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          resolve({ durationSeconds: video.duration || null, width: video.videoWidth || null, height: video.videoHeight || null, thumbnailBlob: null });
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve({ durationSeconds: video.duration || null, width: video.videoWidth || null, height: video.videoHeight || null, thumbnailBlob: blob });
          },
          "image/jpeg",
          0.75
        );
      } catch {
        cleanup();
        resolve(empty);
      }
    };
    video.onerror = () => {
      cleanup();
      resolve(empty);
    };
  });
}
