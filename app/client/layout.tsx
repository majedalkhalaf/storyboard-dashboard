import { createClient } from "@/app/lib/supabase/server";
import SessionProvider from "@/app/providers/SessionProvider";
import ClientShell from "@/app/components/client/ClientShell";
import { requireClient } from "@/app/components/client/guards";

// تخطيط بوابة العميل. لا نفرض تغيير كلمة المرور هنا (كي تبقى صفحة
// change-password قابلة للوصول)، بل تفرضه كل صفحة محمية على حدة عبر requireClient().
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClient({ enforcePassword: false });

  const supabase = await createClient();
  const [{ data: settings }, { data: activeProjects }] = await Promise.all([
    supabase.from("user_settings").select("theme").eq("user_id", session.userId).maybeSingle(),
    supabase.from("project_clients").select("project:projects(company_id)").eq("client_user_id", session.userId).eq("status", "active"),
  ]);

  // شعار/اسم الشركة يظهر بأعلى القائمة الجانبية فقط إن كان العميل مرتبطاً بشركة
  // واحدة حالياً — عميل يتابع مشاريع من أكثر من شركة يبقى على الهوية العامة
  // المحايدة هنا، وتظهر هوية كل شركة داخل صفحات مشاريعها هي تحديداً (BrandingInjector).
  type Row = { project: { company_id: string } | { company_id: string }[] | null };
  const companyIds = new Set(
    ((activeProjects ?? []) as Row[])
      .map((r) => (Array.isArray(r.project) ? r.project[0]?.company_id : r.project?.company_id))
      .filter((id): id is string => Boolean(id))
  );
  let brandCompany: { name: string; logo_url: string | null } | null = null;
  if (companyIds.size === 1) {
    const [companyId] = companyIds;
    const { data: company } = await supabase.from("companies").select("name, logo_url").eq("id", companyId).maybeSingle();
    brandCompany = company ?? null;
  }

  return (
    <SessionProvider
      userId={session.userId}
      email={session.email}
      profile={session.profile}
      company={null}
      initialTheme={settings?.theme ?? "dark"}
    >
      <ClientShell brandCompany={brandCompany}>{children}</ClientShell>
    </SessionProvider>
  );
}
