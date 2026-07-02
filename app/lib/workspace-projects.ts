import { createClient } from "@/app/lib/supabase/server";

// طبقة بيانات موحّدة لمساحة عمل المشاريع — يُستهلك نفس الشكل من كل طرق
// العرض (Grid/List/Kanban/Timeline/Calendar) بدل أن يعيد كل عرض بناء استعلاماته
// الخاصة. كل حقل هنا مبني من بيانات حقيقية موجودة فعلاً في قاعدة البيانات —
// لا توجد أي بيانات وهمية (مثل "عدد أعضاء الفريق" تُحسب من المساهمين الفعليين
// في سجل النشاط، وليست رقماً عشوائياً).

export type InvoiceRollupStatus = "paid" | "unpaid" | "overdue" | "mixed" | "none";

export interface StageProgress {
  planning: number;
  shooting: number;
  editing: number;
  review: number;
  delivery: number;
}

export interface WorkspaceActivityItem {
  id: string;
  action: string;
  actor_name: string | null;
  project_id: string | null;
  project_name: string | null;
  created_at: string;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  type: string | null;
  custom_type: string | null;
  status: string;
  cover_image_url: string | null;
  progress: number;
  location: string | null;
  budget: number | null;
  updated_at: string;
  created_at: string;
  shooting_date: string | null;
  delivery_date: string | null;
  client_id: string | null;
  client_name: string | null;
  creator_name: string | null;
  services: string[];
  episodeCount: number;
  episodesApproved: number;
  episodesPendingClient: number;
  episodesInProgress: number;
  filesCount: number;
  notesCount: number;
  contributorsCount: number;
  revenue: number;
  stageProgress: StageProgress;
  contractStatus: string | null;
  invoiceStatus: InvoiceRollupStatus;
  hasPendingPayment: boolean;
  isOverdue: boolean;
  isFavorite: boolean;
  lastEditorName: string | null;
}

