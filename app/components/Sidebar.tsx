"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "الرئيسية", icon: "dashboard" },
  { href: "/projects", label: "المشاريع", icon: "projects" },
  { href: "/clients", label: "العملاء", icon: "clients" },
  { href: "/finance", label: "المالية", icon: "finance", adminOnly: true },
  { href: "/invoices", label: "الفواتير", icon: "invoices", adminOnly: true },
  { href: "/contracts", label: "العقود", icon: "contracts", adminOnly: true },
  { href: "/proposals", label: "العروض", icon: "proposals", adminOnly: true },
  { href: "/export", label: "التصدير", icon: "export" },
  { href: "/equipment", label: "المعدات", icon: "equipment" },
  { href: "/templates", label: "القوالب", icon: "templates" },
  { href: "/team", label: "الفريق", icon: "team", adminOnly: true },
  { href: "/settings", label: "الإعدادات", icon: "settings" },
];

export function useNavItems() {
  const { profile } = useSession();
  return NAV_ITEMS.filter((item) => !item.adminOnly || isInternalAdmin(profile.role));
}

export default function Sidebar() {
  const pathname = usePathname();
  const { company } = useSession();
  const items = useNavItems();

  return (
    <aside
      className="desktop-sidebar"
      style={{
        width: "var(--sidebar-width)",
        minWidth: "var(--sidebar-width)",
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "18px 12px",
      }}
    >
      <div className="logo-wrap" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 20px" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            color: "#0A0A0B",
            flexShrink: 0,
          }}
        >
          {(company?.name || "ن").charAt(0)}
        </div>
        <div>
          <div className="logo-title" style={{ fontWeight: 800, fontSize: 14 }}>
            {company?.name || "نظام إدارة الإنتاج"}
          </div>
          <div className="logo-sub" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            لوحة التحكم
          </div>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, overflowY: "auto" }}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className={`sidebar-link${active ? " active" : ""}`}>
              <Icon name={item.icon} size={18} className="nav-icon" />
              <span className="sidebar-text">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
