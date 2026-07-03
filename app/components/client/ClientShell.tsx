"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import AccountMenu from "@/app/components/AccountMenu";
import ClientNotificationsBell from "@/app/components/client/ClientNotificationsBell";
import { useSession } from "@/app/providers/SessionProvider";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/client", label: "الرئيسية", icon: "dashboard" },
  { href: "/client/invoices", label: "الحسابات", icon: "finance" },
  { href: "/client/reports", label: "التقارير", icon: "barChart" },
  { href: "/client/notifications", label: "التنبيهات", icon: "bell" },
  { href: "/client/settings", label: "الإعدادات", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/client") return pathname === "/client" || pathname.startsWith("/client/projects");
  return pathname === href || pathname.startsWith(href + "/");
}

export default function ClientShell({
  children,
  brandCompany,
}: {
  children: React.ReactNode;
  brandCompany?: { name: string; logo_url: string | null } | null;
}) {
  const { theme, profile } = useSession();
  const pathname = usePathname();

  return (
    <div
      className={`flex h-screen overflow-hidden ${theme === "light" ? "light" : ""}`}
      style={{ background: "var(--bg-primary)" }}
    >
      {/* الشريط الجانبي (سطح المكتب فقط) */}
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
          {brandCompany?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandCompany.logo_url}
              alt={brandCompany.name}
              style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
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
              {(brandCompany?.name || profile.full_name || "ع").charAt(0)}
            </div>
          )}
          <div>
            <div className="logo-title" style={{ fontWeight: 800, fontSize: 14 }}>
              {brandCompany?.name || "بوابة العميل"}
            </div>
            <div className="logo-sub" style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {brandCompany ? "بوابة العميل" : "متابعة مشاريعك"}
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, overflowY: "auto" }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={`sidebar-link${active ? " active" : ""}`}>
                <Icon name={item.icon} size={18} className="nav-icon" />
                <span className="sidebar-text">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-secondary)",
          }}
        >
          <ClientNotificationsBell />
          <AccountMenu />
        </header>

        <main className="main-content flex-1 overflow-y-auto page-padding" style={{ padding: 24, background: "var(--bg-primary)" }}>
          {children}
        </main>
      </div>

      {/* شريط تنقّل سفلي (الجوال) */}
      <nav className="bottom-nav no-print">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={`bottom-nav-item ${active ? "active" : ""}`}>
              <Icon name={item.icon} size={20} />
              <span className="nav-label-small">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
