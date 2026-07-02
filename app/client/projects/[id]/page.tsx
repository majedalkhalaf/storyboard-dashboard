import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import ProjectView from "@/app/components/client/ProjectView";
import BrandingInjector from "@/app/components/client/BrandingInjector";
import Icon from "@/app/components/ui/Icon";
import { canClient } from "@/app/lib/permissions";
import type { Company, Episode, Invoice, Note, Payment, Project, ProjectClient, ProjectFile } from "@/app/lib/types";

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

  // الحلقات
  let episodes: Episode[] = [];
  let approvedEpisodeIds: string[] = [];
  if (canClient(permissions, "episodes")) {
    const { data: eps } = await supabase
      .from("episodes")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true });
    episodes = (eps ?? []) as Episode[];

    const { data: approvals } = await supabase
      .from("approvals")
      .select("episode_id, revoked_at")
      .eq("project_id", id)
      .is("revoked_at", null);
    approvedEpisodeIds = (approvals ?? []).map((a) => a.episode_id as string);
  }

  // ملفات مستوى المشروع (بدون حلقة)
  let files: ProjectFile[] = [];
  if (canClient(permissions, "files")) {
    const { data: fileRows } = await supabase
      .from("files")
      .select("*")
      .eq("project_id", id)
      .is("episode_id", null)
      .eq("client_visible", true)
      .order("created_at", { ascending: false });
    files = (fileRows ?? []) as ProjectFile[];
  }

  // ملاحظات مستوى المشروع
  const { data: noteRows } = await supabase
    .from("notes")
    .select("*")
    .eq("project_id", id)
    .is("episode_id", null)
    .order("created_at", { ascending: true });
  const notes = (noteRows ?? []) as Note[];

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
        permissions={permissions}
        episodes={episodes}
        approvedEpisodeIds={approvedEpisodeIds}
        files={files}
        notes={notes}
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
