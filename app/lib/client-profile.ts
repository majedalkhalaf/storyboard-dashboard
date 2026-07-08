import { createClient as createBrowserClient } from "@/app/lib/supabase/client";
import type { ActivityItem } from "@/app/components/projects/ActivityTimeline";
import type { NoteWithAuthor } from "@/app/lib/episode-detail";
import type { IconName } from "@/app/components/ui/Icon";
import type { ClientActivityLog, ClientSession, Contract, Episode, Invoice, Payment, Project, ProjectFile, Proposal } from "@/app/lib/types";

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

// ── تحليلات نشاط العميل (بوابة العميل) — المرحلة الأولى ──

export interface ClientAnalyticsStats {
  totalLogins: number;
  totalTimeSeconds: number;
  avgSessionSeconds: number;
  pageViews: number;
  episodesViewed: number;
  filesDownloaded: number;
  videosWatched: number;
  videoComments: number;
  editRequests: number;
  approvals: number;
}

export interface ClientAnalyticsTimelineItem {
  id: string;
  at: string;
  icon: IconName;
  color: string;
  title: string;
  subtitle: string;
  device?: string | null;
  browser?: string | null;
}

export interface ClientAnalyticsData {
  hasPortalAccess: boolean;
  stats: ClientAnalyticsStats;
  timeline: ClientAnalyticsTimelineItem[];
}

const EMPTY_STATS: ClientAnalyticsStats = {
  totalLogins: 0,
  totalTimeSeconds: 0,
  avgSessionSeconds: 0,
  pageViews: 0,
  episodesViewed: 0,
  filesDownloaded: 0,
  videosWatched: 0,
  videoComments: 0,
  editRequests: 0,
  approvals: 0,
};

const EVENT_META: Record<ClientActivityLog["event_type"], { icon: IconName; color: string; title: string }> = {
  login: { icon: "user", color: "#22C55E", title: "تسجيل دخول" },
  logout: { icon: "logout", color: "#6B7280", title: "تسجيل خروج" },
  page_view: { icon: "eye", color: "#3987e5", title: "زيارة صفحة" },
  file_download: { icon: "export", color: "#3987e5", title: "تحميل ملف" },
  video_watch: { icon: "video", color: "#F59E0B", title: "مشاهدة فيديو" },
  error: { icon: "warning", color: "#EF4444", title: "مشكلة تقنية" },
};

const PAGE_LABELS: { test: RegExp; label: string }[] = [
  { test: /^\/client$/, label: "الرئيسية" },
  { test: /\/episodes\/[^/]+/, label: "صفحة حلقة" },
  { test: /^\/client\/projects\/[^/]+/, label: "صفحة مشروع" },
  { test: /^\/client\/projects/, label: "مشاريعي" },
  { test: /^\/client\/files/, label: "الملفات والمستندات" },
  { test: /^\/client\/episodes/, label: "الحلقات والإنتاج" },
  { test: /^\/client\/progress/, label: "العمل الجاري" },
  { test: /^\/client\/reports/, label: "التقارير" },
  { test: /^\/client\/invoices/, label: "الحسابات" },
  { test: /^\/client\/notes/, label: "طلبات التعديل" },
  { test: /^\/client\/meetings/, label: "الاجتماعات" },
  { test: /^\/client\/notifications/, label: "التنبيهات" },
  { test: /^\/client\/support/, label: "الدعم الفني" },
  { test: /^\/client\/settings/, label: "الإعدادات" },
];

function pageLabel(page: string | null): string {
  if (!page) return "—";
  return PAGE_LABELS.find((p) => p.test.test(page))?.label ?? page;
}

function describeLog(log: ClientActivityLog, projectNameById: Record<string, string>): ClientAnalyticsTimelineItem {
  const meta = EVENT_META[log.event_type];
  const project = log.project_id ? projectNameById[log.project_id] : null;
  let subtitle = project ? `#${project.replace(/\s+/g, "_")}` : "";

  if (log.event_type === "page_view") {
    subtitle = [pageLabel(log.page), project ? `#${project.replace(/\s+/g, "_")}` : null, log.duration_seconds ? `${log.duration_seconds} ثانية` : null]
      .filter(Boolean)
      .join(" · ");
  } else if (log.event_type === "file_download") {
    const fileName = (log.metadata?.fileName as string | undefined) ?? "";
    subtitle = [fileName, project ? `#${project.replace(/\s+/g, "_")}` : null].filter(Boolean).join(" — ");
  } else if (log.event_type === "video_watch") {
    const percent = log.metadata?.percent as number | undefined;
    subtitle = [percent != null ? `شاهد ${percent}%` : null, project ? `#${project.replace(/\s+/g, "_")}` : null].filter(Boolean).join(" · ");
  } else if (log.event_type === "logout" && log.duration_seconds != null) {
    subtitle = `مدة الجلسة: ${Math.round(log.duration_seconds / 60)} دقيقة`;
  }

  return {
    id: `log-${log.id}`,
    at: log.created_at,
    icon: meta.icon,
    color: meta.color,
    title: meta.title,
    subtitle,
    device: log.device,
    browser: log.browser,
  };
}

