import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import Icon from "@/app/components/ui/Icon";
import StatCard from "@/app/components/dashboard/StatCard";
import PerformanceRing from "@/app/components/dashboard/PerformanceRing";
import HeroBanner from "@/app/components/dashboard/HeroBanner";
import ProjectsOverviewSection, { type DashboardProject } from "@/app/components/dashboard/ProjectsOverviewSection";
import TodayActionItemsCard, { type ActionItem } from "@/app/components/dashboard/TodayActionItemsCard";
import RecentActivityCard from "@/app/components/dashboard/RecentActivityCard";
import ImportantNotificationsCard from "@/app/components/dashboard/ImportantNotificationsCard";
import QuickActionsGrid from "@/app/components/dashboard/QuickActionsGrid";
import RevenueExpenseChart from "@/app/components/dashboard/RevenueExpenseChart";
import StatusDonut from "@/app/components/dashboard/StatusDonut";
import TopServicesBars from "@/app/components/dashboard/TopServicesBars";
import { PROJECT_STATUSES } from "@/app/lib/constants";
import { fmtDate } from "@/app/components/finance/format";

const DAY_MS = 86400000;

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;
  const now = new Date();
  const today = startOfDay(now);
  const todayStr = today.toISOString().slice(0, 10);
  const weekAgo = new Date(today.getTime() - 7 * DAY_MS);
  const twoWeeksAgo = new Date(today.getTime() - 14 * DAY_MS);
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const upcomingLimit = new Date(today.getTime() + 14 * DAY_MS);

  const [
    { data: projects },
    { data: episodesRaw },
    { data: invoices },
    { data: expenses },
    { data: activity },
    { data: stagesRaw },
    { data: notifications },
    { data: services },
    { data: pendingNotes },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, name, type, custom_type, status, progress, cover_image_url, updated_at, created_at, delivery_date, client:clients(name), creator:profiles!created_by(full_name)"
      )
      .eq("company_id", companyId)
      .eq("archived", false)
      .order("updated_at", { ascending: false }),
    supabase.from("episodes").select("id, project_id, status, created_at").eq("company_id", companyId),
    supabase
      .from("invoices")
      .select("id, amount, status, issue_date, due_date")
      .eq("company_id", companyId)
      .gte("issue_date", sixMonthsAgo.toISOString().slice(0, 10)),
    supabase
      .from("expenses")
      .select("id, amount, expense_date")
      .eq("company_id", companyId)
      .gte("expense_date", sixMonthsAgo.toISOString().slice(0, 10)),
    supabase
      .from("activity_logs")
      .select("id, action, project_id, created_at, actor:profiles!actor_id(full_name)")
      .eq("company_id", companyId)
      .gte("created_at", twoWeeksAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("episode_stages")
      .select("id, label, due_date, status, episode:episodes(id, title, project_id, project:projects(name))")
      .eq("company_id", companyId)
      .not("due_date", "is", null)
      .neq("status", "completed")
      .lte("due_date", upcomingLimit.toISOString().slice(0, 10))
      .order("due_date", { ascending: true })
      .limit(8),
    supabase
      .from("notifications")
      .select("id, title, message")
      .eq("user_id", session!.userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("project_services").select("label").eq("company_id", companyId),
    supabase
      .from("notes")
      .select("id, body, project_id, project:projects(name)")
      .eq("company_id", companyId)
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const allProjects = projects ?? [];
  const episodes = episodesRaw ?? [];
  const allInvoices = invoices ?? [];
  const allExpenses = expenses ?? [];
  const activityItems = activity ?? [];
  const stages = stagesRaw ?? [];

  // ── حلقات بانتظار الاعتماد لكل مشروع (لتصنيف تبويب "بانتظار الاعتماد") ──
  const projectsWithPendingApproval = new Set(
    episodes.filter((e) => e.status === "ready_for_approval").map((e) => e.project_id)
  );
  const episodeCountByProject: Record<string, number> = {};
  for (const e of episodes) {
    episodeCountByProject[e.project_id] = (episodeCountByProject[e.project_id] ?? 0) + 1;
  }

  const dashboardProjects: DashboardProject[] = allProjects.map((p) => {
    const client = Array.isArray(p.client) ? p.client[0] : p.client;
    const creator = Array.isArray(p.creator) ? p.creator[0] : p.creator;
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      custom_type: p.custom_type,
      status: p.status,
      cover_image_url: p.cover_image_url,
      progress: Number(p.progress ?? 0),
      updated_at: p.updated_at,
      delivery_date: p.delivery_date,
      client_name: client?.name ?? null,
      creator_name: creator?.full_name ?? null,
      episodeCount: episodeCountByProject[p.id] ?? 0,
      hasPendingApproval: projectsWithPendingApproval.has(p.id),
    };
  });

  // ── إحصاءات الأسبوع ──────────────────────────────────────────────────
  const projectsThisWeek = allProjects.filter((p) => new Date(p.created_at) >= weekAgo).length;

  const inProgressCount = allProjects.filter((p) => p.status === "in_progress").length;
  const completedCount = allProjects.filter((p) => p.status === "completed" || p.status === "delivered").length;
  const inReviewEpisodes = episodes.filter((e) => e.status === "in_review").length;
  const pendingApprovalEpisodes = episodes.filter((e) => e.status === "ready_for_approval").length;

  const overallProgress = allProjects.length > 0 ? allProjects.reduce((s, p) => s + Number(p.progress ?? 0), 0) / allProjects.length : 0;

  // ── المالية: هذا الشهر مقابل الشهر الماضي + آخر 6 أشهر ──────────────────
  const thisMonthKey = monthKey(now);
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthKey = monthKey(lastMonthDate);

  const revenueByMonth: Record<string, number> = {};
  for (const inv of allInvoices) {
    if (inv.status !== "paid") continue;
    const k = monthKey(new Date(inv.issue_date));
    revenueByMonth[k] = (revenueByMonth[k] ?? 0) + Number(inv.amount);
  }
  const expensesByMonth: Record<string, number> = {};
  for (const ex of allExpenses) {
    const k = monthKey(new Date(ex.expense_date));
    expensesByMonth[k] = (expensesByMonth[k] ?? 0) + Number(ex.amount);
  }

  const monthPoints = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
    const k = monthKey(d);
    return {
      label: d.toLocaleDateString("ar-u-nu-latn", { month: "short" }),
      revenue: revenueByMonth[k] ?? 0,
      expenses: expensesByMonth[k] ?? 0,
    };
  });

  const revenueThisMonth = revenueByMonth[thisMonthKey] ?? 0;
  const revenueLastMonth = revenueByMonth[lastMonthKey] ?? 0;
  const expensesThisMonth = expensesByMonth[thisMonthKey] ?? 0;
  const expensesLastMonth = expensesByMonth[lastMonthKey] ?? 0;
  const profitThisMonth = revenueThisMonth - expensesThisMonth;
  const profitLastMonth = revenueLastMonth - expensesLastMonth;

  const pctChange = (curr: number, prev: number): number | null => {
    if (prev === 0) return curr === 0 ? null : 100;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const overdueInvoicesAmount = allInvoices
    .filter((i) => (i.status === "unpaid" || i.status === "overdue") && i.due_date && i.due_date < todayStr)
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const overdueProjects = allProjects.filter(
    (p) => p.delivery_date && p.delivery_date < todayStr && !["completed", "delivered", "cancelled"].includes(p.status)
  ).length;

  // ── توزيع المشاريع حسب الحالة ───────────────────────────────────────────
  const statusSegments = PROJECT_STATUSES.filter((s) => s.value !== "archived").map((s) => ({
    label: s.label,
    value: allProjects.filter((p) => p.status === s.value).length,
    color: s.color,
  }));

  // ── أكثر الخدمات استخداماً ───────────────────────────────────────────────
  const serviceCounts: Record<string, number> = {};
  for (const s of services ?? []) {
    serviceCounts[s.label] = (serviceCounts[s.label] ?? 0) + 1;
  }
  const topServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  // ── مهام اليوم: عناصر حقيقية تحتاج انتباهاً (لا يوجد نظام مهام منفصل) ──
  const actionItems: ActionItem[] = [];
  for (const s of stages) {
    const episode = Array.isArray(s.episode) ? s.episode[0] : s.episode;
    if (!episode || !s.due_date) continue;
    const project = Array.isArray(episode.project) ? episode.project[0] : episode.project;
    const priority: ActionItem["priority"] = s.due_date < todayStr ? "overdue" : s.due_date === todayStr ? "today" : "upcoming";
    actionItems.push({
      id: `stage-${s.id}`,
      label: s.label,
      meta: `${project?.name ?? ""} · ${fmtDate(s.due_date)}`,
      href: `/projects/${episode.project_id}/episodes/${episode.id}`,
      priority,
    });
  }
  for (const n of pendingNotes ?? []) {
    const project = Array.isArray(n.project) ? n.project[0] : n.project;
    actionItems.push({
      id: `note-${n.id}`,
      label: "ملاحظة تحتاج للرد",
      meta: project?.name ?? "",
      href: `/projects/${n.project_id}`,
      priority: "attention",
    });
  }
  const priorityOrder: Record<ActionItem["priority"], number> = { overdue: 0, today: 1, attention: 2, upcoming: 3 };
  actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const stats = [
    { label: "إجمالي المشاريع", value: allProjects.length, delta: projectsThisWeek > 0 ? `+${projectsThisWeek} هذا الأسبوع` : null, icon: "projects" as const, color: "#8B5CF6" },
    { label: "إجمالي الحلقات", value: episodes.length, icon: "episodes" as const, color: "#06B6D4" },
    { label: "معدل الإنجاز", value: `${Math.round(overallProgress)}%`, icon: "barChart" as const, color: "var(--gold)" },
    { label: "الإيرادات هذا الشهر", value: `${revenueThisMonth.toLocaleString("en-US")} ر.س`, delta: (() => { const p = pctChange(revenueThisMonth, revenueLastMonth); return p === null ? null : `${p >= 0 ? "+" : ""}${p.toFixed(0)}%`; })(), deltaTone: revenueThisMonth >= revenueLastMonth ? ("up" as const) : ("down" as const), icon: "money" as const, color: "var(--success)" },
    { label: "المصروفات هذا الشهر", value: `${expensesThisMonth.toLocaleString("en-US")} ر.س`, delta: (() => { const p = pctChange(expensesThisMonth, expensesLastMonth); return p === null ? null : `${p >= 0 ? "+" : ""}${p.toFixed(0)}%`; })(), deltaTone: expensesThisMonth <= expensesLastMonth ? ("up" as const) : ("down" as const), icon: "expenses" as const, color: "var(--danger)" },
    { label: "صافي الربح", value: `${profitThisMonth.toLocaleString("en-US")} ر.س`, delta: (() => { const p = pctChange(profitThisMonth, profitLastMonth); return p === null ? null : `${p >= 0 ? "+" : ""}${p.toFixed(0)}%`; })(), deltaTone: profitThisMonth >= profitLastMonth ? ("up" as const) : ("down" as const), icon: "trendUp" as const, color: "var(--gold)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Hero ── */}
      <div className="card dashboard-hero" style={{ padding: 24, display: "grid", gridTemplateColumns: "1.1fr 1.3fr 1fr", gap: 24, alignItems: "center" }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            مرحباً بك في لوحة التحكم 👋
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.8 }}>
            تابع جميع مشاريعك وإنتاجك من مكان واحد، {session?.profile.full_name || ""}.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <Link href="/projects?new=1" className="btn btn-gold">
              <Icon name="plus" size={16} /> إنشاء مشروع جديد
            </Link>
            <Link href="/export" className="btn btn-outline">
              <Icon name="barChart" size={16} /> عرض التقارير
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
          <PerformanceRing percent={overallProgress} label="نسبة الإنجاز الإجمالية" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1, minWidth: 180 }}>
            <MiniStat label="مشاريع نشطة" value={inProgressCount} />
            <MiniStat label="حلقات قيد المراجعة" value={inReviewEpisodes} />
            <MiniStat label="بانتظار الاعتماد" value={pendingApprovalEpisodes} />
            <MiniStat label="مشاريع مكتملة" value={completedCount} />
          </div>
        </div>

        <HeroBanner />
      </div>

      {/* ── إحصاءات ── */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ── المشاريع ── */}
      <ProjectsOverviewSection projects={dashboardProjects} />

      {/* ── مهام اليوم / النشاط / الإشعارات / إجراءات سريعة ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="dashboard-widgets-row">
        <TodayActionItemsCard items={actionItems.slice(0, 8)} />
        <RecentActivityCard
          items={activityItems.slice(0, 8).map((a) => {
            const actor = Array.isArray(a.actor) ? a.actor[0] : a.actor;
            return { id: a.id, action: a.action, actor_name: actor?.full_name ?? null, created_at: a.created_at, projectId: a.project_id };
          })}
        />
        <ImportantNotificationsCard
          notifications={notifications ?? []}
          pendingApprovals={pendingApprovalEpisodes}
          overdueInvoicesAmount={overdueInvoicesAmount}
          overdueProjects={overdueProjects}
        />
        <QuickActionsGrid />
      </div>

      {/* ── الرسوم البيانية ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 16 }} className="dashboard-charts-row-3">
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>نظرة عامة على الأداء</h3>
          <RevenueExpenseChart points={monthPoints} />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>توزيع المشاريع حسب الحالة</h3>
          <StatusDonut segments={statusSegments} centerLabel="مشروع" />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>أكثر الخدمات استخداماً</h3>
          <TopServicesBars services={topServices} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card" style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
