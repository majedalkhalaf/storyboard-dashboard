"use client";

import { useEffect } from "react";
import Icon from "@/app/components/ui/Icon";

// نافذة منبثقة مشتركة تُعاد استخدامها عبر شاشات هذا النطاق (الإعدادات/الفريق/العملاء/المعدات/القوالب)
export default function Modal({
  title,
  onClose,
  children,
  maxWidth = 520,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>{title}</h3>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: 6, borderRadius: 8, cursor: "pointer", background: "none", border: "none", color: "var(--text-secondary)" }}>
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
        {footer && <div style={{ display: "flex", gap: 10, justifyContent: "flex-start", marginTop: 22 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>{label}</span>
      {children}
    </label>
  );
}
