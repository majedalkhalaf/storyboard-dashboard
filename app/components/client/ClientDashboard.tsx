"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import BehindScenesFeed, { type BehindScenesFeedPost } from "@/app/components/client/BehindScenesFeed";
import ProgressUpdatesPreview from "@/app/components/client/ProgressUpdatesPreview";
import type { ClientProgressUpdate } from "@/app/components/client/ProgressUpdateCard";
import PerformanceRing from "@/app/components/dashboard/PerformanceRing";
import StatCard from "@/app/components/dashboard/StatCard";
import { createClient } from "@/app/lib/supabase/client";
import { formatCurrency, formatDate, relativeTime, projectStatusMeta } from "@/app/components/client/utils";
import type { ProjectStatus } from "@/app/lib/types";

export interface ClientProjectCard {
  id: string;
  name: string;
  code: string | null;
  type: string | null;
  status: ProjectStatus;
  cover_image_url: string | null;
  progress: number;
  delivery_date: string | null;
  updated_at: string;
  created_at: string;
  episodesTotal: number;
  episodesCompleted: number;
  finance: { projectValue: number; paid: number; remaining: number } | null;
  managerName: string | null;
  managerAvatarUrl: string | null;
  showProjectValue: boolean;
  showDeliveryDate: boolean;
}

type SortKey = "status" | "updated" | "progress" | "created";
type StatusFilter = "all" | "active" | "completed" | "archived" | "overdue";

// ترتيب افتراضي: قيد التنفيذ أولاً، ثم ما لم يبدأ، وأخيراً المكتمل/المسلَّم —
// حسب طلب العميل صراحة، بدل الاعتماد فقط على آخر تحديث.
const STATUS_RANK: Record<ProjectStatus, number> = {
  in_progress: 0,
  review: 1,
  planning: 2,
  completed: 3,
  delivered: 4,
  archived: 5,
  cancelled: 6,
};

