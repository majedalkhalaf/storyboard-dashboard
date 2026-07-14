"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar, { useNavItems } from "./Sidebar";
import MobileNavDrawer from "./MobileNavDrawer";
import BrandingProvider from "./BrandingProvider";
import AccountMenu from "./AccountMenu";
import NotificationsBell from "./NotificationsBell";
import GlobalSearch from "./GlobalSearch";
import UploadTransferHub from "./UploadTransferHub";
import Icon from "@/app/components/ui/Icon";
import { useSession } from "@/app/providers/SessionProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, company } = useSession();
  const pathname = usePathname();
  const bottomItems = useNavItems().slice(0, 5);
  const [today, setToday] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deferred to client only to avoid SSR/CSR date mismatch
    setToday(new Date().toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long", day: "numeric", month: "long" }));
  }, []);

  return (
    <div
      className={`flex h-screen overflow-hidden ${theme === "light" ? "light" : ""}`}
      style={{ background: "var(--bg-primary)" }}
    >
      <BrandingProvider />
      <Sidebar />
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="no-print header-bar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-secondary)",
          }}
        >
          <button
            type="button"
            className="mobile-menu-btn btn-ghost"
            style={{ padding: 8, borderRadius: 8 }}
            onClick={() => setMobileNavOpen(true)}
            aria-label="فتح القائمة"
          >
            <Icon name="menu" size={20} />
          </button>

          <div className="header-date" style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {today}
          </div>

          <div className="header-search" style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <GlobalSearch />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/projects?new=1" className="btn btn-gold btn-sm-mobile">
              <Icon name="plus" size={16} /> <span className="header-new-project-label">مشروع جديد</span>
            </Link>
            <NotificationsBell />
            <Link href="/settings" className="header-company-badge btn btn-outline">
              <Icon name="company" size={15} />
              <span className="header-account-label">{company?.name || "الشركة"}</span>
              <Icon name="chevronDown" size={13} />
            </Link>
            <AccountMenu />
          </div>
        </header>

        <main className="main-content flex-1 overflow-y-auto page-padding" style={{ padding: 24, background: "var(--bg-primary)" }}>
          {children}
        </main>
      </div>

      <nav className="bottom-nav no-print">
        {bottomItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className={`bottom-nav-item ${active ? "active" : ""}`}>
              <span className="nav-label-small">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <UploadTransferHub />
    </div>
  );
}
