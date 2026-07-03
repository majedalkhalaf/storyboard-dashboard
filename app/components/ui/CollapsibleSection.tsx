"use client";

import { useState } from "react";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import { useSession } from "@/app/providers/SessionProvider";

/**
 * حالة الطي محفوظة في user_settings.extra.collapsed_sections (مفاتيح مسطّحة
 * "group:id")، عبر updateExtra (يدمج ولا يستبدل extra بالكامل). هذا الـ hook
 * يوفر isOpen/setOpen/openAll/closeAll لمجموعة أقسام واحدة (مثلاً صفحة المشروع
 * أو صفحة الحلقة)، كل قسم يحدَّد افتراضياً بحسب defaultOpen عند أول زيارة.
 */
export function useSectionCollapse(groupKey: string) {
  const { extra, updateExtra } = useSession();
  const collapsed = (extra.collapsed_sections as Record<string, boolean> | undefined) ?? {};

  function isOpen(sectionId: string, defaultOpen = true) {
    const key = `${groupKey}:${sectionId}`;
    return key in collapsed ? !collapsed[key] : defaultOpen;
  }

  function setOpen(sectionId: string, open: boolean) {
    const key = `${groupKey}:${sectionId}`;
    updateExtra({ collapsed_sections: { ...collapsed, [key]: !open } });
  }

  function openAll(sectionIds: string[]) {
    const next = { ...collapsed };
    sectionIds.forEach((id) => {
      next[`${groupKey}:${id}`] = false;
    });
    updateExtra({ collapsed_sections: next });
  }

  function closeAll(sectionIds: string[]) {
    const next = { ...collapsed };
    sectionIds.forEach((id) => {
      next[`${groupKey}:${id}`] = true;
    });
    updateExtra({ collapsed_sections: next });
  }

  return { isOpen, setOpen, openAll, closeAll };
}

export default function CollapsibleSection({
  groupKey,
  id,
  title,
  icon,
  badge,
  defaultOpen = true,
  actions,
  children,
}: {
  groupKey: string;
  id: string;
  title: string;
  icon?: IconName;
  badge?: number | string | null;
  defaultOpen?: boolean;
  /** أزرار إضافية تظهر في رأس القسم (يمين العنوان) دون التأثير على زر الطي */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { isOpen, setOpen } = useSectionCollapse(groupKey);
  const open = isOpen(id, defaultOpen);
  const [everOpened, setEverOpened] = useState(open);
  if (open && !everOpened) setEverOpened(true);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(id, !open)}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            background: "transparent",
            border: "none",
            textAlign: "right",
            padding: 0,
            color: "var(--text-primary)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
            {icon && (
              <span style={{ color: "var(--gold)", display: "inline-flex" }}>
                <Icon name={icon} size={16} />
              </span>
            )}
            {title}
            {badge != null && (
              <span className="chip" style={{ fontSize: 11 }}>
                {badge}
              </span>
            )}
          </span>
          <Icon name={open ? "chevronDown" : "chevronLeft"} size={16} className="text-muted" />
        </button>
      </div>

      {open && actions && (
        <div style={{ padding: "0 18px 12px", display: "flex", gap: 8, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}

      {everOpened && (
        <div style={{ display: open ? "block" : "none", padding: "0 18px 18px" }}>{children}</div>
      )}
    </div>
  );
}

/** زر عام "فتح الكل / طي الكل" لصفحة تحوي عدة CollapsibleSection من نفس groupKey */
export function ExpandCollapseAllButton({ groupKey, sectionIds }: { groupKey: string; sectionIds: string[] }) {
  const { openAll, closeAll } = useSectionCollapse(groupKey);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button type="button" className="btn btn-outline" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => openAll(sectionIds)}>
        <Icon name="chevronDown" size={13} /> فتح الكل
      </button>
      <button type="button" className="btn btn-outline" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => closeAll(sectionIds)}>
        <Icon name="chevronLeft" size={13} /> طي الكل
      </button>
    </div>
  );
}
