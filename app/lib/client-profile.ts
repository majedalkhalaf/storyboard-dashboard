import { createClient as createBrowserClient } from "@/app/lib/supabase/client";
import type { ActivityItem } from "@/app/components/projects/ActivityTimeline";
import type { NoteWithAuthor } from "@/app/lib/episode-detail";
import type { Contract, Episode, Invoice, Payment, Project, ProjectFile, Proposal } from "@/app/lib/types";

export type { ClientProfileSummary } from "@/app/lib/client-profile-server";

// ── جلب كسول لكل تبويب (عميل المتصفح) — يُستدعى فقط عند تفعيل التبويب أول مرة ──

export async function fetchClientProjects(clientId: string): Promise<Project[]> {
  const supabase = createBrowserClient();
  const { data } = await supabase.from("projects").select("*").eq("client_id", clientId).order("updated_at", { ascending: false });
  return (data as Project[]) ?? [];
}

export interface EpisodeWithProject extends Episode {
  project_name: string;
}

export async function fetchClientEpisodes(clientId: string): Promise<EpisodeWithProject[]> {
  const supabase = createBrowserClient();
  const { data: projects } = await supabase.from("projects").select("id, name").eq("client_id", clientId);
  const projectIds = (projects ?? []).map((p) => p.id);
  if (projectIds.length === 0) return [];
  const nameById = Object.fromEntries((projects ?? []).map((p) => [p.id, p.name]));
  const { data } = await supabase.from("episodes").select("*").in("project_id", projectIds).order("updated_at", { ascending: false });
  return ((data as Episode[]) ?? []).map((e) => ({ ...e, project_name: nameById[e.project_id] ?? "" }));
}

export async function fetchClientInvoices(clientId: string): Promise<Invoice[]> {
  const supabase = createBrowserClient();
  const { data } = await supabase.from("invoices").select("*").eq("client_id", clientId).order("issue_date", { ascending: false });
  return (data as Invoice[]) ?? [];
}

export interface PaymentWithProject extends Payment {
  project_name: string;
}

export async function fetchClientPayments(clientId: string): Promise<PaymentWithProject[]> {
  const supabase = createBrowserClient();
  const { data: projects } = await supabase.from("projects").select("id, name").eq("client_id", clientId);
  const projectIds = (projects ?? []).map((p) => p.id);
  if (projectIds.length === 0) return [];
  const nameById = Object.fromEntries((projects ?? []).map((p) => [p.id, p.name]));
  const { data } = await supabase.from("payments").select("*").in("project_id", projectIds).order("created_at", { ascending: false });
  return ((data as Payment[]) ?? []).map((p) => ({ ...p, project_name: nameById[p.project_id] ?? "" }));
}

export async function fetchClientContracts(clientId: string): Promise<Contract[]> {
  const supabase = createBrowserClient();
  const { data } = await supabase.from("contracts").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  return (data as Contract[]) ?? [];
}

export async function fetchClientProposals(clientId: string): Promise<Proposal[]> {
  const supabase = createBrowserClient();
  const { data } = await supabase.from("proposals").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  return (data as Proposal[]) ?? [];
}

export interface FileWithProject extends ProjectFile {
  project_name: string;
}

export async function fetchClientFiles(clientId: string): Promise<FileWithProject[]> {
  const supabase = createBrowserClient();
  const { data: projects } = await supabase.from("projects").select("id, name").eq("client_id", clientId);
  const projectIds = (projects ?? []).map((p) => p.id);
  if (projectIds.length === 0) return [];
  const nameById = Object.fromEntries((projects ?? []).map((p) => [p.id, p.name]));
  const { data } = await supabase.from("files").select("*").in("project_id", projectIds).order("created_at", { ascending: false });
  return ((data as ProjectFile[]) ?? []).map((f) => ({ ...f, project_name: nameById[f.project_id] ?? "" }));
}

export interface ClientNoteRow extends NoteWithAuthor {
  project_name: string;
}

export async function fetchClientNotes(clientId: string): Promise<ClientNoteRow[]> {
  const supabase = createBrowserClient();
  const { data: projects } = await supabase.from("projects").select("id, name").eq("client_id", clientId);
  const projectIds = (projects ?? []).map((p) => p.id);
  if (projectIds.length === 0) return [];
  const nameById = Object.fromEntries((projects ?? []).map((p) => [p.id, p.name]));
  const { data } = await supabase
    .from("notes")
    .select("*, author:profiles!author_id(full_name)")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false })
    .limit(200);
  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
  return ((data ?? []) as Record<string, unknown>[]).map((n) => ({
    ...(n as unknown as NoteWithAuthor),
    author_name: one<{ full_name: string | null }>(n.author as never)?.full_name ?? null,
    project_name: nameById[n.project_id as string] ?? "",
  }));
}

export async function fetchClientActivity(clientId: string): Promise<ActivityItem[]> {
  const supabase = createBrowserClient();
  const { data: projects } = await supabase.from("projects").select("id, name").eq("client_id", clientId);
  const projectIds = (projects ?? []).map((p) => p.id);
  if (projectIds.length === 0) return [];
  const { data } = await supabase
    .from("activity_logs")
    .select("*, actor:profiles!actor_id(full_name, job_title)")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false })
    .limit(200);
  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
  return (data ?? []).map((a) => ({
    id: a.id,
    actor_role: a.actor_role,
    actor_name: one<{ full_name: string | null; job_title: string | null }>(a.actor as never)?.full_name ?? null,
    actor_job_title: one<{ full_name: string | null; job_title: string | null }>(a.actor as never)?.job_title ?? null,
    action: a.action,
    details: (a.details ?? {}) as Record<string, unknown>,
    created_at: a.created_at,
  }));
}
