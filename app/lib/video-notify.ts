// رسالة "تم رفع الفيديو" الجاهزة للعميل — نص عادي فقط (بلا تنسيق HTML)، يجمع اسم
// المشروع والحلقة ورابط مشاهدة مباشر في بوابة العميل، ليُنسخ أو يُرسل عبر واتساب.
// ملف صالح للاستخدام من مكوّنات "use client" (بخلاف app/lib/server/invitation-tracking.ts
// الذي يستورد crypto فلا يصلح للمتصفح) — لذلك تطبيع رقم الجوال مكرَّر هنا بنسخة بسيطة.

export interface VideoUploadedMessageParams {
  clientName: string | null;
  companyName: string;
  projectName: string;
  episodeTitle: string;
  episodeNumber: number | null;
  videoUrl: string;
}

export function buildVideoUploadedMessage(params: VideoUploadedMessageParams): string {
  const { clientName, companyName, projectName, episodeTitle, episodeNumber, videoUrl } = params;
  const greeting = clientName ? `مرحباً ${clientName}،` : "مرحباً،";
  const episodeLabel = episodeNumber != null ? `الحلقة ${episodeNumber} — ${episodeTitle}` : episodeTitle;
  return [
    greeting,
    `تم رفع فيديو "${episodeLabel}" من مشروع "${projectName}"، وهو الآن بانتظار مراجعتك واعتمادك.`,
    ``,
    `يمكنك مشاهدة الفيديو مباشرة من هنا:`,
    videoUrl,
    ``,
    `فريق ${companyName}`,
  ].join("\n");
}

// نفس تطبيع toWhatsappDigits في app/lib/server/invitation-tracking.ts (افتراض عملي
// لصيغة سعودية محلية 05xxxxxxxx)، بنسخة لا تستورد أي وحدة Node فتصلح لمكوّنات المتصفح.
export function toWhatsappDigitsClient(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `966${digits.slice(1)}`;
  return digits;
}

export function buildWhatsappLink(phone: string, message: string): string {
  return `https://wa.me/${toWhatsappDigitsClient(phone)}?text=${encodeURIComponent(message)}`;
}
