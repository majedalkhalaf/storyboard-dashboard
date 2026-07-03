import { createClient } from "@/app/lib/supabase/server";
import type { ClientRecord } from "@/app/lib/types";

// ملخّص خفيف يُجلب من السيرفر عند تحميل الصفحة أولاً (Hero + عدّادات شارات التبويبات فقط) —
// كل تبويب يجلب قائمته الكاملة بنفسه عند تفعيله لأول مرة فقط (lazy)، عبر app/lib/client-profile.ts.
// ملف منفصل عن client-profile.ts لأنه يستخدم عميل السيرفر (next/headers) ولا يجوز استيراده
// من مكوّنات "use client".
export interface ClientProfileSummary {
  client: ClientRecord;
  assignedToName: string | null;
  projectsCount: number;
  activeProjects: number;
  episodesCount: number;
  contractsValue: number;
  invoicesTotal: number;
  paidTotal: number;
  invoicesCount: number;
  paymentsCount: number;
  contractsCount: number;
  proposalsCount: number;
  filesCount: number;
  notesCount: number;
  lastActivity: string;
}

export async function getClientProfileSummary(companyId: string, clientId: string): Promise<ClientProfileSummary | null> {
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*, assignee:profiles!assigned_to(full_name)")
    .eq("id", clientId)
    .eq("company_id", companyId)
    .single();
  if (!client) return null;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, status, updated_at")
    .eq("company_id", companyId)
    .eq("client_id", clientId);
  const projectIds = (projects ?? []).map((p) => p.id);

  const [{ count: episodesCount }, { data: contracts }, { data: invoices }, { count: paymentsCount }, { count: proposalsCount }, { count: filesCount }, { count: notesCount }] =
    await Promise.all([
      projectIds.length
        ? supabase.from("episodes").select("id", { count: "exact", head: true }).eq("company_id", companyId).in("project_id", projectIds)
        : Promise.resolve({ count: 0 }),
      supabase.from("contracts").select("amount, status").eq("company_id", companyId).eq("client_id", clientId),
      supabase.from("invoices").select("amount, tax, status").eq("company_id", companyId).eq("client_id", clientId),
      projectIds.length
        ? supabase.from("payments").select("id", { count: "exact", head: true }).eq("company_id", companyId).in("project_id", projectIds)
        : Promise.resolve({ count: 0 }),
      supabase.from("proposals").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("client_id", clientId),
      projectIds.length
        ? supabase.from("files").select("id", { count: "exact", head: true }).eq("company_id", companyId).in("project_id", projectIds)
        : Promise.resolve({ count: 0 }),
      projectIds.length
        ? supabase.from("notes").select("id", { count: "exact", head: true }).eq("company_id", companyId).in("project_id", projectIds)
        : Promise.resolve({ count: 0 }),
    ]);

  let paidTotal = 0;
  if (projectIds.length) {
    const { data: payments } = await supabase.from("payments").select("amount, status").in("project_id", projectIds).eq("status", "paid");
    paidTotal = (payments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  }

  const contractsValue = (contracts ?? []).filter((c) => c.status !== "cancelled").reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const invoicesTotal = (invoices ?? []).filter((i) => i.status !== "cancelled").reduce((s, i) => s + Number(i.amount ?? 0) + Number(i.tax ?? 0), 0);
  const lastActivity = (projects ?? []).reduce((latest, p) => (p.updated_at > latest ? p.updated_at : latest), client.updated_at);

  const assignee = client.assignee as { full_name: string | null } | { full_name: string | null }[] | null;
  const assignedToName = Array.isArray(assignee) ? (assignee[0]?.full_name ?? null) : (assignee?.full_name ?? null);

  return {
    client: client as ClientRecord,
    assignedToName,
    projectsCount: projectIds.length,
    activeProjects: (projects ?? []).filter((p) => ["planning", "in_progress", "review"].includes(p.status)).length,
    episodesCount: episodesCount ?? 0,
    contractsValue,
    invoicesTotal,
    paidTotal,
    invoicesCount: (invoices ?? []).length,
    paymentsCount: paymentsCount ?? 0,
    contractsCount: (contracts ?? []).length,
    proposalsCount: proposalsCount ?? 0,
    filesCount: filesCount ?? 0,
    notesCount: notesCount ?? 0,
    lastActivity,
  };
}
