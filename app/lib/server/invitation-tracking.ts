import { randomBytes } from "crypto";
import { createAdminClient } from "@/app/lib/supabase/admin";

export function generateInvitationToken(): string {
  return randomBytes(24).toString("hex");
}

// كلمة مرور مؤقتة قابلة للقراءة (بلا أحرف/أرقام متشابهة 0/O، 1/l/I).
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[bytes[i] % chars.length];
  return out;
}

// لا تكامل واتساب بزنس API حقيقياً بلا بيانات اعتماد حقيقية — التطبيع أدناه افتراض
// عملي فقط (يستهدف صيغة سعودية محلية 05xxxxxxxx)، وليس معياراً دولياً كاملاً.
export function toWhatsappDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `966${digits.slice(1)}`;
  return digits;
}

// تحليل بسيط وصادق لسلسلة User-Agent — ليس مكتبة كشف أجهزة كاملة (لا نملك واحدة)،
// فقط تمييز تقريبي شائع الاستخدام لعرضه في سجل الدعوات (الجهاز/المتصفح).
export function parseUserAgent(userAgent: string | null): { device: string; browser: string } {
  if (!userAgent) return { device: "غير معروف", browser: "غير معروف" };
  const ua = userAgent.toLowerCase();

  let device = "سطح المكتب";
  if (/iphone/.test(ua)) device = "iPhone";
  else if (/ipad/.test(ua)) device = "iPad";
  else if (/android/.test(ua)) device = /mobile/.test(ua) ? "Android (جوال)" : "Android (جهاز لوحي)";
  else if (/macintosh/.test(ua)) device = "Mac";
  else if (/windows/.test(ua)) device = "Windows";
  else if (/linux/.test(ua)) device = "Linux";

  let browser = "غير معروف";
  if (/edg\//.test(ua)) browser = "Edge";
  else if (/chrome\//.test(ua) && !/chromium/.test(ua)) browser = "Chrome";
  else if (/crios\//.test(ua)) browser = "Chrome (iOS)";
  else if (/firefox\//.test(ua)) browser = "Firefox";
  else if (/safari\//.test(ua) && !/chrome/.test(ua)) browser = "Safari";

  return { device, browser };
}

export function extractRequestIp(request: Request): string | null {
  const headers = request.headers;
  return headers.get("x-nf-client-connection-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_INVITES = 20;

// تحديد معدل حقيقي (وليس شكلياً) — استعلام فعلي عن عدد الدعوات التي أنشأتها هذه
// الشركة خلال النافذة الزمنية، بلا أي بنية طابور/تخزين خارجي إضافي.
export async function checkInvitationRateLimit(companyId: string): Promise<{ allowed: boolean; count: number }> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60000).toISOString();
  const { count } = await admin
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", since);
  const total = count ?? 0;
  return { allowed: total < RATE_LIMIT_MAX_INVITES, count: total };
}

export { RATE_LIMIT_WINDOW_MINUTES, RATE_LIMIT_MAX_INVITES };
