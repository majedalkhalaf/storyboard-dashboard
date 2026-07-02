import Link from "next/link";
import Icon, { type IconName } from "@/app/components/ui/Icon";

const ACTIONS: { label: string; icon: IconName; href: string }[] = [
  { label: "مشروع جديد", icon: "projects", href: "/projects?new=1" },
  { label: "عرض المشاريع", icon: "clock", href: "/projects" },
  { label: "رفع ملف", icon: "upload", href: "/projects" },
  { label: "فاتورة جديدة", icon: "invoices", href: "/invoices" },
  { label: "عرض التقارير", icon: "export", href: "/export" },
  { label: "العملاء", icon: "clients", href: "/clients" },
];

export default function QuickActionsGrid() {
  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>إجراءات سريعة</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="card"
            style={{
              padding: "14px 10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "inherit",
              background: "var(--bg-secondary)",
            }}
          >
            <Icon name={a.icon} size={20} />
            <span style={{ fontSize: 12, fontWeight: 600, textAlign: "center" }}>{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
