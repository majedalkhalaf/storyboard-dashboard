import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import AnnouncementsManager, { type ClientAccountOption, type AnnouncementRow } from "@/app/components/announcements/AnnouncementsManager";

// قسم "إعلان للعميل" — مستقل تماماً عن المشروع والحلقة، حسب طلب صريح. يختار
// الفريق عميلاً محدداً (من حسابات دخول العملاء الفعلية، لا من سجلات CRM وحدها،
// لأن الظهور في الصفحة الرئيسية للعميل يعتمد على حساب دخول حقيقي) ويرسل له
// إعلاناً يظهر كبطاقة خاصة هناك، مع إمكانية مشاركته مباشرة عبر واتساب.
export default async function AnnouncementsPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: pcRows }, { data: announcementRows }] = await Promise.all([
    supabase
      .from("project_clients")
      .select("client_user_id, client_id, profile:profiles!project_clients_client_user_id_fkey(full_name, email, phone), client:clients(name, phone)")
      .eq("company_id", companyId)
      .eq("status", "active")
      .not("client_user_id", "is", null),
    supabase
      .from("client_announcements")
      .select("*, profile:profiles!client_user_id(full_name, email), client:clients(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ]);

  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

  const seen = new Set<string>();
  const clientAccounts: ClientAccountOption[] = [];
  for (const r of (pcRows ?? []) as Record<string, unknown>[]) {
    const userId = r.client_user_id as string;
    if (seen.has(userId)) continue;
    seen.add(userId);
    const profile = one<{ full_name: string | null; email: string | null; phone: string | null }>(r.profile as never);
    const client = one<{ name: string | null; phone: string | null }>(r.client as never);
    clientAccounts.push({
      clientUserId: userId,
      clientId: (r.client_id as string) ?? null,
      name: profile?.full_name || client?.name || "بدون اسم",
      email: profile?.email ?? null,
      phone: profile?.phone || client?.phone || null,
    });
  }
  clientAccounts.sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const announcements: AnnouncementRow[] = ((announcementRows ?? []) as Record<string, unknown>[]).map((a) => {
    const profile = one<{ full_name: string | null; email: string | null }>(a.profile as never);
    const client = one<{ name: string | null }>(a.client as never);
    return {
      id: a.id as string,
      company_id: a.company_id as string,
      client_user_id: a.client_user_id as string,
      client_id: (a.client_id as string) ?? null,
      title: (a.title as string) ?? null,
      media: a.media as AnnouncementRow["media"],
      duration_days: (a.duration_days as number) ?? null,
      expires_at: (a.expires_at as string) ?? null,
      cta_label: (a.cta_label as string) || "عرض",
      created_at: a.created_at as string,
      updated_at: a.updated_at as string,
      clientName: profile?.full_name || client?.name || "عميل",
    };
  });

  return <AnnouncementsManager companyId={companyId} clientAccounts={clientAccounts} initialAnnouncements={announcements} />;
}
