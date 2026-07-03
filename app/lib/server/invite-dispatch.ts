import { getDefaultEmailSender, getEmailSenderById, sendMailViaSender } from "@/app/lib/server/mailer";
import { getActiveWhatsappConfig, sendWhatsappMessage } from "@/app/lib/server/whatsapp";
import { toWhatsappDigits } from "@/app/lib/server/invitation-tracking";

export interface DispatchResult {
  emailSent: boolean;
  emailError: string | null;
  whatsappLink: string | null;
  whatsappSentAutomatically: boolean;
}

// يحاول إرسال رسالة الدعوة/إعادة الإرسال عبر كل قناة متاحة في آنٍ واحد — بريد
// حقيقي إن وُجد مُرسِل مُعدّ، ورابط واتساب جاهز لرقم العميل نفسه دائماً، مع محاولة
// إرسال تلقائي حقيقي إضافية عبر واتساب بزنس API إن كان مُعدّاً وفعّالاً. لا يرمي
// استثناءً أبداً — فشل قناة واحدة لا يوقف البقية، والنتيجة تُعاد صراحة للمستدعي.
export async function dispatchInviteMessage(params: {
  companyId: string;
  toEmail: string;
  subject: string;
  message: string;
  phone?: string | null;
  senderId?: string | null;
}): Promise<DispatchResult> {
  const { companyId, toEmail, subject, message, phone, senderId } = params;

  let emailSent = false;
  let emailError: string | null = null;
  const cleanPhone = phone?.trim() || null;
  const whatsappLink: string | null = cleanPhone ? `https://wa.me/${toWhatsappDigits(cleanPhone)}?text=${encodeURIComponent(message)}` : null;
  let whatsappSentAutomatically = false;

  const sender = senderId ? await getEmailSenderById(companyId, senderId) : await getDefaultEmailSender(companyId);
  if (sender) {
    try {
      await sendMailViaSender(sender, {
        to: toEmail,
        subject,
        html: `<div style="font-family:sans-serif;direction:rtl;text-align:right;white-space:pre-wrap">${message.replace(/\n/g, "<br/>")}</div>`,
        text: message,
      });
      emailSent = true;
    } catch (mailErr) {
      emailError = mailErr instanceof Error ? mailErr.message : "خطأ غير معروف أثناء إرسال البريد";
    }
  }

  if (cleanPhone) {
    const waConfig = await getActiveWhatsappConfig(companyId);
    if (waConfig) {
      const result = await sendWhatsappMessage(waConfig, toWhatsappDigits(cleanPhone), message);
      whatsappSentAutomatically = result.success;
    }
  }

  return { emailSent, emailError, whatsappLink, whatsappSentAutomatically };
}
