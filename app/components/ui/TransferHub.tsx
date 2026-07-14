"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";

// لوحة عائمة موحّدة (تنزيل بوابة العميل / رفع فريق العمل) — تُركَّب مرة واحدة في
// تخطيط الصفحة الجذري (ClientShell/AppShell) فتبقى ثابتة الظهور فوق كل الصفحات،
// بعكس أشرطة التقدّم المحلية السابقة التي كانت تختفي بمجرد الانتقال لقسم آخر أو
// الدخول لحلقة أخرى رغم استمرار العملية فعلياً في الخلفية. زر "×" هنا يُلغي
// العملية فعلياً (AbortController حقيقي) لا مجرد إخفاء الشريط.

export interface TransferHubItem {
  id: string;
  label: string;
  stage: string;
  percent: number;
  status: "active" | "success" | "error" | "cancelled";
  error?: string;
}

const STATUS_META: Record<TransferHubItem["status"], { icon: "checkCircle" | "close" | "clock"; color: string }> = {
  active: { icon: "clock", color: "var(--gold)" },
  success: { icon: "checkCircle", color: "var(--success)" },
  error: { icon: "close", color: "#ef4444" },
  cancelled: { icon: "close", color: "var(--text-muted)" },
};

export default function TransferHub({
  title,
  items,
  onCancel,
}: {
  title: string;
  items: TransferHubItem[];
  onCancel: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (items.length === 0) return null;

  const activeCount = items.filter((i) => i.status === "active").length;

  return (
    <div
      className="transfer-hub no-print"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 14px",
          background: "var(--bg-hover)",
          border: "none",
          cursor: "pointer",
          color: "var(--text-primary)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
          <span style={{ color: "var(--gold)", display: "flex" }}>
            <Icon name="archive" size={15} />
          </span>
          {title}
          {activeCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", background: "rgba(var(--gold-rgb),0.15)", borderRadius: 999, padding: "1px 8px" }}>
              {activeCount}
            </span>
          )}
        </span>
        <span style={{ display: "flex", transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <Icon name="chevronDown" size={15} className="nav-icon" />
        </span>
      </button>

      {!collapsed && (
        <div style={{ maxHeight: 280, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) => {
            const meta = STATUS_META[item.status];
            const clamped = Math.max(0, Math.min(100, item.percent));
            return (
              <div key={item.id} style={{ background: "var(--bg-primary)", borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: meta.color, flexShrink: 0, display: "flex" }}>
                    <Icon name={meta.icon} size={13} />
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 12.5,
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={item.label}
                  >
                    {item.label}
                  </span>
                  {item.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => onCancel(item.id)}
                      aria-label="إلغاء"
                      style={{ flexShrink: 0, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex" }}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  ) : (
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: meta.color, flexShrink: 0 }}>
                      {item.status === "success" ? "تمّ" : item.status === "cancelled" ? "أُلغي" : "فشل"}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.status === "error" && item.error ? item.error : item.stage}
                </div>
                <div style={{ height: 5, borderRadius: 4, background: "rgba(255,255,255,0.09)", overflow: "hidden", marginTop: 5 }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${clamped}%`,
                      borderRadius: 4,
                      background: item.status === "error" ? "#ef4444" : item.status === "cancelled" ? "var(--text-muted)" : "linear-gradient(90deg, var(--gold), #E8C067)",
                      transition: "width 0.25s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
