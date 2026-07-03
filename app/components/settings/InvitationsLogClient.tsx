"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import type { Invitation, InvitationDeliveryMethod, InvitationStatus } from "@/app/lib/types";

// صف الدعوة كما يصل من صفحة الخادم — يضيف اسم المشروع واسم من أرسل الدعوة عبر join.
export interface InvitationRow extends Invitation {
  project: { name: string } | null;
  inviter: { full_name: string | null } | null;
}

const STATUS_META: Record<InvitationStatus, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "#EAB308" },
  sent: { label: "أُرسلت", color: "#6B7280" },
  opened: { label: "فُتحت", color: "#3B82F6" },
  accepted: { label: "قُبلت", color: "#1DB954" },
  failed: { label: "فشلت", color: "#EF4444" },
  expired: { label: "منتهية", color: "#F97316" },
  cancelled: { label: "ملغاة", color: "#94A3B8" },
};

const DELIVERY_META: Record<InvitationDeliveryMethod, { label: string; color: string; icon: "mail" | "link" | "message" | "phone" }> = {
  email: { label: "بريد إلكتروني", color: "var(--gold)", icon: "mail" },
  link: { label: "رابط مباشر", color: "#3B82F6", icon: "link" },
  whatsapp: { label: "واتساب", color: "#1DB954", icon: "message" },
  sms: { label: "رسالة نصية", color: "#06B6D4", icon: "phone" },
};

// تنسيق تاريخ + وقت — fmtDate في app/components/finance/format.ts يعرض التاريخ فقط
// بلا وقت، وسجل الدعوات يحتاج الوقت أيضاً (مثال: وقت الفتح بالدقيقة).
function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB");
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

function StatusChip({ status }: { status: InvitationStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="chip" style={{ color: meta.color, borderColor: meta.color }}>
      {meta.label}
    </span>
  );
}

function DeliveryChip({ method }: { method: InvitationDeliveryMethod }) {
  const meta = DELIVERY_META[method];
  return (
    <span className="chip" style={{ color: meta.color, borderColor: meta.color }}>
      <Icon name={meta.icon} size={12} /> {meta.label}
    </span>
  );
}

export default function InvitationsLogClient({ invitations }: { invitations: InvitationRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | "all">("all");
  const [methodFilter, setMethodFilter] = useState<InvitationDeliveryMethod | "all">("all");

  const stats = useMemo(() => {
    return {
      total: invitations.length,
      accepted: invitations.filter((i) => i.status === "accepted").length,
      failed: invitations.filter((i) => i.status === "failed").length,
      expired: invitations.filter((i) => i.status === "expired").length,
    };
  }, [invitations]);

  const filtered = useMemo(() => {
    return invitations.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (methodFilter !== "all" && i.delivery_method !== methodFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${i.email} ${i.project?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invitations, statusFilter, methodFilter, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            سجل الدعوات
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            سجل تدقيق كامل لكل دعوات العملاء المُرسلة — حالتها، وقت فتحها وقبولها، والجهاز المستخدم
          </p>
        </div>
        <Link href="/settings/invite-channels" className="btn btn-outline">
          <Icon name="arrowRight" size={16} /> قنوات إرسال الدعوات
        </Link>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
        <div className="stat-card">
          <span style={{ color: "var(--gold)", display: "inline-flex" }}>
            <Icon name="mail" size={20} />
          </span>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10 }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>إجمالي الدعوات</div>
        </div>
        <div className="stat-card">
          <span style={{ color: "#1DB954", display: "inline-flex" }}>
            <Icon name="checkCircle" size={20} />
          </span>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10, color: "#1DB954" }}>{stats.accepted}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>مقبولة</div>
        </div>
        <div className="stat-card">
          <span style={{ color: "#EF4444", display: "inline-flex" }}>
            <Icon name="alert" size={20} />
          </span>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10, color: "#EF4444" }}>{stats.failed}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>فشلت</div>
        </div>
        <div className="stat-card">
          <span style={{ color: "#F97316", display: "inline-flex" }}>
            <Icon name="clock" size={20} />
          </span>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10, color: "#F97316" }}>{stats.expired}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>منتهية</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
          <input
            className="input-field"
            placeholder="بحث بالبريد الإلكتروني أو اسم المشروع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingInlineStart: 38 }}
          />
          <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
            <Icon name="search" size={16} />
          </span>
        </div>
        <select
          className="input-field"
          style={{ width: "auto" }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvitationStatus | "all")}
        >
          <option value="all">كل الحالات</option>
          {(Object.keys(STATUS_META) as InvitationStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <select
          className="input-field"
          style={{ width: "auto" }}
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value as InvitationDeliveryMethod | "all")}
        >
          <option value="all">كل طرق الإرسال</option>
          {(Object.keys(DELIVERY_META) as InvitationDeliveryMethod[]).map((m) => (
            <option key={m} value={m}>
              {DELIVERY_META[m].label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="mail" size={32} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد دعوات مطابقة</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>البريد الإلكتروني</th>
                <th>المشروع</th>
                <th>طريقة الإرسال</th>
                <th>الحالة</th>
                <th>من أرسلها</th>
                <th>وقت الإرسال</th>
                <th>وقت الفتح</th>
                <th>وقت القبول</th>
                <th>وقت الانتهاء</th>
                <th>IP</th>
                <th>الجهاز</th>
                <th>المتصفح</th>
                <th>المحاولات</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>{inv.email}</td>
                  <td>{inv.project?.name ?? "—"}</td>
                  <td>
                    <DeliveryChip method={inv.delivery_method} />
                  </td>
                  <td>
                    <StatusChip status={inv.status} />
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{inv.inviter?.full_name ?? "—"}</td>
                  <td>{fmtDateTime(inv.sent_at)}</td>
                  <td>{fmtDateTime(inv.opened_at)}</td>
                  <td>{fmtDateTime(inv.accepted_at)}</td>
                  <td>{fmtDateTime(inv.expires_at)}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{inv.ip_address ?? "—"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{inv.device ?? "—"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{inv.browser ?? "—"}</td>
                  <td>{inv.retry_count}</td>
                  <td>
                    {inv.status === "failed" && inv.delivery_method === "email" && <RetryButton invitationId={inv.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// زر "إعادة الإرسال" — يظهر فقط لدعوات البريد الإلكتروني الفاشلة (نفس قيد
// app/api/invitations/[id]/retry/route.ts). يستدعي المسار الجاهز فعلاً ويعرض
// رسالة نجاح/فشل مؤقتة بجانبه، ثم يحدّث الصفحة عبر router.refresh() عند النجاح.
function RetryButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  async function retry() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/retry`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "تعذّرت إعادة الإرسال");
      setMessage({ success: true, text: "تم إرسالها من جديد" });
      router.refresh();
    } catch (e) {
      setMessage({ success: false, text: e instanceof Error ? e.message : "تعذّرت إعادة الإرسال" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
      <button className="btn btn-outline" style={{ fontSize: 11.5, padding: "6px 10px", whiteSpace: "nowrap" }} onClick={retry} disabled={loading}>
        <Icon name="retry" size={13} /> {loading ? "جارٍ الإرسال..." : "إعادة الإرسال"}
      </button>
      {message && (
        <span style={{ fontSize: 11, color: message.success ? "var(--success)" : "#EF4444" }}>{message.text}</span>
      )}
    </div>
  );
}
