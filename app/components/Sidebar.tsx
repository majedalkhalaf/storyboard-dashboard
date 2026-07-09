"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import { createClient } from "@/app/lib/supabase/client";
import { USER_ROLE_LABELS } from "@/app/lib/constants";
import { SIDEBAR_NAV } from "@/app/lib/sidebar-nav";
import SidebarNavList from "./SidebarNavList";

// يُستخدم في AppShell للشريط السفلي على الجوال — قائمة مسطّحة من كل الروابط الحقيقية
// (بدون تجميع، فالشريط السفلي مساحته محدودة أصلاً).
export function useNavItems() {
  const { profile } = useSession();
  const isAdmin = isInternalAdmin(profile.role);
  return SIDEBAR_NAV.flatMap((entry) => {
    if (entry.type === "link") return entry.adminOnly && !isAdmin ? [] : [entry];
    return entry.items.filter((it) => !it.adminOnly || isAdmin);
  });
}

function formatGB(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}

export default function Sidebar() {
  const pathname = usePathname();
  const { company, profile, sidebarCollapsed, toggleSidebarCollapsed } = useSession();
  const isAdmin = isInternalAdmin(profile.role);
  const [usedBytes, setUsedBytes] = useState<number | null>(null);
  const [hovering, setHovering] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("files")
      .select("size_bytes")
      .eq("company_id", company.id)
      .then(({ data }) => {
        if (!cancelled) setUsedBytes((data ?? []).reduce((sum, f) => sum + (f.size_bytes ?? 0), 0));
      });
    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  // الحالة الفعلية: مصغّرة دائماً إلا إذا مرّر المستخدم الماوس عليها (توسّع مؤقت)
  const effectiveCollapsed = sidebarCollapsed && !hovering;

  return (
    <aside
      className={`desktop-sidebar${sidebarCollapsed ? " is-collapsed" : ""}${hovering && sidebarCollapsed ? " is-hover-expanded" : ""}`}
      style={{
        width: effectiveCollapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
        minWidth: effectiveCollapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
        height: "100vh",
        position: sidebarCollapsed ? "relative" : "sticky",
        top: 0,
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "18px 12px",
        transition: "width 200ms ease, min-width 200ms ease",
        zIndex: hovering && sidebarCollapsed ? 40 : "auto",
        boxShadow: hovering && sidebarCollapsed ? "8px 0 24px rgba(0,0,0,0.4)" : "none",
      }}
      onMouseEnter={() => sidebarCollapsed && setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="logo-wrap" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 14px", justifyContent: effectiveCollapsed ? "center" : "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {company?.logo_url ? (
            // شعار الشركة الحقيقي بدل الحرف الأول دائماً — مصدره الوحيد صفحة
            // إعدادات الشركة، ويظهر بحجم أكبر عند فرد القائمة.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo_url}
              alt={company.name}
              style={{
                width: effectiveCollapsed ? 36 : 48,
                height: effectiveCollapsed ? 36 : 48,
                borderRadius: 10,
                objectFit: "contain",
                flexShrink: 0,
              }}
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
                color: "#090909",
                flexShrink: 0,
              }}
            >
              {(company?.name || "ن").charAt(0)}
            </div>
          )}
          {!effectiveCollapsed && (
            <div style={{ minWidth: 0 }}>
              <div className="logo-title" style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {company?.name || "نظام إدارة الإنتاج"}
              </div>
              <div className="logo-sub" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                لوحة التحكم
              </div>
            </div>
          )}
        </div>

        {!effectiveCollapsed && (
          <button type="button" className="sidebar-collapse-btn" title="طيّ القائمة" onClick={toggleSidebarCollapsed}>
            <Icon name="chevronRight" size={16} />
          </button>
        )}
      </div>

      {effectiveCollapsed && (
        <button type="button" className="sidebar-collapse-btn" title="فتح القائمة" onClick={toggleSidebarCollapsed} style={{ margin: "0 auto 10px" }}>
          <Icon name="chevronLeft" size={16} />
        </button>
      )}

      <SidebarNavList
        pathname={pathname}
        collapsed={effectiveCollapsed}
        isAdmin={isAdmin}
        expandedGroups={expandedGroups}
        onToggleGroup={(key) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))}
      />

      <div className="sidebar-stats card" style={{ padding: effectiveCollapsed ? 8 : 14, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: effectiveCollapsed ? 0 : 12, justifyContent: effectiveCollapsed ? "center" : "flex-start" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#090909",
              fontSize: 13,
              flexShrink: 0,
              overflow: "hidden",
            }}
            title={effectiveCollapsed ? profile.full_name ?? undefined : undefined}
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              (profile.full_name || "?").charAt(0)
            )}
          </div>
          {!effectiveCollapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {profile.full_name || "بدون اسم"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{USER_ROLE_LABELS[profile.role]}</div>
            </div>
          )}
        </div>

        {!effectiveCollapsed && (
          <div className="sidebar-progress">
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-muted)", marginBottom: 6 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="storage" size={12} /> مساحة التخزين
              </span>
              <span style={{ color: "var(--gold)", fontWeight: 700 }}>غير محدودة</span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
              {usedBytes !== null ? `${formatGB(usedBytes)} GB مستخدمة` : "..."}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
