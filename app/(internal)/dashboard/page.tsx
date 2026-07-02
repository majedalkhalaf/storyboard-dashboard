import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES } from "@/app/lib/constants";
import StatCard from "@/app/components/dashboard/StatCard";
import ActivityTrendChart from "@/app/components/dashboard/ActivityTrendChart";
import StatusDonut from "@/app/components/dashboard/StatusDonut";
import FinanceSummaryCard from "@/app/components/dashboard/FinanceSummaryCard";
import RecentProjectsCard from "@/app/components/dashboard/RecentProjectsCard";
import UpcomingTasksCard from "@/app/components/dashboard/UpcomingTasksCard";
import RecentActivityCard from "@/app/components/dashboard/RecentActivityCard";
import ImportantNotificationsCard from "@/app/components/dashboard/ImportantNotificationsCard";
import QuickActionsGrid from "@/app/components/dashboard/QuickActionsGrid";
import ProjectProgressRow from "@/app/components/dashboard/ProjectProgressRow";

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
  const weekAgo = new Date(today.getTime() - 7 * DAY_MS);
  const twoWeeksAgo = new Date(today.getTime() - 14 * DAY_MS);
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const upcomingLimit = new Date(today.getTime() + 14 * DAY_MS);

  const [
    { data: projects },
    { data: episodesRaw },
    { data: clients },
    { data: invoices },
    { data: expenses },
    { data: activity },
    { data: stagesRaw },
    { data: notifications },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, progress, cover_image_url, updated_at, created_at, delivery_date")
      .eq("company_id", companyId)
      .eq("archived", false)
      .order("updated_at", { ascending: false }),
    supabase.from("episodes").select("id, project_id, status, created_at").eq("company_id", companyId),
    supabase.from("clients").select("id, created_at").eq("company_id", companyId),
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
  ]);

  const allProjects = projects ?? [];
  const episodes = episodesRaw ?? [];
  const allClients = clients ?? [];
  const allInvoices = invoices ?? [];
  const allExpenses = expenses ?? [];
  const activityItems = activity ?? [];
  const stages = stagesRaw ?? [];

  // ── إحصاءات الأسبوع (وفيات جديدة خلال آخر 7 أيام) ──────────────────────
  const projectsThisWeek = allProjects.filter((p) => new Date(p.created_at) >= weekAgo).length;
  const clientsThisWeek = allClients.filter((c) => new Date(c.created_at) >= weekAgo).length;

  const inProgressCount = allProjects.filter((p) => p.status === "in_progress").length;
  const pendingApprovalCount = episodes.filter((e) => e.status === "ready_for_approval").length;

  // ── المالية: هذا الشهر مقابل الشهر الماضي ───────────────────────────────
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

  const monthLabels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    monthLabels.push(monthKey(new Date(today.getFullYear(), today.getMonth() - i, 1)));
  }
  const revenueSpark = monthLabels.map((k) => revenueByMonth[k] ?? 0);
  const expensesSpark = monthLabels.map((k) => expensesByMonth[k] ?? 0);
  const profitSpark = monthLabels.map((_, i) => revenueSpark[i] - expensesSpark[i]);

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
    .filter((i) => (i.status === "unpaid" || i.status === "overdue") && i.due_date && i.due_date < today.toISOString().slice(0, 10))
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const overdueProjects = allProjects.filter(
    (p) =>
      p.delivery_date &&
      p.delivery_date < today.toISOString().slice(0, 10) &&
      !["completed", "delivered", "cancelled"].includes(p.status)
  ).length;

  // ── اتجاه النشاط آخر 7 أيام ───────────────────────────────────────────
  const trendPoints = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today.getTime() - (6 - i) * DAY_MS);
    const nextDay = new Date(day.getTime() + DAY_MS);
    const count = activityItems.filter((a) => {
      const t = new Date(a.created_at);
      return t >= day && t < nextDay;
    }).length;
    return { label: day.toLocaleDateString("ar", { day: "numeric", month: "numeric" }), value: count };
  });

  // ── توزيع المشاريع حسب الحالة ───────────────────────────────────────────
  const statusSegments = PROJECT_STATUSES.filter((s) => s.value !== "archived").map((s) => ({
    label: s.label,
    value: allProjects.filter((p) => p.status === s.value).length,
    color: s.color,
  }));

  // ── عدد الحلقات لكل مشروع (لصف تقدّم المشاريع) ─────────────────────────
  const episodeCountByProject: Record<string, number> = {};
  for (const e of episodes) {
    episodeCountByProject[e.project_id] = (episodeCountByProject[e.project_id] ?? 0) + 1;
  }

  const stats = [
    {
      label: "إجمالي المشاريع",
      value: allProjects.length,
      delta: projectsThisWeek > 0 ? `+${projectsThisWeek} هذا الأسبوع` : null,
      icon: "projects" as const,
      color: "#8B5CF6",
    },
    {
      label: "قيد التنفيذ",
      value: inProgressCount,
      icon: "clock" as const,
      color: "#F59E0B",
    },
    {
      label: "بانتظار الاعتماد",
      value: pendingApprovalCount,
      icon: "shield" as const,
      color: "#06B6D4",
    },
    {
      label: "العملاء",
      value: allClients.length,
      delta: clientsThisWeek > 0 ? `+${clientsThisWeek} هذا الأسبوع` : null,
      icon: "clients" as const,
      color: "#10B981",
    },
    {
      label: "صافي الربح هذا الشهر",
      value: `${profitThisMonth.toLocaleString()} ر.س`,
      delta: (() => {
        const pct = pctChange(profitThisMonth, profitLastMonth);
        return pct === null ? null : `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% عن الشهر الماضي`;
      })(),
      deltaTone: profitThisMonth >= profitLastMonth ? ("up" as const) : ("down" as const),
      icon: "money" as const,
      color: "var(--gold)" as string,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
          مرحباً {session?.profile.full_name || ""} 👋
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>نظرة عامة على أداء شركتك</p>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }} className="dashboard-charts-row">
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>النشاط الأسبوعي</h3>
          <ActivityTrendChart points={trendPoints} />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>حالة المشاريع</h3>
          <StatusDonut segments={statusSegments} centerLabel="مشروع" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="dashboard-mid-row">
        <FinanceSummaryCard
          rows={[
            { label: "الإيرادات المحصّلة", amount: revenueThisMonth, changePct: pctChange(revenueThisMonth, revenueLastMonth), color: "#22C55E", spark: revenueSpark },
            { label: "المصروفات", amount: expensesThisMonth, changePct: pctChange(expensesThisMonth, expensesLastMonth), color: "#EF4444", spark: expensesSpark },
            { label: "صافي الربح", amount: profitThisMonth, changePct: pctChange(profitThisMonth, profitLastMonth), color: "var(--gold)", spark: profitSpark },
          ]}
        />
        <RecentProjectsCard
          projects={allProjects.slice(0, 5).map((p) => ({ id: p.id, name: p.name, cover_image_url: p.cover_image_url, progress: p.progress }))}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="dashboard-widgets-row">
        <UpcomingTasksCard
          tasks={stages
            .filter((s) => s.episode)
            .map((s) => {
              const episode = Array.isArray(s.episode) ? s.episode[0] : s.episode;
              const project = episode ? (Array.isArray(episode.project) ? episode.project[0] : episode.project) : null;
              return {
                id: s.id,
                label: s.label,
                due_date: s.due_date as string,
                projectId: episode?.project_id ?? "",
                episodeId: episode?.id ?? "",
                projectName: project?.name ?? "",
              };
            })}
        />
        <RecentActivityCard
          items={activityItems.slice(0, 8).map((a) => {
            const actor = Array.isArray(a.actor) ? a.actor[0] : a.actor;
            return {
              id: a.id,
              action: a.action,
              actor_name: actor?.full_name ?? null,
              created_at: a.created_at,
              projectId: a.project_id,
            };
          })}
        />
        <ImportantNotificationsCard
          notifications={notifications ?? []}
          pendingApprovals={pendingApprovalCount}
          overdueInvoicesAmount={overdueInvoicesAmount}
          overdueProjects={overdueProjects}
        />
        <QuickActionsGrid />
      </div>

      {allProjects.length === 0 ? (
        <div className="empty-state card">
          <p>لا توجد مشاريع بعد</p>
          <Link href="/projects" className="btn btn-gold" style={{ marginTop: 14 }}>
            <Icon name="plus" size={16} /> إنشاء أول مشروع
          </Link>
        </div>
      ) : (
        <ProjectProgressRow
          projects={allProjects.slice(0, 8).map((p) => ({
            id: p.id,
            name: p.name,
            cover_image_url: p.cover_image_url,
            progress: p.progress,
            episodeCount: episodeCountByProject[p.id] ?? 0,
          }))}
        />
      )}
    </div>
  );
}
