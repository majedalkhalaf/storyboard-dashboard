"use client";

import { useState } from "react";
import Link from "next/link";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import ClientInviteModal from "@/app/components/projects/ClientInviteModal";

interface ActionDef {
  icon: IconName;
  label: string;
  href?: string;
}

export default function ProjectQuickActions({ projectId }: { projectId: string }) {
  const [showInvite, setShowInvite] = useState(false);

  const actions: ActionDef[] = [
    { icon: "eye", label: "فتح المشروع", href: `/projects/${projectId}` },
    { icon: "edit", label: "تحرير", href: `/projects/${projectId}` },
    { icon: "userPlus", label: "دعوة العميل" },
    { icon: "contracts", label: "العقد", href: "/contracts" },
    { icon: "proposals", label: "العرض", href: "/proposals" },
    { icon: "invoices", label: "الفواتير", href: "/invoices" },
    { icon: "finance", label: "المالية", href: "/finance" },
    { icon: "files", label: "الملفات", href: `/files?project=${projectId}` },
    { icon: "export", label: "التقرير", href: `/export/project/${projectId}` },
    { icon: "settings", label: "الإعدادات", href: `/projects/${projectId}` },
  ];

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        {actions.map((a) =>
          a.href ? (
            <Link
              key={a.label}
              href={a.href}
              title={a.label}
              onClick={(e) => e.stopPropagation()}
              className="btn-ghost"
              style={{ padding: 7, borderRadius: 8, color: "var(--text-muted)" }}
            >
              <Icon name={a.icon} size={15} />
            </Link>
          ) : (
            <button
              key={a.label}
              title={a.label}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowInvite(true);
              }}
              className="btn-ghost"
              style={{ padding: 7, borderRadius: 8, color: "var(--text-muted)" }}
            >
              <Icon name={a.icon} size={15} />
            </button>
          )
        )}
      </div>

      {showInvite && (
        <div onClick={(e) => e.stopPropagation()}>
          <ClientInviteModal projectId={projectId} onClose={() => setShowInvite(false)} onInvited={() => setShowInvite(false)} />
        </div>
      )}
    </>
  );
}
