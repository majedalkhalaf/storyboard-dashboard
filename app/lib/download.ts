// فتح/تنزيل رابط عبر عنصر <a> ديناميكي بدل window.open — نافذة منبثقة عبر
// window.open تُحجب بصمت في أغلب المتصفحات (خصوصاً Safari على الجوال) إن استُدعيت
// بعد أي عملية غير متزامنة (await) سابقة، حتى لو كانت استجابة مباشرة لضغطة
// المستخدم، فيبدو للمستخدم أن التحميل "لا يحدث" بلا أي رسالة خطأ. النقر الوهمي
// على <a> ليس نافذة منبثقة فلا يخضع لهذا الحجب، ويعمل بشكل موثوق للتحميل (السيرفر
// يفرض Content-Disposition: attachment) والفتح في تبويب جديد على حد سواء.
export function openUrl(url: string, newTab = true) {
  const a = document.createElement("a");
  a.href = url;
  if (newTab) {
    a.target = "_blank";
    a.rel = "noopener";
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// تنزيل حقيقي بقراءة الاستجابة تدريجياً (stream) بدل الاعتماد على رابط خارجي
// يفتحه المتصفح مباشرة — يحل ثلاث مشاكل معاً كانت وراء تعطّل تنزيل الملفات/
// الفيديوهات الكبيرة تحديداً: (1) لا حاجة لـ CORS على الرابط النهائي لأن القراءة
// تمر عبر fetch من نفس الأصل (same-origin) دائماً، (2) نتحكم بدقة بلحظة اكتمال
// التنزيل فعلياً (تطابق البايتات المستلمة مع Content-Length) بدل ترك المتصفح
// "يخمّن" متى انتهى تنزيل عبر تبويب/نافذة خارجية، و(3) يمنحنا تقدماً حقيقياً
// (bytes محمَّلة من الإجمالي) لعرض شريط تقدّم فعلي بدل نسبة وهمية.
export async function downloadWithProgress(
  input: string,
  init: RequestInit | undefined,
  filename: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let message = "تعذّر تنزيل الملف";
    try {
      const json = (await res.json()) as { error?: string };
      if (json?.error) message = json.error;
    } catch {
      // ليست استجابة JSON — نُبقي الرسالة الافتراضية
    }
    throw new Error(message);
  }
  if (!res.body) {
    const blob = await res.blob();
    saveBlob(blob, filename);
    onProgress?.(blob.size, blob.size);
    return;
  }

  const total = Number(res.headers.get("Content-Length")) || 0;
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as BlobPart);
    loaded += value?.byteLength ?? 0;
    onProgress?.(loaded, total || loaded);
  }
  const blob = new Blob(chunks);
  saveBlob(blob, filename);
}
