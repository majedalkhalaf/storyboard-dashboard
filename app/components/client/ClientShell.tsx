"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import AccountMenu from "@/app/components/AccountMenu";
import ClientNotificationsBell from "@/app/components/client/ClientNotificationsBell";
import ClientTransferHub from "@/app/components/client/ClientTransferHub";
import { relativeTime } from "@/app/components/client/utils";
import { useSession } from "@/app/providers/SessionProvider";
import { startActivityTracking, trackPageView } from "@/app/lib/client-activity-tracker";

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

// القائمة الرئيسية لبوابة العميل — 6 وجهات فقط، بلا "الإعدادات" (انتقلت إلى
// قائمة الحساب أعلى الصفحة) وبلا تكرار وظيفي: "المشروع" الآن هو المكان الموحّد
// لكل ما يخص تقدّم المشروع (الحالة، نسبة الإنجاز، المراحل، الحلقات، المخرجات)
// بدل تشتيتها بين "مشاريعي"/"العمل الجاري"/"التقارير"/"الحلقات" كعناصر منفصلة —
// تلك الصفحات تبقى موجودة وتعمل (لا حذف فعلي)، فقط أُزيلت من القائمة المباشرة.
const NAV_ITEMS: NavItem[] = [
  { href: "/client", label: "الرئيسية", icon: "home" },
  { href: "/client/projects", label: "المشروع", icon: "projects" },
  { href: "/client/files", label: "الملفات", icon: "files" },
  { href: "/client/invoices", label: "الحسابات", icon: "payments" },
  { href: "/client/notes", label: "طلبات التعديل", icon: "edit" },
  { href: "/client/notifications", label: "الإشعارات", icon: "bell" },
];

// مجموعة ثانوية أقل استخداماً — تظهر بعد فاصل رفيع بدل الاختلاط بالوجهات
// الأساسية الست، بنفس فكرة الأقسام في تطبيقات مثل Linear وNotion.
const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/client/meetings", label: "الاجتماعات", icon: "calendar" },
  { href: "/client/support", label: "الدعم الفني", icon: "phone" },
];

const ALL_NAV_ITEMS = [...NAV_ITEMS, ...SECONDARY_NAV_ITEMS];

function isActive(pathname: string, href: string) {
  if (href === "/client") return pathname === "/client";
  return pathname === href || pathname.startsWith(href + "/");
}

// الشريط السفلي (الجوال) يتّسع لعدد محدود من التبويبات فقط قبل أن تتزاحم
// الأيقونات وتختفي أسماؤها — لذا يعرض أهم 4 وجهات مباشرة، وكل الباقي يظهر
// خلف تبويب "المزيد" الذي يفتح قائمة كاملة، بنفس فكرة القائمة الجانبية
// المنبثقة في لوحة الفريق الداخلي (MobileNavDrawer).
const BOTTOM_NAV_PRIMARY_HREFS = ["/client", "/client/projects", "/client/files", "/client/invoices"];

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
  const [moreOpen, setMoreOpen] = useState(false);

  // بدء تتبّع الجلسة مرة واحدة عند فتح بوابة العميل — ClientShell مُركَّب في
  // layout.tsx فلا يُعاد تركيبه بين تنقّلات الصفحات، فهذا الأثر يعمل مرة واحدة فقط.
  useEffect(() => {
    startActivityTracking();
  }, []);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  const primaryNavItems = BOTTOM_NAV_PRIMARY_HREFS.map((href) => ALL_NAV_ITEMS.find((item) => item.href === href)!);
  const moreNavItems = ALL_NAV_ITEMS.filter((item) => !BOTTOM_NAV_PRIMARY_HREFS.includes(item.href));
  const moreActive = moreNavItems.some((item) => isActive(pathname, item.href));

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
        <div className="logo-wrap" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "8px 8px 22px" }}>
          {brandCompany?.logo_url ? (
            // شعار الشركة يظهر بحجم كبير وبارز دائماً بأعلى بوابة العميل — بلا
            // إعادة إدخال أو رفع مرة أخرى، مصدره الوحيد صفحة إعدادات الشركة.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandCompany.logo_url}
              alt={brandCompany.name}
              style={{ maxWidth: "100%", maxHeight: 96, width: "auto", height: "auto", objectFit: "contain" }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
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
              <div>
                <div className="logo-title" style={{ fontWeight: 800, fontSize: 14 }}>
                  {brandCompany?.name || "بوابة العميل"}
                </div>
                <div className="logo-sub" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {brandCompany ? "بوابة العميل" : "متابعة مشاريعك"}
                </div>
              </div>
            </div>
          )}
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, overflowY: "auto" }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={`client-nav-link${active ? " active" : ""}`}>
                <Icon name={item.icon} size={18} className="nav-icon" />
                <span className="sidebar-text">{item.label}</span>
              </Link>
            );
          })}

          <div style={{ height: 1, background: "var(--border)", margin: "10px 4px" }} />

          {SECONDARY_NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={`client-nav-link${active ? " active" : ""}`}>
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

      <div className="flex-1 flex flex-col overflow-hidden" style={{ position: "relative" }}>
        {/* رأس كل صفحة — بلا شعار مكرَّر هنا؛ شعار الشركة الوحيد في واجهة
            البوابة هو شعار الشريط الجانبي أعلاه، بناءً على طلب صريح بعدم
            تكراره في أكثر من موضع. */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <ClientNotificationsBell />
            <AccountMenu />
          </div>
        </header>

        <main className="main-content flex-1 overflow-y-auto page-padding" style={{ padding: 24, background: "var(--bg-primary)", position: "relative", zIndex: 1 }}>
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

      {/* شريط تنقّل سفلي (الجوال) — 4 وجهات أساسية + "المزيد" لبقية القوائم */}
      <nav className="bottom-nav no-print">
        {primaryNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={`bottom-nav-item ${active ? "active" : ""}`}>
              <Icon name={item.icon} size={20} />
              <span className="nav-label-small">{item.label}</span>
            </Link>
          );
        })}
        <button type="button" className={`bottom-nav-item ${moreActive ? "active" : ""}`} onClick={() => setMoreOpen(true)}>
          <Icon name="more" size={20} />
          <span className="nav-label-small">المزيد</span>
        </button>
      </nav>

      {/* قائمة "المزيد" المنبثقة (الجوال) — تضم كل الوجهات غير الأساسية */}
      <div className={`mobile-nav-overlay${moreOpen ? " is-open" : ""}`} aria-hidden={!moreOpen}>
        <div className="mobile-nav-backdrop" onClick={() => setMoreOpen(false)} />
        <div className="mobile-nav-drawer">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 14px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>المزيد من الخيارات</div>
            <button type="button" className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={() => setMoreOpen(false)}>
              <Icon name="close" size={20} />
            </button>
          </div>
          <div style={{ padding: "10px 12px 16px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {moreNavItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className={`client-nav-link${active ? " active" : ""}`} onClick={() => setMoreOpen(false)}>
                  <Icon name={item.icon} size={18} className="nav-icon" />
                  <span className="sidebar-text">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <ClientTransferHub />
    </div>
  );
}