// يستمع لأي إضافة/تعديل على مشاريع العميل (project_clients أو projects) ويعيد
// جلب بيانات الصفحة من الخادم فوراً — هذا ما يجعل مشروعاً جديداً يُضاف من
// لوحة الشركة يظهر هنا مباشرة دون تحديث يدوي أو إعادة تسجيل دخول.
function useClientProjectsRealtime(userId: string) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`client-projects:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_clients", filter: `client_user_id=eq.${userId}` }, () => router.refresh())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router مستقر عبر عمر المكوّن
  }, [userId]);
}

export default function ClientDashboard({
  firstName,
  userId,
  userName,
  cards,
  overallProgress,
  activeProjectsCount,
  episodesCompletedTotal,
  openNotesTotal,
  filesThisMonthCount,
  openMeetingRequestsCount,
  nextInvoice,
  financeTotals,
  behindScenesPosts,
  progressUpdates,
}: {
  firstName: string;
  userId: string;
  userName: string | null;
  cards: ClientProjectCard[];
  overallProgress: number;
  activeProjectsCount: number;
  episodesCompletedTotal: number;
  openNotesTotal: number;
  filesThisMonthCount: number;
  openMeetingRequestsCount: number;
  nextInvoice: { amount: number; due_date: string | null; projectName: string } | null;
  financeTotals: { value: number; paid: number; remaining: number } | null;
  behindScenesPosts: BehindScenesFeedPost[];
  progressUpdates: ClientProgressUpdate[];
}) {
  useClientProjectsRealtime(userId);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("status");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const today = new Date();
    let list = cards.filter((c) => {
      const q = query.trim().toLowerCase();
      return !q || c.name.toLowerCase().includes(q) || (c.code || "").toLowerCase().includes(q);
    });
    if (filter === "active") list = list.filter((c) => c.status === "in_progress" || c.status === "planning" || c.status === "review");
    if (filter === "completed") list = list.filter((c) => c.status === "completed" || c.status === "delivered");
    if (filter === "archived") list = list.filter((c) => c.status === "archived");
    if (filter === "overdue")
      list = list.filter((c) => c.delivery_date && new Date(c.delivery_date) < today && c.status !== "completed" && c.status !== "delivered");

    const sorted = [...list];
    if (sort === "status") sorted.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.updated_at.localeCompare(a.updated_at));
    if (sort === "updated") sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    if (sort === "progress") sorted.sort((a, b) => b.progress - a.progress);
    if (sort === "created") sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return sorted;
  }, [cards, query, sort, filter]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: "0 auto", overflowX: "hidden" }}>
      <div style={{ position: "relative", marginBottom: 22, padding: "6px 2px" }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -60,
            insetInlineStart: -40,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(var(--gold-rgb),0.22), transparent 70%)",
            filter: "blur(10px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 className="page-title-size" style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
            مرحباً {firstName} 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>هنا يمكنك متابعة جميع مشاريعك وحالة أعمالك لحظة بلحظة.</p>
        </div>
      </div>

      {/* بطاقات إحصائية مجمَّعة عبر كل المشاريع */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard label="نسبة الإنجاز الإجمالية" value={`${overallProgress}%`} icon="barChart" color="var(--gold)" />
        <StatCard label="المشاريع النشطة" value={activeProjectsCount} icon="projects" color="#3987e5" />
        <StatCard label="الحلقات المكتملة" value={episodesCompletedTotal} icon="checkCircle" color="var(--success)" />
        <StatCard label="طلبات التعديل المفتوحة" value={openNotesTotal} icon="edit" color="#F59E0B" />
        <StatCard label="ملفات هذا الشهر" value={filesThisMonthCount} icon="fileUp" color="#8B5CF6" />
        <StatCard label="طلبات اجتماع مفتوحة" value={openMeetingRequestsCount} icon="calendar" color="#06B6D4" />
      </div>

      {/* شريط أدوات: بحث، ترتيب، تصفية */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <input className="input-field" placeholder="بحث عن مشروع بالاسم أو الكود..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingInlineStart: 34 }} />
          <span style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
            <Icon name="search" size={15} />
          </span>
        </div>
        <select className="input-field" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value as StatusFilter)}>
          <option value="all">جميع الحالات</option>
          <option value="active">نشطة</option>
          <option value="completed">مكتملة</option>
          <option value="overdue">متأخرة</option>
          <option value="archived">مؤرشفة</option>
        </select>
        <select className="input-field" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="status">ترتيب حسب الحالة</option>
          <option value="updated">آخر تحديث</option>
          <option value="progress">نسبة الإنجاز</option>
          <option value="created">تاريخ الإنشاء</option>
        </select>
      </div>

      {/* معرض بطاقات المشاريع */}
      {filtered.length === 0 ? (
        <div className="card empty-state" style={{ marginBottom: 20 }}>
          <Icon name="projects" size={34} className="nav-icon" />
          <p style={{ marginTop: 10 }}>لا توجد مشاريع مطابقة.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18, marginBottom: 22 }}>
          {filtered.map((c) => (
            <ProjectCard key={c.id} card={c} />
          ))}
        </div>
      )}

      <BehindScenesFeed posts={behindScenesPosts} currentUserId={userId} currentUserName={userName} />
      {/* خط فاصل بين قسمي "الكواليس" و"العمل الجاري" — يظهر فقط حين يُعرض
          القسمان معاً، وإلا فلا داعي لخط يفصل قسماً واحداً عن فراغ. */}
      {behindScenesPosts.length > 0 && progressUpdates.length > 0 && (
        <div aria-hidden style={{ height: 2, background: "var(--gold)", opacity: 0.5, borderRadius: 2, margin: "20px 0" }} />
      )}
      <ProgressUpdatesPreview updates={progressUpdates} />

      {/* بطاقات مساندة */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {nextInvoice && (
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>الفاتورة القادمة</h3>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--gold)" }}>{formatCurrency(nextInvoice.amount)}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {nextInvoice.projectName} {nextInvoice.due_date ? `· تستحق ${formatDate(nextInvoice.due_date)}` : ""}
            </div>
            <Link href="/client/invoices" className="btn btn-outline" style={{ marginTop: 14, justifyContent: "center" }}>
              عرض جميع الفواتير
            </Link>
          </div>
        )}

        {openMeetingRequestsCount > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>الاجتماعات</h3>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{openMeetingRequestsCount}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>طلب اجتماع بانتظار رد فريق العمل</div>
            <Link href="/client/meetings" className="btn btn-outline" style={{ marginTop: 14, justifyContent: "center" }}>
              عرض جميع الاجتماعات
            </Link>
          </div>
        )}

        {financeTotals && (
          <div className="card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <PerformanceRing percent={financeTotals.value ? (financeTotals.paid / financeTotals.value) * 100 : 0} label="نسبة التحصيل" size={92} />
            <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 6 }}>
              <Row label="إجمالي قيمة المشاريع" value={formatCurrency(financeTotals.value)} />
              <Row label="إجمالي المدفوعات" value={formatCurrency(financeTotals.paid)} color="var(--success)" />
              <Row label="المتبقي" value={formatCurrency(financeTotals.remaining)} color="var(--gold)" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 700, color: color ?? "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function ProjectCard({ card }: { card: ClientProjectCard }) {
  const status = projectStatusMeta(card.status);
  return (
    <div className="card card-hover-lift" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 170, position: "relative", background: "#0A0A0B" }}>
        {card.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.cover_image_url} alt={card.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="video" size={30} className="text-muted" />
          </div>
        )}
        <span className="chip" style={{ position: "absolute", top: 10, insetInlineStart: 10, color: status.color, borderColor: status.color, background: "rgba(0,0,0,0.55)" }}>
          {status.label}
        </span>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>{card.name}</h3>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {card.code && <span>{card.code}</span>}
            {card.type && <span>· {card.type}</span>}
            <span>· تحديث {relativeTime(card.updated_at)}</span>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-secondary)", marginBottom: 5 }}>
            <span>نسبة الإنجاز</span>
            <span style={{ fontWeight: 800, color: "var(--gold)" }}>{Math.round(card.progress)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.round(card.progress)}%` }} />
          </div>
        </div>

        {card.episodesTotal > 0 && (
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="episodes" size={13} /> {card.episodesCompleted} من {card.episodesTotal}
            </span>
            {card.delivery_date && card.showDeliveryDate && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="calendar" size={13} /> {formatDate(card.delivery_date)}
              </span>
            )}
          </div>
        )}

        {card.finance && (
          <div style={{ display: "grid", gridTemplateColumns: card.showProjectValue ? "repeat(3, 1fr)" : "repeat(2, 1fr)", gap: 8, fontSize: 11, background: "var(--bg-hover)", borderRadius: 10, padding: 10 }}>
            {card.showProjectValue && (
              <div>
                <div style={{ color: "var(--text-muted)" }}>القيمة</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{formatCurrency(card.finance.projectValue)}</div>
              </div>
            )}
            <div>
              <div style={{ color: "var(--text-muted)" }}>المدفوع</div>
              <div style={{ fontWeight: 700, marginTop: 2, color: "var(--success)" }}>{formatCurrency(card.finance.paid)}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)" }}>المتبقي</div>
              <div style={{ fontWeight: 700, marginTop: 2, color: "var(--gold)" }}>{formatCurrency(card.finance.remaining)}</div>
            </div>
          </div>
        )}

        {card.managerName && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
            {card.managerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.managerAvatarUrl} alt={card.managerName} loading="lazy" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="user" size={12} className="nav-icon" />
              </div>
            )}
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>مدير المشروع: {card.managerName}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: card.managerName ? 0 : "auto" }}>
          <Link href={`/client/projects/${card.id}`} className="btn btn-gold" style={{ flex: 1, justifyContent: "center", fontSize: 12.5 }}>
            دخول المشروع
          </Link>
          <Link href={`/client/projects/${card.id}?tab=overview`} className="btn btn-outline" style={{ flex: 1, justifyContent: "center", fontSize: 12.5 }}>
            عرض التفاصيل
          </Link>
        </div>
      </div>
    </div>
  );
}
