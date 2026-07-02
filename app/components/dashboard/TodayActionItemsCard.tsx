import Link from "next/link";
import Icon from "@/app/components/ui/Icon";

export interface ActionItem {
  id: string;
  label: string;
  meta: string;
  href: string;
  priority: "overdue" | "today" | "upcoming" | "attention";
}

const PRIORITY_COLOR: Record<ActionItem["priority"], string> = {
  overdue: "var(--danger)",
  today: "var(--warning)",
  upcoming: "var(--gold)",
  attention: "#3B82F6",
};

export default function TodayActionItemsCard({ items }: { items: ActionItem[] }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="tasks" size={16} className="text-muted" /> مهام اليوم
        </h3>
      </div>

      {items.length === 0 ? (
        <div className="empty-state" style={{ padding: 20 }}>
          <Icon name="checkCircle" size={26} className="text-muted" />
          <p style={{ marginTop: 8, fontSize: 13 }}>لا توجد مهام تحتاج انتباهك الآن</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: PRIORITY_COLOR[item.priority], flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.meta}</div>
              </div>
              <Icon name="chevronLeft" size={14} className="text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
