import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import { canClient } from "@/app/lib/permissions";
import Icon from "@/app/components/ui/Icon";
import ClientDashboard, { type ActivityItem, type OtherProjectRow } from "@/app/components/client/ClientDashboard";
import type { Company, CompanyPipelineStage, Episode, Note, Project, ProjectFile } from "@/app/lib/types";

interface ProjectClientRow {
  id: string;
  permissions: import("@/app/lib/types").ClientPermissions;
  project: Project | null;
}

export default async function ClientDashboardPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_clients")
    .select("id, permissions, project:projects(*)")
    .eq("client_user_id", session.userId)
    .eq("status", "active");

  const rows = ((data ?? []) as unknown as ProjectClientRow[])
    .filter((r) => r.project && !r.project.archived)
    .sort((a, b) => (b.project!.updated_at || "").localeCompare(a.project!.updated_at || ""));

  const firstName = (session.profile.full_name || "").split(" ")[0] || session.profile.full_name || "";

  if (rows.length === 0) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 className="page-title-size" style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
            مرحباً {firstName} 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            نعمل على مشروعك بكل اهتمام — هدفنا أن تحصل على أفضل نتيجة ممكنة.
          </p>
        </div>
        <div className="card empty-state">
          <Icon name="projects" size={40} className="nav-icon" />
          <p style={{ marginTop: 12, fontSize: 15 }}>لا توجد مشاريع مرتبطة بحسابك حالياً.</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            سيظهر مشروعك هنا فور ربطه بحسابك من قبل فريق الإنتاج.
          </p>
        </div>
      </div>
    );
  }

  const primary = rows[0];
  const project = primary.project as Project;
  const permissions = primary.permissions;

  const { data: companyData } = await supabase.from("companies").select("*").eq("id", project.company_id).maybeSingle();
  const company = (companyData ?? null) as Company | null;

  let episodes: Episode[] = [];
  let pipelineStages: CompanyPipelineStage[] = [];
  if (canClient(permissions, "episodes")) {
    const [{ data: eps }, { data: stages }] = await Promise.all([
      supabase.from("episodes").select("*").eq("project_id", project.id).order("sort_order", { ascending: true }),
      supabase.from("company_pipeline_stages").select("*").eq("company_id", project.company_id).order("sort_order", { ascending: true }),
    ]);
    episodes = (eps ?? []) as Episode[];
    pipelineStages = (stages ?? []) as CompanyPipelineStage[];
  }

  const episodesTotal = episodes.length;
  const episodesCompleted = episodes.filter((e) => e.status === "delivered" || e.status === "approved").length;

  // المرحلة الحالية = أبكر مرحلة لم تُسلَّم/تُعتمد بعد بين حلقات المشروع (أين "تعلّقت"
  // معظم الحلقات فعلياً) — إن اكتملت كل الحلقات فالمرحلة الأخيرة في القائمة.
  let currentStageKey: string | null = null;
  if (pipelineStages.length > 0 && episodes.length > 0) {
    const order = new Map(pipelineStages.map((s, i) => [s.key, i]));
    const pending = episodes.filter((e) => e.status !== "delivered" && e.status !== "approved");
    const source = pending.length > 0 ? pending : episodes;
    let minIndex = Infinity;
    let key = pipelineStages[0].key;
    for (const e of source) {
      const idx = order.get(e.pipeline_stage) ?? 0;
      if (idx < minIndex) {
        minIndex = idx;
        key = e.pipeline_stage;
      }
    }
    currentStageKey = key;
  }

  let recentFiles: ProjectFile[] = [];
  if (canClient(permissions, "files")) {
    const { data: fileRows } = await supabase
      .from("files")
      .select("*")
      .eq("project_id", project.id)
      .eq("client_visible", true)
      .order("created_at", { ascending: false })
      .limit(4);
    recentFiles = (fileRows ?? []) as ProjectFile[];
  }

  const { data: noteRows } = await supabase
    .from("notes")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const allNotes = (noteRows ?? []) as Note[];
  const openNotesCount = allNotes.filter((n) => n.status !== "done" && n.status !== "closed" && n.status !== "rejected").length;
  const recentNotes = allNotes.slice(0, 4);

  let nextInvoice: { amount: number; due_date: string | null } | null = null;
  if (canClient(permissions, "invoices")) {
    const { data: invoiceRows } = await supabase
      .from("invoices")
      .select("amount, tax, due_date, status")
      .eq("project_id", project.id)
      .in("status", ["unpaid", "overdue"])
      .order("due_date", { ascending: true })
      .limit(1);
    const inv = invoiceRows?.[0];
    if (inv) nextInvoice = { amount: (inv.amount || 0) + (inv.tax || 0), due_date: inv.due_date };
  }

  // نشاطات آمنة للعميل — تُبنى من بيانات يملك أصلاً صلاحية رؤيتها (ملفات/ملاحظات/حلقات)
  // بدل جدول activity_logs الداخلي (لا سياسة RLS تسمح للعميل بقراءته أصلاً).
  const activity: ActivityItem[] = [
    ...recentFiles.map((f) => ({
      id: `file-${f.id}`,
      kind: "file" as const,
      title: "تم رفع ملف جديد",
      subtitle: f.name,
      icon: "fileUp" as const,
      color: "#3987e5",
      at: f.created_at,
    })),
    ...allNotes.slice(0, 6).map((n) => ({
      id: `note-${n.id}`,
      kind: "note" as const,
      title: "تعليق جديد من فريق العمل",
      subtitle: n.body,
      icon: "message" as const,
      color: "#F59E0B",
      at: n.created_at,
    })),
    ...episodes
      .filter((e) => e.status === "delivered" || e.status === "approved")
      .slice(0, 4)
      .map((e) => ({
        id: `episode-${e.id}`,
        kind: "episode" as const,
        title: e.status === "delivered" ? "تم تسليم حلقة" : "تم اعتماد حلقة",
        subtitle: e.title,
        icon: "checkCircle" as const,
        color: "var(--success)",
        at: e.updated_at,
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const otherProjects: OtherProjectRow[] = rows.slice(1).map((r) => ({
    id: r.project!.id,
    name: r.project!.name,
    status: r.project!.status,
    progress: r.project!.progress,
  }));

  return (
    <ClientDashboard
      firstName={firstName}
      project={project}
      company={company}
      progress={project.progress}
      episodesTotal={episodesTotal}
      episodesCompleted={episodesCompleted}
      openNotesCount={openNotesCount}
      nextInvoice={nextInvoice}
      pipelineStages={pipelineStages}
      currentStageKey={currentStageKey}
      recentFiles={recentFiles}
      recentNotes={recentNotes}
      activity={activity}
      otherProjects={otherProjects}
    />
  );
}
