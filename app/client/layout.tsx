import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import SessionProvider from "@/app/providers/SessionProvider";
import ClientShell, { type ActivityRailItem, type ProjectManagerInfo } from "@/app/components/client/ClientShell";
import { requireClient } from "@/app/components/client/guards";
import { canClient } from "@/app/lib/permissions";
import { projectHashtag } from "@/app/components/client/utils";
import type { ClientPermissions, Episode, Note, ProjectFile } from "@/app/lib/types";

interface ActiveProjectInfo {
  id: string;
  name: string;
  company_id: string;
  created_by: string | null;
  updated_at: string;
}

interface ActiveProjectRow {
  permissions: ClientPermissions;
  project: ActiveProjectInfo | ActiveProjectInfo[] | null;
}

// تخطيط بوابة العميل. لا نفرض تغيير كلمة المرور هنا (كي تبقى صفحة
// change-password قابلة للوصول)، بل تفرضه كل صفحة محمية على حدة عبر requireClient().
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClient({ enforcePassword: false });

  const supabase = await createClient();
  const [{ data: settings }, { data: activeProjects }] = await Promise.all([
    supabase.from("user_settings").select("theme").eq("user_id", session.userId).maybeSingle(),
    supabase
      .from("project_clients")
      .select("permissions, project:projects(id, name, company_id, created_by, updated_at)")
      .eq("client_user_id", session.userId)
      .eq("status", "active"),
  ]);

  const rows = ((activeProjects ?? []) as unknown as ActiveProjectRow[])
    .map((r) => ({ permissions: r.permissions, project: Array.isArray(r.project) ? (r.project[0] ?? null) : r.project }))
    .filter((r): r is { permissions: ClientPermissions; project: ActiveProjectInfo } => Boolean(r.project))
    .sort((a, b) => (b.project.updated_at || "").localeCompare(a.project.updated_at || ""));

  // شعار/اسم الشركة يظهر بأعلى القائمة الجانبية فقط إن كان العميل مرتبطاً بشركة
  // واحدة حالياً — عميل يتابع مشاريع من أكثر من شركة يبقى على الهوية العامة
  // المحايدة هنا، وتظهر هوية كل شركة داخل صفحات مشاريعها هي تحديداً (BrandingInjector).
  const companyIds = new Set(rows.map((r) => r.project!.company_id));
  let brandCompany: { name: string; logo_url: string | null } | null = null;
  let supportCompany: { name: string; phone: string | null; email: string | null } | null = null;
  let projectManager: ProjectManagerInfo | null = null;
  if (companyIds.size === 1) {
    const [companyId] = companyIds;
    const { data: company } = await supabase.from("companies").select("name, logo_url, phone, email").eq("id", companyId).maybeSingle();
    if (company) {
      brandCompany = { name: company.name, logo_url: company.logo_url };
      supportCompany = { name: company.name, phone: company.phone, email: company.email };
    }

    // "مدير المشروع" — لا يوجد حقل مسؤول معيّن في مخطط المشاريع حالياً، فأقرب
    // بيانات حقيقية موثوقة هي مُنشئ أحدث مشروع نشط (created_by)، تُجلب عبر
    // عميل الخدمة لأن العميل لا يملك صلاحية RLS لقراءة ملفات الفريق الداخلي.
    const creatorId = rows[0]?.project?.created_by;
    if (creatorId) {
      const admin = createAdminClient();
      const { data: profile } = await admin.from("profiles").select("full_name, avatar_url, phone, email").eq("id", creatorId).maybeSingle();
      if (profile?.full_name) {
        projectManager = { name: profile.full_name, avatarUrl: profile.avatar_url, phone: profile.phone, email: profile.email };
      }
    }
  }

  // نشاطات مُجمَّعة عبر كل المشاريع النشطة (وليس مشروعاً واحداً فقط) — تُبنى من
  // بيانات يملك العميل أصلاً صلاحية رؤيتها (ملفات/ملاحظات/حلقات مُسلَّمة)، بحدٍّ
  // أقصى لعدد المشاريع المفحوصة تفادياً لبطء التنقّل بين صفحات البوابة.
  const scannedProjects = rows.slice(0, 5);
  const activityLists = await Promise.all(
    scannedProjects.map(async ({ permissions, project }) => {
      const items: ActivityRailItem[] = [];

      const hashtag = projectHashtag(project.name);

      async function loadFiles() {
        if (!canClient(permissions, "files")) return;
        const { data } = await supabase
          .from("files")
          .select("id, name, created_at")
          .eq("project_id", project.id)
          .eq("client_visible", true)
          .order("created_at", { ascending: false })
          .limit(3);
        for (const f of (data ?? []) as Pick<ProjectFile, "id" | "name" | "created_at">[]) {
          items.push({ id: `file-${f.id}`, title: `${hashtag} – تم رفع ملف جديد`, subtitle: f.name, icon: "fileUp", color: "#3987e5", at: f.created_at, projectId: project.id });
        }
      }

      async function loadNotes() {
        const { data } = await supabase.from("notes").select("id, body, created_at").eq("project_id", project.id).order("created_at", { ascending: false }).limit(3);
        for (const n of (data ?? []) as Pick<Note, "id" | "body" | "created_at">[]) {
          items.push({ id: `note-${n.id}`, title: `${hashtag} – تعليق جديد من فريق العمل`, subtitle: n.body, icon: "message", color: "#F59E0B", at: n.created_at, projectId: project.id });
        }
      }

      async function loadEpisodes() {
        if (!canClient(permissions, "episodes")) return;
        const { data } = await supabase
          .from("episodes")
          .select("id, title, status, updated_at")
          .eq("project_id", project.id)
          .in("status", ["delivered", "approved"])
          .order("updated_at", { ascending: false })
          .limit(2);
        for (const e of (data ?? []) as Pick<Episode, "id" | "title" | "status" | "updated_at">[]) {
          items.push({
            id: `episode-${e.id}`,
            title: `${hashtag} – ${e.status === "delivered" ? "تم تسليم حلقة" : "تم اعتماد حلقة"}`,
            subtitle: e.title,
            icon: "checkCircle",
            color: "var(--success)",
            at: e.updated_at,
            projectId: project.id,
            episodeId: e.id,
          });
        }
      }

      await Promise.all([loadFiles(), loadNotes(), loadEpisodes()]);
      return items;
    })
  );

  const activity = activityLists
    .flat()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  return (
    <SessionProvider
      userId={session.userId}
      email={session.email}
      profile={session.profile}
      company={null}
      initialTheme={settings?.theme ?? "dark"}
    >
      <ClientShell brandCompany={brandCompany} activity={activity} projectManager={projectManager} supportCompany={supportCompany}>
        {children}
      </ClientShell>
    </SessionProvider>
  );
}
