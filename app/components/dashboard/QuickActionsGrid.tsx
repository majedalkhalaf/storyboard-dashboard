import Link from "next/link";
import Icon, { type IconName } from "@/app/components/ui/Icon";

const ACTIONS: { label: string; icon: IconName; href: string }[] = [
  { label: "مشروع جديد", icon: "projects", href: "/projects?new=1" },
  { label: "حلقة جديدة", icon: "episodes", href: "/episodes?new=1" },
  { label: "رفع ملف", icon: "upload", href: "/files?new=1" },
  { label: "فاتورة جديدة", icon: "invoices", href: "/invoices" },
  { label: "عقد جديد", icon: "contracts", href: "/contracts" },
  { label: "إضافة عميل", icon: "clients", href: "/clients" },
  { label: "التقارير", icon: "export", href: "/export" },
  { label: "القوالب", icon: "templates", href: "/templates" },
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
