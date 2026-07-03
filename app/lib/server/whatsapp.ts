import { createAdminClient } from "@/app/lib/supabase/admin";

// إرسال واتساب حقيقي عبر Meta WhatsApp Cloud API (المزوّد الرسمي الوحيد المدعوم هنا) —
// يتطلب أن تكون الشركة قد أدخلت phone_number_id وaccess_token حقيقيين من حساب
// Meta Business خاص بها (إعدادات > قنوات إرسال الدعوات). بلا هذه البيانات، يبقى
// النظام يعتمد على رابط wa.me اليدوي (انظر توليد whatsappLink في مسار الإرسال) —
// هذا الملف لا يُستورد أبداً في أي مكوّن "use client" لأنه يحوي منطق access_token.

export interface WhatsappConfig {
  id: string;
  phone_number_id: string;
  access_token: string;
  business_phone_display: string | null;
}

export async function getActiveWhatsappConfig(companyId: string): Promise<WhatsappConfig | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("company_whatsapp_config")
    .select("id, phone_number_id, access_token, business_phone_display")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .maybeSingle();
  return (data as WhatsappConfig | null) ?? null;
}

export interface WhatsappSendResult {
  success: boolean;
  error?: string;
}

// يرسل رسالة نصية عبر Graph API الرسمي لـ Meta. `to` يجب أن يكون بصيغة دولية
// بلا علامة + (أرقام فقط) — نفس تطبيع toWhatsappDigits المستخدم في رابط wa.me.
export async function sendWhatsappMessage(config: WhatsappConfig, to: string, text: string): Promise<WhatsappSendResult> {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const apiError = json?.error?.message || `فشل الاتصال بواتساب بزنس API (رمز الحالة ${res.status})`;
      return { success: false, error: apiError };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "خطأ اتصال غير معروف بواتساب بزنس API" };
  }
}
