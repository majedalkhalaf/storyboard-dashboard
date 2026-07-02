"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Sidebar, { useNavItems } from "./Sidebar";
import BrandingProvider from "./BrandingProvider";
import AccountMenu from "./AccountMenu";
import NotificationsBell from "./NotificationsBell";
import { useSession } from "@/app/providers/SessionProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { theme } = useSession();
  const pathname = usePathname();
  const bottomItems = useNavItems().slice(0, 5);

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
            justifyContent: "flex-end",
            gap: 10,
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-secondary)",
          }}
        >
          <NotificationsBell />
          <AccountMenu />
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