export async function fetchClientAnalytics(clientId: string): Promise<ClientAnalyticsData> {
  const supabase = createBrowserClient();

  const { data: portalLinks } = await supabase
    .from("project_clients")
    .select("client_user_id")
    .eq("client_id", clientId)
    .not("client_user_id", "is", null);
  const portalUserIds = Array.from(new Set((portalLinks ?? []).map((p) => p.client_user_id as string)));

  if (portalUserIds.length === 0) {
    return { hasPortalAccess: false, stats: EMPTY_STATS, timeline: [] };
  }

  const { data: projects } = await supabase.from("projects").select("id, name").eq("client_id", clientId);
  const projectNameById = Object.fromEntries((projects ?? []).map((p) => [p.id, p.name]));

  const [{ data: sessions }, { data: logs }, { data: notes }, { data: approvals }, { data: files }] = await Promise.all([
    supabase.from("client_sessions").select("*").in("client_user_id", portalUserIds).order("started_at", { ascending: false }).limit(200),
    supabase.from("client_activity_logs").select("*").in("client_user_id", portalUserIds).order("created_at", { ascending: false }).limit(300),
    supabase
      .from("notes")
      .select("id, project_id, episode_id, target_type, request_type, body, created_at")
      .in("author_id", portalUserIds)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase.from("approvals").select("id, project_id, episode_id, note, approved_at").in("client_id", portalUserIds).order("approved_at", { ascending: false }).limit(100),
    supabase.from("files").select("id, project_id, episode_id, name, created_at").in("uploaded_by", portalUserIds).order("created_at", { ascending: false }).limit(100),
  ]);

  const now = Date.now();
  const totalTimeSeconds = (sessions ?? []).reduce((s, sess: ClientSession) => {
    if (sess.duration_seconds != null) return s + sess.duration_seconds;
    if (!sess.ended_at) return s + Math.max(0, Math.round((now - new Date(sess.started_at).getTime()) / 1000));
    return s;
  }, 0);
  const totalLogins = sessions?.length ?? 0;

  const logRows = (logs ?? []) as ClientActivityLog[];
  const pageViewLogs = logRows.filter((l) => l.event_type === "page_view");
  const episodesViewed = new Set(pageViewLogs.filter((l) => l.episode_id).map((l) => l.episode_id)).size;

  const stats: ClientAnalyticsStats = {
    totalLogins,
    totalTimeSeconds,
    avgSessionSeconds: totalLogins > 0 ? Math.round(totalTimeSeconds / totalLogins) : 0,
    pageViews: pageViewLogs.length,
    episodesViewed,
    filesDownloaded: logRows.filter((l) => l.event_type === "file_download").length,
    videosWatched: logRows.filter((l) => l.event_type === "video_watch").length,
    videoComments: (notes ?? []).filter((n) => n.target_type === "video").length,
    editRequests: (notes ?? []).filter((n) => Boolean(n.request_type)).length,
    approvals: approvals?.length ?? 0,
  };

  const timeline: ClientAnalyticsTimelineItem[] = [];
  for (const l of logRows) timeline.push(describeLog(l, projectNameById));
  for (const n of notes ?? []) {
    const project = n.project_id ? projectNameById[n.project_id] : null;
    timeline.push({
      id: `note-${n.id}`,
      at: n.created_at,
      icon: n.target_type === "video" ? "video" : "edit",
      color: "#8B5CF6",
      title: n.target_type === "video" ? "تعليق على فيديو" : "طلب تعديل",
      subtitle: [project ? `#${project.replace(/\s+/g, "_")}` : null, (n.body as string | null)?.slice(0, 80)].filter(Boolean).join(" — "),
    });
  }
  for (const a of approvals ?? []) {
    const project = a.project_id ? projectNameById[a.project_id] : null;
    timeline.push({
      id: `approval-${a.id}`,
      at: a.approved_at,
      icon: "badgeCheck",
      color: "var(--success)",
      title: "اعتماد حلقة",
      subtitle: project ? `#${project.replace(/\s+/g, "_")}` : "",
    });
  }
  for (const f of files ?? []) {
    const project = f.project_id ? projectNameById[f.project_id] : null;
    timeline.push({
      id: `file-${f.id}`,
      at: f.created_at,
      icon: "fileUp",
      color: "#3987e5",
      title: "رفع ملف",
      subtitle: [f.name, project ? `#${project.replace(/\s+/g, "_")}` : null].filter(Boolean).join(" — "),
    });
  }

  timeline.sort((a, b) => b.at.localeCompare(a.at));

  return { hasPortalAccess: true, stats, timeline: timeline.slice(0, 300) };
}
