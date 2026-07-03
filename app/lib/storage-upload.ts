import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * رفع مباشر عبر REST API الخاص بتخزين Supabase باستخدام XHR بدل مكتبة storage-js —
 * السبب الوحيد: storage-js (v2) تستخدم fetch داخلياً وليس لديها أي دعم لحدث تقدّم الرفع
 * (upload progress)، بينما XHR يوفّر xhr.upload.onprogress فعلياً. المصادقة تتم بنفس
 * الطريقة تماماً (Authorization: Bearer <access_token> + apikey)، لذا تبقى سياسات RLS
 * لمجلد الشركة سارية كالمعتاد.
 */
export async function uploadFileWithProgress(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { error: "لا توجد جلسة دخول صالحة" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve({ error: null });
      else resolve({ error: `فشل الرفع (${xhr.status})` });
    };
    xhr.onerror = () => resolve({ error: "فشل الاتصال أثناء الرفع" });
    xhr.send(file);
  });
}