const STAGE_BUCKET: Record<string, keyof StageProgress> = {
  idea: "planning",
  script: "planning",
  scenario: "planning",
  storyboard: "planning",
  shooting: "shooting",
  audio: "shooting",
  editing: "editing",
  color: "editing",
  review: "review",
  delivery: "delivery",
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

export async function getWorkspaceProjects(
  companyId: string,
  userId: string
): Promise<{ projects: WorkspaceProject[]; serviceOptions: string[]; recentActivity: WorkspaceActivityItem[] }> {
  const supabase = await createClient();

  const [
    { data: projectsRaw },
    { data: episodes },
    { data: stages },
    { data: files },
    { data: notes },
    { data: contracts },
    { data: invoices },
    { data: payments },
    { data: activity },
    { data: services },
    { data: favorites },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, name, type, custom_type, status, cover_image_url, progress, location, budget, updated_at, created_at, shooting_date, delivery_date, client_id, client:clients(name), creator:profiles!created_by(full_name)"
      )
      .eq("company_id", companyId)
      .eq("archived", false)
      .order("updated_at", { ascending: false }),
    supabase.from("episodes").select("id, project_id, status").eq("company_id", companyId),
    supabase.from("episode_stages").select("episode_id, key, progress").eq("company_id", companyId),
    supabase.from("files").select("project_id").eq("company_id", companyId),
    supabase.from("notes").select("project_id").eq("company_id", companyId),
    supabase
      .from("contracts")
      .select("project_id, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase.from("invoices").select("project_id, status, amount").eq("company_id", companyId),
    supabase.from("payments").select("project_id, status").eq("company_id", companyId),
    supabase
      .from("activity_logs")
      .select("id, action, project_id, actor_id, created_at, actor:profiles!actor_id(full_name), project:projects(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("project_services").select("project_id, label").eq("company_id", companyId),
    supabase.from("project_favorites").select("project_id").eq("user_id", userId),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const episodeProjectMap: Record<string, string> = {};
  const episodesByProject: Record<string, { status: string }[]> = {};
  for (const e of episodes ?? []) {
    episodeProjectMap[e.id] = e.project_id;
    (episodesByProject[e.project_id] ??= []).push({ status: e.status });
  }

  const stagesByProjectBucket: Record<string, Record<keyof StageProgress, number[]>> = {};
  for (const s of stages ?? []) {
    const projectId = episodeProjectMap[s.episode_id];
    if (!projectId) continue;
    const bucket = STAGE_BUCKET[s.key];
    if (!bucket) continue;
    const entry = (stagesByProjectBucket[projectId] ??= { planning: [], shooting: [], editing: [], review: [], delivery: [] });
    entry[bucket].push(Number(s.progress ?? 0));
  }

  const filesCountByProject: Record<string, number> = {};
  for (const f of files ?? []) {
    if (!f.project_id) continue;
    filesCountByProject[f.project_id] = (filesCountByProject[f.project_id] ?? 0) + 1;
  }

  const notesCountByProject: Record<string, number> = {};
  for (const n of notes ?? []) {
    notesCountByProject[n.project_id] = (notesCountByProject[n.project_id] ?? 0) + 1;
  }

  const latestContractByProject: Record<string, string> = {};
  for (const c of contracts ?? []) {
    if (!latestContractByProject[c.project_id]) latestContractByProject[c.project_id] = c.status;
  }

  const invoicesByProject: Record<string, { status: string; amount: number }[]> = {};
  for (const i of invoices ?? []) {
    (invoicesByProject[i.project_id] ??= []).push({ status: i.status, amount: Number(i.amount) });
  }

  const pendingPaymentByProject = new Set<string>();
  for (const p of payments ?? []) {
    if (p.status === "pending" || p.status === "overdue") pendingPaymentByProject.add(p.project_id);
  }

  const contributorsByProject: Record<string, Set<string>> = {};
  const lastEditorByProject: Record<string, string> = {};
  for (const a of activity ?? []) {
    if (!a.project_id || !a.actor_id) continue;
    (contributorsByProject[a.project_id] ??= new Set()).add(a.actor_id);
    if (!lastEditorByProject[a.project_id]) {
      const actor = Array.isArray(a.actor) ? a.actor[0] : a.actor;
      lastEditorByProject[a.project_id] = actor?.full_name ?? "";
    }
  }

  const servicesByProject: Record<string, string[]> = {};
  const serviceLabelSet = new Set<string>();
  for (const s of services ?? []) {
    (servicesByProject[s.project_id] ??= []).push(s.label);
    serviceLabelSet.add(s.label);
  }

  const favoriteSet = new Set((favorites ?? []).map((f) => f.project_id));

  const recentActivity: WorkspaceActivityItem[] = (activity ?? []).slice(0, 15).map((a) => {
    const actor = Array.isArray(a.actor) ? a.actor[0] : a.actor;
    const project = Array.isArray(a.project) ? a.project[0] : a.project;
    return {
      id: a.id,
      action: a.action,
      actor_name: actor?.full_name ?? null,
      project_id: a.project_id,
      project_name: project?.name ?? null,
      created_at: a.created_at,
    };
  });

  const projects: WorkspaceProject[] = (projectsRaw ?? []).map((p) => {
    const client = Array.isArray(p.client) ? p.client[0] : p.client;
    const creator = Array.isArray(p.creator) ? p.creator[0] : p.creator;
    const projectEpisodes = episodesByProject[p.id] ?? [];
    const bucket = stagesByProjectBucket[p.id];
    const projectInvoices = invoicesByProject[p.id] ?? [];

    let invoiceStatus: InvoiceRollupStatus = "none";
    if (projectInvoices.length > 0) {
      const statuses = new Set(projectInvoices.map((i) => i.status));
      if (statuses.size === 1) {
        const only = [...statuses][0];
        invoiceStatus = only === "paid" ? "paid" : only === "overdue" ? "overdue" : only === "unpaid" ? "unpaid" : "none";
      } else {
        invoiceStatus = statuses.has("overdue") ? "overdue" : "mixed";
      }
    }

    return {
      id: p.id,
      name: p.name,
      type: p.type,
      custom_type: p.custom_type,
      status: p.status,
      cover_image_url: p.cover_image_url,
      progress: Number(p.progress ?? 0),
      location: p.location,
      budget: p.budget !== null ? Number(p.budget) : null,
      updated_at: p.updated_at,
      created_at: p.created_at,
      shooting_date: p.shooting_date,
      delivery_date: p.delivery_date,
      client_id: p.client_id,
      client_name: client?.name ?? null,
      creator_name: creator?.full_name ?? null,
      services: servicesByProject[p.id] ?? [],
      episodeCount: projectEpisodes.length,
      episodesApproved: projectEpisodes.filter((e) => e.status === "approved" || e.status === "delivered").length,
      episodesPendingClient: projectEpisodes.filter((e) => e.status === "ready_for_approval").length,
      episodesInProgress: projectEpisodes.filter((e) => e.status === "in_progress" || e.status === "in_review").length,
      filesCount: filesCountByProject[p.id] ?? 0,
      notesCount: notesCountByProject[p.id] ?? 0,
      contributorsCount: contributorsByProject[p.id]?.size ?? 0,
      revenue: projectInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0),
      stageProgress: {
        planning: average(bucket?.planning ?? []),
        shooting: average(bucket?.shooting ?? []),
        editing: average(bucket?.editing ?? []),
        review: average(bucket?.review ?? []),
        delivery: average(bucket?.delivery ?? []),
      },
      contractStatus: latestContractByProject[p.id] ?? null,
      invoiceStatus,
      hasPendingPayment: pendingPaymentByProject.has(p.id),
      isOverdue: !!p.delivery_date && p.delivery_date < today && !["completed", "delivered", "cancelled"].includes(p.status),
      isFavorite: favoriteSet.has(p.id),
      lastEditorName: lastEditorByProject[p.id] || creator?.full_name || null,
    };
  });

  return { projects, serviceOptions: [...serviceLabelSet].sort(), recentActivity };
}
