"use client";

import Icon, { type IconName } from "@/app/components/ui/Icon";

export interface TabDef<K extends string> {
  key: K;
  label: string;
  icon?: IconName;
  badge?: number;
}

export default function Tabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef<K>[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <div className="tabs-scroll" role="tablist" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className="btn-ghost"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 14px",
              borderRadius: 0,
              whiteSpace: "nowrap",
              borderBottom: isActive ? "2px solid var(--gold)" : "2px solid transparent",
              color: isActive ? "var(--gold)" : "var(--text-secondary)",
              fontWeight: isActive ? 700 : 500,
              fontSize: 13,
              transition: "color .15s, border-color .15s",
            }}
          >
            {t.icon && <Icon name={t.icon} size={15} />}
            {t.label}
            {typeof t.badge === "number" && t.badge > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 9,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isActive ? "var(--gold)" : "var(--bg-hover)",
                  color: isActive ? "#000" : "var(--text-muted)",
                }}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
