// تحليل خفيف جداً لـ User-Agent (بلا مكتبة خارجية) لاستخراج نوع الجهاز
// والمتصفح فقط — كافٍ لعرضهما داخل تحليلات نشاط العميل، بلا حاجة لدقة
// كاملة (رقم الإصدار، نظام التشغيل الدقيق...).
export function parseUserAgent(ua: string | null | undefined): { device: string; browser: string } {
  if (!ua) return { device: "غير معروف", browser: "غير معروف" };

  let device = "حاسوب";
  if (/ipad|tablet/i.test(ua)) device = "جهاز لوحي";
  else if (/mobi|iphone|android/i.test(ua)) device = "جوال";

  let browser = "غير معروف";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";

  return { device, browser };
}

export function firstForwardedIp(header: string | null | undefined): string | null {
  if (!header) return null;
  const first = header.split(",")[0]?.trim();
  return first || null;
}
