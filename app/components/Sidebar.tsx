"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import { createClient } from "@/app/lib/supabase/client";
import { USER_ROLE_LABELS } from "@/app/lib/constants";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: "dashboard" },
  { href: "/projects", label: "المشاريع", icon: "projects" },
  { href: "/episodes", label: "الحلقات", icon: "episodes" },
  { href: "/clients", label: "العملاء", icon: "clients" },
  { href: "/notifications", label: "الإشعارات", icon: "bell" },
  { href: "/files", label: "الملفات", icon: "files" },
  { href: "/notes", label: "الملاحظات", icon: "message" },
  { href: "/contracts", label: "العقود", icon: "contracts", adminOnly: true },
  { href: "/proposals", label: "العروض", icon: "proposals", adminOnly: true },
  { href: "/invoices", label: "الفواتير", icon: "invoices", adminOnly: true },
  { href: "/payments", label: "الدفعات", icon: "payments", adminOnly: true },
  { href: "/expenses", label: "المصروفات", icon: "expenses", adminOnly: true },
  { href: "/finance", label: "المالية", icon: "finance", adminOnly: true },
  { href: "/export", label: "التقارير", icon: "export" },
  { href: "/equipment", label: "المعدات", icon: "equipment" },
  { href: "/templates", label: "القوالب", icon: "templates" },
  { href: "/team", label: "الفريق", icon: "team", adminOnly: true },
  { href: "/settings", label: "الإعدادات", icon: "settings" },
];

export function useNavItems() {
  const { profile } = useSession();
  return NAV_ITEMS.filter((item) => !item.adminOnly || isInternalAdmin(profile.role));
}

// لا يوجد نظام باقات/فوترة فعلي بعد — هذا سقف مؤقت لعرض شريط الاستهلاك فقط
const STORAGE_QUOTA_BYTES = 20 * 1024 * 1024 * 1024;

function formatGB(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}

export default function Sidebar() {
  const pathname = usePathname();
  const { company, profile } = useSession();
  const items = useNavItems();
  const [usedBytes, setUsedBytes] = useState<number | null>(null);

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("files")
      .select("total:size_bytes.sum()")
      .eq("company_id", company.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setUsedBytes(Number((data as { total: number | null } | null)?.total ?? 0));
      });
    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  const usedPct = usedBytes !== null ? Math.min(100, Math.round((usedBytes / STORAGE_QUOTA_BYTES) * 100)) : 0;

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
            color: "#090909",
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

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, overflowY: "auto" }}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className={`sidebar-link${active ? " active" : ""}`}>
              <Icon name={item.icon} size={17} className="nav-icon" />
              <span className="sidebar-text" style={{ flex: 1 }}>
                {item.label}
              </span>
              <span className="sidebar-text" style={{ opacity: active ? 1 : 0.35, display: "inline-flex" }}>
                <Icon name="chevronLeft" size={13} />
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-stats card" style={{ padding: 14, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
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
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              (profile.full_name || "?").charAt(0)
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile.full_name || "بدون اسم"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{USER_ROLE_LABELS[profile.role]}</div>
          </div>
        </div>

        <div className="sidebar-progress">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-muted)", marginBottom: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="storage" size={12} /> مساحة التخزين
            </span>
            <span>{usedPct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${usedPct}%` }} />
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 5 }}>
            {usedBytes !== null ? `${formatGB(usedBytes)} GB` : "..."} من {formatGB(STORAGE_QUOTA_BYTES)} GB
          </div>
        </div>
      </div>
    </aside>
  );
}
