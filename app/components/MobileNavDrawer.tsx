"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import SidebarNavList from "./SidebarNavList";

export default function MobileNavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { company, profile } = useSession();
  const isAdmin = isInternalAdmin(profile.role);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  return (
    <div className={`mobile-nav-overlay${open ? " is-open" : ""}`} aria-hidden={!open}>
      <div className="mobile-nav-backdrop" onClick={onClose} />
      <div className="mobile-nav-drawer">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 34,
                height: 34,
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
            <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {company?.name || "نظام إدارة الإنتاج"}
            </div>
          </div>
          <button type="button" className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <div style={{ padding: "10px 12px 16px", flex: 1, overflowY: "auto" }}>
          <SidebarNavList
            pathname={pathname}
            collapsed={false}
            isAdmin={isAdmin}
            expandedGroups={expandedGroups}
            onToggleGroup={(key) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))}
            onNavigate={onClose}
          />
        </div>
      </div>
    </div>
  );
}
