import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getActiveWhatsappConfig, sendWhatsappMessage } from "@/app/lib/server/whatsapp";
import { toWhatsappDigits } from "@/app/lib/server/invitation-tracking";

// إشعار عميل عبر واتساب بوجود إعلان جديد له — بنفس منطق قناة واتساب في تدفّق
// دعوة العميل: إرسال تلقائي حقيقي عبر Meta WhatsApp Cloud API إن كانت الشركة قد
// أعدّته وفعّلته، وإلا رابط wa.me جاهز يفتحه عضو الفريق يدوياً لإكمال الإرسال.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
    if (!profile?.company_id) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const { announcementId } = (await request.json()) as { announcementId?: string };
    if (!announcementId) return NextResponse.json({ error: "معرّف الإعلان مفقود" }, { status: 400 });

    const admin = createAdminClient();
    const { data: announcement } = await admin
      .from("client_announcements")
      .select("id, company_id, title, client_user_id, client_id")
      .eq("id", announcementId)
      .eq("company_id", profile.company_id)
      .maybeSingle();
    if (!announcement) return NextResponse.json({ error: "لم يتم العثور على الإعلان" }, { status: 404 });

    const [{ data: clientProfile }, { data: companyRow }, { data: clientRow }] = await Promise.all([
      admin.from("profiles").select("phone").eq("id", announcement.client_user_id).maybeSingle(),
      admin.from("companies").select("name").eq("id", announcement.company_id).maybeSingle(),
      announcement.client_id ? admin.from("clients").select("phone").eq("id", announcement.client_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const phone = clientProfile?.phone || clientRow?.phone || null;
    const message = `لديك إعلان جديد من ${companyRow?.name || "فريق العمل"}: ${announcement.title || "إعلان جديد"}\nادخل إلى بوابة العميل للاطلاع عليه.`;

    if (!phone) {
      return NextResponse.json({ sentAutomatically: false, whatsappLink: null });
    }

    const digits = toWhatsappDigits(phone);
    const whatsappLink = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

    let sentAutomatically = false;
    const waConfig = await getActiveWhatsappConfig(announcement.company_id);
    if (waConfig) {
      const result = await sendWhatsappMessage(waConfig, digits, message);
      sentAutomatically = result.success;
    }

    return NextResponse.json({ sentAutomatically, whatsappLink });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "خطأ غير متوقع" }, { status: 500 });
  }
}
