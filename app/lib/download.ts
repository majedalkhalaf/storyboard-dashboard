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

// حدّ حجم آمن قبل تفضيل تنزيل مباشر (بلا تجميع بايتات في الذاكرة) على الجوال —
// متصفحات الجوال (خصوصاً Safari على iOS) لديها سقف ذاكرة أشد صرامة بكثير من
// الحاسوب لكل تبويب؛ تجميع فيديو كبير جداً كـ Blob واحد في الذاكرة قبل حفظه قد
// يُعطّل التبويب أو يفشل بصمت. 60 ميجابايت حدّ متحفّظ يغطي أغلب الصور/المستندات
// بأمان عبر المسار العادي، ويحوّل الفيديوهات الكبيرة فعلياً لتنزيل مباشر أكثر
// موثوقية على الجوال.
const MOBILE_SAFE_BUFFER_LIMIT = 60 * 1024 * 1024;

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mobi|iphone|android|ipad|tablet/i.test(navigator.userAgent);
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

// تنزيل حقيقي بقراءة الاستجابة تدريجياً (stream) بدل ترك المتصفح "يخمّن" متى
// انتهى التنزيل عبر تبويب/نافذة خارجية — يمنحنا تحكماً دقيقاً بلحظة الاكتمال
// الفعلية وتقدماً حقيقياً (bytes محمَّلة من الإجمالي) لعرض شريط تقدّم فعلي.
//
// بعض المسارات (تنزيل بوابة العميل، وتنزيل R2 لفريق العمل) لا تبثّ محتوى الملف
// بنفسها — بل تُعيد رابط الملف الفعلي (مباشرة من Cloudflare R2 أو Supabase
// Storage) كاستجابة JSON `{ url }`. هذا مقصود: بثّ ملفات فيديو كبيرة عبر خادمنا
// (دالة سحابية على Netlify) كان يُنتج أحياناً ملفاً مبتوراً — يعمل لأول دقيقة أو
// دقيقتين فقط ثم يتوقف رغم ظهور مدة الفيديو الصحيحة في الملف — لأن نقل ملف كبير
// جداً عبر اتصال بطيء قد يتجاوز مهلة تنفيذ الدالة السحابية، فتُنهي المنصة الاتصال
// منتصف البث بصمت. تنزيل الملف مباشرة من مصدره (R2/Supabase، بلا حد زمني على
// النقل) يزيل هذا الخطر جذرياً مع الحفاظ الكامل على تقدّم التنزيل الحقيقي.
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

  if ((res.headers.get("content-type") || "").includes("application/json")) {
    const { url } = (await res.json()) as { url?: string };
    if (!url) throw new Error("تعذّر تنزيل الملف");
    const fileRes = await fetch(url);
    if (!fileRes.ok) throw new Error("تعذّر تنزيل الملف");

    const total = Number(fileRes.headers.get("Content-Length")) || 0;
    if (isMobileDevice() && total > MOBILE_SAFE_BUFFER_LIMIT) {
      // على الجوال، نتجنّب قراءة كل بايتات ملف كبير في الذاكرة — نترك متصفح
      // الجهاز نفسه يتولّى النقل تدريجياً كتنزيل مباشر (كما يحدث لأي رابط تنزيل
      // عادي)، على حساب نسبة تقدّم دقيقة لا يمكن معرفتها بلا قراءة الاستجابة.
      await fileRes.body?.cancel().catch(() => {});
      openUrl(url, false);
      return;
    }

    await streamResponseToFile(fileRes, filename, onProgress);
    return;
  }

  await streamResponseToFile(res, filename, onProgress);
}

async function streamResponseToFile(res: Response, filename: string, onProgress?: (loaded: number, total: number) => void): Promise<void> {
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

/** يجلب الملف كـ Blob مباشرة من رابطه الفعلي (بلا حفظ) — يُستخدم عند بناء أرشيف
 * ZIP بالكامل داخل المتصفح، حيث تحتاج المكتبة البايتات فعلياً لا مجرد تنزيلها.
 * يتبع نفس منطق downloadWithProgress: إن كانت الاستجابة الأولى `{ url }` JSON
 * (رابط الملف الفعلي من R2/Supabase) يُجلب المحتوى منه مباشرة بدل بثّه عبر خادمنا. */
export async function fetchBlobWithRedirect(input: string, init?: RequestInit): Promise<Blob> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(`تعذّر تنزيل الملف (${res.status})`);
  if ((res.headers.get("content-type") || "").includes("application/json")) {
    const { url } = (await res.json()) as { url?: string };
    if (!url) throw new Error("تعذّر تنزيل الملف");
    const fileRes = await fetch(url);
    if (!fileRes.ok) throw new Error(`تعذّر تنزيل الملف (${fileRes.status})`);
    return fileRes.blob();
  }
  return res.blob();
}
