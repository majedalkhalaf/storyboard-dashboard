"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import AccountMenu from "@/app/components/AccountMenu";
import ClientNotificationsBell from "@/app/components/client/ClientNotificationsBell";
import { relativeTime } from "@/app/components/client/utils";
import { useSession } from "@/app/providers/SessionProvider";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export interface ActivityRailItem {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  at: string;
  projectId: string;
  episodeId?: string;
}

export interface ProjectManagerInfo {
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  email: string | null;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/client", label: "الرئيسية", icon: "dashboard" },
  { href: "/client/projects", label: "مشاريعي", icon: "projects" },
  { href: "/client/files", label: "الملفات والمستندات", icon: "files" },
  { href: "/client/episodes", label: "الحلقات والإنتاج", icon: "episodes" },
  { href: "/client/reports", label: "التقارير", icon: "barChart" },
  { href: "/client/invoices", label: "الحسابات", icon: "finance" },
  { href: "/client/notes", label: "الملاحظات", icon: "message" },
  { href: "/client/meetings", label: "الاجتماعات", icon: "calendar" },
  { href: "/client/notifications", label: "التنبيهات", icon: "bell" },
  { href: "/client/support", label: "الدعم الفني", icon: "phone" },
  { href: "/client/settings", label: "الإعدادات", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/client") return pathname === "/client";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function ClientShell({
  children,
  brandCompany,
  activity = [],
  projectManager,
  supportCompany,
}: {
  children: React.ReactNode;
  brandCompany?: { name: string; logo_url: string | null } | null;
  activity?: ActivityRailItem[];
  projectManager?: ProjectManagerInfo | null;
  supportCompany?: { name: string; phone: string | null; email: string | null } | null;
}) {
  const { theme, profile } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  function openActivity(a: ActivityRailItem) {
    router.push(a.episodeId ? `/client/projects/${a.projectId}/episodes/${a.episodeId}` : `/client/projects/${a.projectId}`);
  }

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

        {/* بطاقتا مدير المشروع والدعم الفني — أسفل القائمة الجانبية ثابتتان */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 10 }}>
          {projectManager && (
            <div className="card" style={{ padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                {projectManager.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={projectManager.avatarUrl} alt={projectManager.name} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="user" size={14} className="nav-icon" />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectManager.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>مسؤول مشروعك</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {projectManager.phone && (
                  <a href={`tel:${projectManager.phone}`} className="btn btn-outline" style={{ fontSize: 11, padding: "5px 8px", flex: 1, justifyContent: "center" }}>
                    <Icon name="phone" size={12} />
                  </a>
                )}
                {projectManager.phone && (
                  <a
                    href={`https://wa.me/${projectManager.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{ fontSize: 11, padding: "5px 8px", flex: 1, justifyContent: "center", background: "#25D366", color: "#fff" }}
                  >
                    <Icon name="phone" size={12} />
                  </a>
                )}
                {projectManager.email && (
                  <a href={`mailto:${projectManager.email}`} className="btn btn-outline" style={{ fontSize: 11, padding: "5px 8px", flex: 1, justifyContent: "center" }}>
                    <Icon name="mail" size={12} />
                  </a>
                )}
              </div>
            </div>
          )}

          {supportCompany && (supportCompany.phone || supportCompany.email) && (
            <Link href="/client/support" className="card" style={{ padding: 12, display: "block", textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>هل تحتاج إلى مساعدة؟</div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>فريق {supportCompany.name} متاح لمساعدتك</div>
            </Link>
          )}
        </div>
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

      {/* عمود النشاطات والمستجدات — ثابت عبر كل صفحات بوابة العميل (سطح المكتب فقط) */}
      {activity.length > 0 && (
        <aside
          className="desktop-activity-rail no-print"
          style={{
            width: 300,
            minWidth: 300,
            height: "100vh",
            position: "sticky",
            top: 0,
            background: "var(--bg-secondary)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            padding: "18px 14px",
            overflowY: "auto",
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>النشاطات والمستجدات</h3>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {activity.map((a) => (
              <button
                key={a.id}
                onClick={() => openActivity(a)}
                style={{
                  display: "flex",
                  gap: 9,
                  padding: "10px 4px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  color: "inherit",
                  textAlign: "start",
                  width: "100%",
                }}
              >
                <span style={{ color: a.color, background: `${a.color}1a`, borderRadius: 8, padding: 6, display: "inline-flex", flexShrink: 0, height: "fit-content" }}>
                  <Icon name={a.icon} size={13} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.subtitle}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{relativeTime(a.at)}</div>
                </div>
              </button>
            ))}
          </div>
          <Link href="/client" className="btn btn-outline" style={{ marginTop: 14, justifyContent: "center", fontSize: 12.5 }}>
            عرض جميع النشاطات
          </Link>
        </aside>
      )}

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
