import Icon from "@/app/components/ui/Icon";

interface NotifRow {
  id: string;
  title: string | null;
  message: string;
}

export default function ImportantNotificationsCard({
  notifications,
  pendingApprovals,
  overdueInvoicesAmount,
  overdueProjects,
}: {
  notifications: NotifRow[];
  pendingApprovals: number;
  overdueInvoicesAmount: number;
  overdueProjects: number;
}) {
  const items: { icon: "shield" | "invoices" | "clock"; color: string; title: string; subtitle: string }[] = [];

  if (pendingApprovals > 0) {
    items.push({
      icon: "shield",
      color: "#F59E0B",
      title: `${pendingApprovals} حلقات بانتظار الاعتماد`,
      subtitle: "تحتاج إلى مراجعة العميل",
    });
  }
  if (overdueInvoicesAmount > 0) {
    items.push({
      icon: "invoices",
      color: "#EF4444",
      title: `فواتير مستحقة`,
      subtitle: `إجمالي ${overdueInvoicesAmount.toLocaleString("en-US")} ر.س`,
    });
  }
  if (overdueProjects > 0) {
    items.push({
      icon: "clock",
      color: "#EF4444",
      title: `${overdueProjects} مشاريع متأخرة`,
      subtitle: "تجاوزت الجدول الزمني المحدد",
    });
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>إشعارات مهمة</h3>

      {items.length === 0 && notifications.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا توجد إشعارات مهمة الآن</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ color: it.color, background: `${it.color}1a`, padding: 6, borderRadius: 8, flexShrink: 0 }}>
                <Icon name={it.icon} size={14} />
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: it.color }}>{it.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{it.subtitle}</div>
              </div>
            </div>
          ))}
          {notifications.map((n) => (
            <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ color: "var(--gold)", background: "rgba(var(--gold-rgb),0.1)", padding: 6, borderRadius: 8, flexShrink: 0 }}>
                <Icon name="bell" size={14} />
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title ?? "إشعار"}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{n.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
