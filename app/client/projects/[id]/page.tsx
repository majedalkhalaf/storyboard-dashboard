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

  // جولتا شبكة فقط بدل ما يصل إلى عشر جولات متتالية: الأولى للتحقق من الصلاحية
  // وجلب المشروع معاً (لا يعتمد أحدهما على الآخر)، والثانية تُطلق كل ما تبقّى
  // من استعلامات دفعة واحدة بمجرد معرفة الصلاحيات ومعرّف الشركة/العميل — كل
  // استعلام في الدفعة الثانية مستقل عن نتائج الآخرين في نفس الدفعة.
  const [{ data: pc }, { data: project }] = await Promise.all([
    supabase.from("project_clients").select("*").eq("project_id", id).eq("client_user_id", session.userId).eq("status", "active").maybeSingle(),
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
  ]);

  if (!pc) return <Unauthorized />;
  if (!project) return <Unauthorized />;

  const projectClient = pc as ProjectClient;
  const permissions = projectClient.permissions;
  const proj = project as Project;

  const showEpisodes = canClient(permissions, "episodes");
  const showFiles = canClient(permissions, "files");
  const showFinance = canClient(permissions, "finance");
  const showPayments = canClient(permissions, "payments");

  const [
    { data: companyData },
    { data: clientRow },
    { data: eps },
    { data: approvals },
    { data: stages },
    { data: fileRows },
    { data: allFileRows },
    { data: noteRows },
    { data: allNoteRows },
    { data: invoiceRows },
    { data: paymentRows },
    { data: lastPaymentRow },
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("id", proj.company_id).maybeSingle(),
    proj.client_id ? supabase.from("clients").select("name").eq("id", proj.client_id).maybeSingle() : Promise.resolve({ data: null }),
    showEpisodes ? supabase.from("episodes").select("*").eq("project_id", id).order("sort_order", { ascending: true }) : Promise.resolve({ data: [] as Episode[] }),
    showEpisodes ? supabase.from("approvals").select("episode_id, revoked_at").eq("project_id", id).is("revoked_at", null) : Promise.resolve({ data: [] as { episode_id: string; revoked_at: string | null }[] }),
    showEpisodes ? supabase.from("company_pipeline_stages").select("*").eq("company_id", proj.company_id).order("sort_order", { ascending: true }) : Promise.resolve({ data: [] as CompanyPipelineStage[] }),
    showFiles
      ? supabase.from("files").select("*").eq("project_id", id).is("episode_id", null).eq("client_visible", true).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as ProjectFile[] }),
    showFiles
      ? supabase.from("files").select("episode_id").eq("project_id", id).eq("client_visible", true).not("episode_id", "is", null)
      : Promise.resolve({ data: [] as { episode_id: string }[] }),
    supabase.from("notes").select("*").eq("project_id", id).is("episode_id", null).order("created_at", { ascending: true }),
    supabase.from("notes").select("episode_id").eq("project_id", id),
    showFinance ? supabase.from("invoices").select("amount, tax, status").eq("project_id", id) : Promise.resolve({ data: [] as Pick<Invoice, "amount" | "tax" | "status">[] }),
    showFinance ? supabase.from("payments").select("amount, status").eq("project_id", id) : Promise.resolve({ data: [] as Pick<Payment, "amount" | "status">[] }),
    showPayments
      ? supabase.from("payments").select("*").eq("project_id", id).eq("status", "paid").order("paid_date", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null as Payment | null }),
  ]);

  const company = (companyData ?? null) as Company | null;
  const clientName = clientRow?.name ?? null;

  const episodes = (eps ?? []) as Episode[];
  const approvedEpisodeIds = (approvals ?? []).map((a) => a.episode_id as string);
  const pipelineStages = (stages ?? []) as CompanyPipelineStage[];
  const currentStageKey = currentPipelineStageKey(episodes, pipelineStages);

  // ملفات مستوى المشروع (بدون حلقة) — تُعرض في تبويب "الملفات"، وعدّاد لكل حلقة
  // (يشمل ملفات الحلقات نفسها، وليس فقط ملفات مستوى المشروع) لبطاقات قسم الحلقات.
  const files = (fileRows ?? []) as ProjectFile[];
  const episodeFileCounts: Record<string, number> = {};
  for (const row of allFileRows ?? []) {
    const epId = (row as { episode_id: string }).episode_id;
    episodeFileCounts[epId] = (episodeFileCounts[epId] ?? 0) + 1;
  }

  // ملاحظات مستوى المشروع (تبويب "الملاحظات") + عدّاد إجمالي يشمل ملاحظات الحلقات
  // أيضاً لبطاقة الإحصائيات، وعدّاد لكل حلقة لبطاقات قسم الحلقات.
  const notes = (noteRows ?? []) as Note[];
  const totalNotesCount = allNoteRows?.length ?? notes.length;
  const episodeNoteCounts: Record<string, number> = {};
  for (const row of allNoteRows ?? []) {
    const epId = (row as { episode_id: string | null }).episode_id;
    if (epId) episodeNoteCounts[epId] = (episodeNoteCounts[epId] ?? 0) + 1;
  }

  // الملخّص المالي (بدون أي بيانات أرباح/مصاريف داخلية)
  let finance = null as null | { projectValue: number; paid: number; remaining: number };
  if (showFinance) {
    const invoices = (invoiceRows ?? []) as Pick<Invoice, "amount" | "tax" | "status">[];
    const totalInvoiced = invoices.filter((inv) => inv.status !== "cancelled").reduce((sum, inv) => sum + (inv.amount || 0) + (inv.tax || 0), 0);
    const payments = (paymentRows ?? []) as Pick<Payment, "amount" | "status">[];
    const paid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + (p.amount || 0), 0);
    const projectValue = proj.budget ?? totalInvoiced;
    finance = { projectValue, paid, remaining: Math.max(projectValue - paid, 0) };
  }

  const lastPayment = (lastPaymentRow ?? null) as Payment | null;

  return (
    <>
      <BrandingInjector color={company?.primary_color} buttonColor={company?.button_color} alertColor={company?.alert_color} />
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
        lastPayment={lastPayment}
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
