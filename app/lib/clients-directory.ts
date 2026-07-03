import { createClient } from "@/app/lib/supabase/server";
import type { ClientCrmStatus, ClientType } from "@/app/lib/types";

export interface ClientDirectoryRow {
  id: string;
  name: string;
  client_type: ClientType;
  city: string | null;
  logo_url: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  status: ClientCrmStatus;
  assigned_to: string | null;
  assigned_to_name: string | null;
  assigned_to_avatar: string | null;
  projectsCount: number;
  activeProjects: number;
  completedProjects: number;
  lateProjects: number;
  contractsValue: number;
  invoicesTotal: number;
  paidTotal: number;
  remaining: number;
  completionPct: number;
  lastActivity: string;
  created_at: string;
}

export interface ClientsDirectoryStats {
  totalClients: number;
  activeClients: number;
  totalProjects: number;
  totalContractsValue: number;
  totalInvoices: number;
  totalPaid: number;
  totalRemaining: number;
  avgCompletion: number;
  inProgressProjects: number;
  lateProjects: number;
}

const ACTIVE_PROJECT_STATUSES = new Set(["planning", "in_progress", "review"]);
const DONE_PROJECT_STATUSES = new Set(["completed", "delivered"]);

export async function getClientsDirectory(
  companyId: string
): Promise<{ clients: ClientDirectoryRow[]; stats: ClientsDirectoryStats }> {
  const supabase = await createClient();

  const [{ data: clients }, { data: projects }, { data: contracts }, { data: invoices }, { data: payments }] = await Promise.all([
    supabase
      .from("clients")
      .select("*, assignee:profiles!assigned_to(full_name, avatar_url)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id, client_id, status, progress, delivery_date, updated_at").eq("company_id", companyId),
    supabase.from("contracts").select("client_id, amount, status").eq("company_id", companyId),
    supabase.from("invoices").select("client_id, amount, tax, status").eq("company_id", companyId),
    supabase.from("payments").select("project_id, amount, status").eq("company_id", companyId),
  ]);

  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

  const projectClientMap: Record<string, string> = {};
  const projectsByClient: Record<string, { count: number; active: number; completed: number; late: number; progressSum: number; lastActivity: string }> = {};
  const today = new Date().toISOString().slice(0, 10);

  for (const p of projects ?? []) {
    if (!p.client_id) continue;
    projectClientMap[p.id] = p.client_id;
    const bucket = (projectsByClient[p.client_id] ??= { count: 0, active: 0, completed: 0, late: 0, progressSum: 0, lastActivity: "" });
    bucket.count += 1;
    bucket.progressSum += Number(p.progress ?? 0);
    if (ACTIVE_PROJECT_STATUSES.has(p.status)) bucket.active += 1;
    if (DONE_PROJECT_STATUSES.has(p.status)) bucket.completed += 1;
    if (p.delivery_date && p.delivery_date < today && !DONE_PROJECT_STATUSES.has(p.status) && p.status !== "cancelled") bucket.late += 1;
    if (p.updated_at > bucket.lastActivity) bucket.lastActivity = p.updated_at;
  }

  const contractsValueByClient: Record<string, number> = {};
  for (const c of contracts ?? []) {
    if (!c.client_id || c.status === "cancelled" || c.amount == null) continue;
    contractsValueByClient[c.client_id] = (contractsValueByClient[c.client_id] ?? 0) + Number(c.amount);
  }

  const invoicesTotalByClient: Record<string, number> = {};
  for (const inv of invoices ?? []) {
    if (!inv.client_id || inv.status === "cancelled") continue;
    invoicesTotalByClient[inv.client_id] = (invoicesTotalByClient[inv.client_id] ?? 0) + Number(inv.amount ?? 0) + Number(inv.tax ?? 0);
  }

  const paidByClient: Record<string, number> = {};
  for (const pay of payments ?? []) {
    if (pay.status !== "paid") continue;
    const clientId = projectClientMap[pay.project_id];
    if (!clientId) continue;
    paidByClient[clientId] = (paidByClient[clientId] ?? 0) + Number(pay.amount ?? 0);
  }

  const rows: ClientDirectoryRow[] = (clients ?? []).map((c) => {
    const assignee = one<{ full_name: string | null; avatar_url: string | null }>(c.assignee as never);
    const pb = projectsByClient[c.id];
    const invoicesTotal = invoicesTotalByClient[c.id] ?? 0;
    const paidTotal = paidByClient[c.id] ?? 0;
    return {
      id: c.id,
      name: c.name,
      client_type: c.client_type,
      city: c.city,
      logo_url: c.logo_url,
      contact_name: c.contact_name,
      email: c.email,
      phone: c.phone,
      status: c.status,
      assigned_to: c.assigned_to,
      assigned_to_name: assignee?.full_name ?? null,
      assigned_to_avatar: assignee?.avatar_url ?? null,
      projectsCount: pb?.count ?? 0,
      activeProjects: pb?.active ?? 0,
      completedProjects: pb?.completed ?? 0,
      lateProjects: pb?.late ?? 0,
      contractsValue: contractsValueByClient[c.id] ?? 0,
      invoicesTotal,
      paidTotal,
      remaining: Math.max(0, invoicesTotal - paidTotal),
      completionPct: pb && pb.count > 0 ? Math.round(pb.progressSum / pb.count) : 0,
      lastActivity: pb?.lastActivity || c.updated_at,
      created_at: c.created_at,
    };
  });

  const stats: ClientsDirectoryStats = {
    totalClients: rows.length,
    activeClients: rows.filter((r) => r.status === "active").length,
    totalProjects: rows.reduce((s, r) => s + r.projectsCount, 0),
    totalContractsValue: rows.reduce((s, r) => s + r.contractsValue, 0),
    totalInvoices: rows.reduce((s, r) => s + r.invoicesTotal, 0),
    totalPaid: rows.reduce((s, r) => s + r.paidTotal, 0),
    totalRemaining: rows.reduce((s, r) => s + r.remaining, 0),
    avgCompletion: rows.length ? Math.round(rows.reduce((s, r) => s + r.completionPct, 0) / rows.length) : 0,
    inProgressProjects: rows.reduce((s, r) => s + r.activeProjects, 0),
    lateProjects: rows.reduce((s, r) => s + r.lateProjects, 0),
  };

  return { clients: rows, stats };
}
