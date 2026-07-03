import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import ProjectView from "@/app/components/client/ProjectView";
import BrandingInjector from "@/app/components/client/BrandingInjector";
import { currentPipelineStageKey } from "@/app/components/client/pipeline";
import Icon from "@/app/components/ui/Icon";
import { canClient } from "@/app/lib/permissions";
import type { Company, CompanyPipelineStage, Episode, Invoice, Note, Payment, Project, ProjectClient, ProjectFile } from "@/app/lib/types";

export default async function ClientProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireClient();
  const supabase = await createClient();

  const { data: pc } = await supabase
    .from("project_clients")
    .select("*")
    .eq("project_id", id)
    .eq("client_user_id", session.userId)
    .eq("status", "active")
    .maybeSingle();

  if (!pc) return <Unauthorized />;

  const projectClient = pc as ProjectClient;
  const permissions = projectClient.permissions;

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (!project) return <Unauthorized />;
  const proj = project as Project;

  const { data: companyData } = await supabase.from("companies").select("*").eq("id", proj.company_id).maybeSingle();
  const company = (companyData ?? null) as Company | null;

  let clientName: string | null = null;
  if (proj.client_id) {
    const { data: clientRow } = await supabase.from("clients").select("name").eq("id", proj.client_id).maybeSingle();
    clientName = clientRow?.name ?? null;
  }

  // الحلقات
  let episodes: Episode[] = [];
  let approvedEpisodeIds: string[] = [];
  let pipelineStages: CompanyPipelineStage[] = [];
  if (canClient(permissions, "episodes")) {
    const [{ data: eps }, { data: approvals }, { data: stages }] = await Promise.all([
      supabase.from("episodes").select("*").eq("project_id", id).order("sort_order", { ascending: true }),
      supabase.from("approvals").select("episode_id, revoked_at").eq("project_id", id).is("revoked_at", null),
      supabase.from("company_pipeline_stages").select("*").eq("company_id", proj.company_id).order("sort_order", { ascending: true }),
    ]);
    episodes = (eps ?? []) as Episode[];
    approvedEpisodeIds = (approvals ?? []).map((a) => a.episode_id as string);
    pipelineStages = (stages ?? []) as CompanyPipelineStage[];
  }
  const currentStageKey = currentPipelineStageKey(episodes, pipelineStages);

  // ملفات مستوى المشروع (بدون حلقة) — تُعرض في تبويب "الملفات"، وعدّاد لكل حلقة
  // (يشمل ملفات الحلقات نفسها، وليس فقط ملفات مستوى المشروع) لبطاقات قسم الحلقات.
  let files: ProjectFile[] = [];
  const episodeFileCounts: Record<string, number> = {};
  if (canClient(permissions, "files")) {
    const [{ data: fileRows }, { data: allFileRows }] = await Promise.all([
      supabase.from("files").select("*").eq("project_id", id).is("episode_id", null).eq("client_visible", true).order("created_at", { ascending: false }),
      supabase.from("files").select("episode_id").eq("project_id", id).eq("client_visible", true).not("episode_id", "is", null),
    ]);
    files = (fileRows ?? []) as ProjectFile[];
    for (const row of allFileRows ?? []) {
      const epId = (row as { episode_id: string }).episode_id;
      episodeFileCounts[epId] = (episodeFileCounts[epId] ?? 0) + 1;
    }
  }

  // ملاحظات مستوى المشروع (تبويب "الملاحظات") + عدّاد إجمالي يشمل ملاحظات الحلقات
  // أيضاً لبطاقة الإحصائيات، وعدّاد لكل حلقة لبطاقات قسم الحلقات.
  const [{ data: noteRows }, { data: allNoteRows }] = await Promise.all([
    supabase.from("notes").select("*").eq("project_id", id).is("episode_id", null).order("created_at", { ascending: true }),
    supabase.from("notes").select("episode_id").eq("project_id", id),
  ]);
  const notes = (noteRows ?? []) as Note[];
  const totalNotesCount = allNoteRows?.length ?? notes.length;
  const episodeNoteCounts: Record<string, number> = {};
  for (const row of allNoteRows ?? []) {
    const epId = (row as { episode_id: string | null }).episode_id;
    if (epId) episodeNoteCounts[epId] = (episodeNoteCounts[epId] ?? 0) + 1;
  }

  // الملخّص المالي (بدون أي بيانات أرباح/مصاريف داخلية)
  let finance = null as null | { projectValue: number; paid: number; remaining: number };
  if (canClient(permissions, "finance")) {
    const { data: invoiceRows } = await supabase
      .from("invoices")
      .select("amount, tax, status")
      .eq("project_id", id);
    const invoices = (invoiceRows ?? []) as Pick<Invoice, "amount" | "tax" | "status">[];
    const totalInvoiced = invoices
      .filter((inv) => inv.status !== "cancelled")
      .reduce((sum, inv) => sum + (inv.amount || 0) + (inv.tax || 0), 0);

    const { data: paymentRows } = await supabase
      .from("payments")
      .select("amount, status")
      .eq("project_id", id);
    const payments = (paymentRows ?? []) as Pick<Payment, "amount" | "status">[];
    const paid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + (p.amount || 0), 0);

    const projectValue = proj.budget ?? totalInvoiced;
    finance = { projectValue, paid, remaining: Math.max(projectValue - paid, 0) };
  }

  return (
    <>
      <BrandingInjector color={company?.primary_color} />
      <ProjectView
        project={proj}
        company={company}
        clientName={clientName}
        permissions={permissions}
        episodes={episodes}
        approvedEpisodeIds={approvedEpisodeIds}
        episodeFileCounts={episodeFileCounts}
        episodeNoteCounts={episodeNoteCounts}
        pipelineStages={pipelineStages}
        currentStageKey={currentStageKey}
        files={files}
        notes={notes}
        totalNotesCount={totalNotesCount}
        finance={finance}
        userId={session.userId}
        userName={session.profile.full_name}
      />
    </>
  );
}

function Unauthorized() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="card empty-state">
        <Icon name="shield" size={40} className="nav-icon" />
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>غير مصرّح بالوصول</h2>
        <p style={{ fontSize: 14, marginTop: 6 }}>لا تملك صلاحية عرض هذا المشروع، أو أنه لم يعد مرتبطاً بحسابك.</p>
        <Link href="/client" className="btn btn-outline" style={{ marginTop: 16 }}>
          العودة لمشاريعي
        </Link>
      </div>
    </div>
  );
}
