"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar, { useNavItems } from "./Sidebar";
import BrandingProvider from "./BrandingProvider";
import AccountMenu from "./AccountMenu";
import NotificationsBell from "./NotificationsBell";
import Icon from "@/app/components/ui/Icon";
import { useSession } from "@/app/providers/SessionProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { theme } = useSession();
  const pathname = usePathname();
  const bottomItems = useNavItems().slice(0, 5);
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deferred to client only to avoid SSR/CSR date mismatch
    setToday(new Date().toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" }));
  }, []);

  return (
    <div
      className={`flex h-screen overflow-hidden ${theme === "light" ? "light" : ""}`}
      style={{ background: "var(--bg-primary)" }}
    >
      <BrandingProvider />
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-secondary)",
          }}
        >
          <div className="header-date" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {today}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/projects?new=1" className="btn btn-gold btn-sm-mobile">
              <Icon name="plus" size={16} /> <span className="header-new-project-label">مشروع جديد</span>
            </Link>
            <NotificationsBell />
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
    </div>
  );
}
