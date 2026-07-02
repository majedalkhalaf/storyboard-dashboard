"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { fileIconName, formatBytes } from "@/app/components/client/utils";
import type { ClientPermissions, ProjectFile } from "@/app/lib/types";

// قائمة الملفات المرئية للعميل مع زر تحميل/فتح. الملفات المخزّنة داخلياً
// تُحمَّل عبر مسار موقّع من السيرفر (يتحقق من الصلاحيات ويعيد رابطاً مؤقتاً).
export default function FileList({
  files,
  permissions,
  emptyLabel = "لا توجد ملفات متاحة حالياً.",
}: {
  files: ProjectFile[];
  permissions: ClientPermissions;
  emptyLabel?: string;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const canDownload = permissions.download_files;

  async function handleOpen(file: ProjectFile) {
    setErrorId(null);
    // رابط خارجي: افتحه مباشرة
    if (file.external_url) {
      window.open(file.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    setLoadingId(file.id);
    try {
      const res = await fetch(`/api/client-portal/files/${file.id}?download=1`);
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as { url?: string };
      if (json.url) {
        window.open(json.url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("no url");
      }
    } catch {
      setErrorId(file.id);
    } finally {
      setLoadingId(null);
    }
  }

  if (files.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 30 }}>
        <Icon name="attachment" size={30} className="nav-icon" />
        <p style={{ marginTop: 8, fontSize: 14 }}>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
      {files.map((file) => {
        const isLink = Boolean(file.external_url);
        const actionable = isLink || canDownload;
        return (
          <div key={file.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "var(--bg-hover)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "var(--gold)",
              }}
            >
              <Icon name={fileIconName(file.category)} size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {isLink ? "رابط خارجي" : formatBytes(file.size_bytes) || "ملف"}
                {errorId === file.id && <span style={{ color: "#ef4444" }}> — تعذّر الفتح</span>}
              </div>
            </div>
            {actionable ? (
              <button
                className="btn btn-outline"
                onClick={() => handleOpen(file)}
                disabled={loadingId === file.id}
                style={{ padding: "8px 10px", flexShrink: 0 }}
                aria-label={isLink ? "فتح" : "تحميل"}
              >
                <Icon name={isLink ? "link" : "export"} size={16} />
              </button>
            ) : (
              <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>عرض فقط</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
