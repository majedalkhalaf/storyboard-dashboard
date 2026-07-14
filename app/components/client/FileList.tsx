"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { fileIconName, formatBytes } from "@/app/components/client/utils";
import { trackFileDownload } from "@/app/lib/client-activity-tracker";
import { openUrl, downloadWithProgress } from "@/app/lib/download";
import { exportEpisodeFilesZip, type ExportProgress } from "@/app/lib/client-zip-export";
import DownloadProgressBar from "@/app/components/client/DownloadProgressBar";
import type { ClientPermissions, ProjectFile } from "@/app/lib/types";

// قائمة الملفات المرئية للعميل مع زر تحميل/فتح لكل ملف، بالإضافة لإمكانية تحديد
// عدة ملفات (أو "تحديد الكل") وتنزيلها دفعة واحدة كملف ZIP واحد — تُحمَّل
// الملفات المخزّنة داخلياً عبر مسار موقّع من السيرفر (يتحقق من الصلاحيات ويعيد
// رابطاً مؤقتاً)، وتصدير ZIP يعيد استخدام نفس آلية التصدير المعتمدة أصلاً لتصدير
// ملفات الحلقة (تنزيل متزامن + تقدّم بايت حقيقي).
export default function FileList({
  files,
  permissions,
  emptyLabel = "لا توجد ملفات متاحة حالياً.",
  zipTitle = "الملفات المحددة",
}: {
  files: ProjectFile[];
  permissions: ClientPermissions;
  emptyLabel?: string;
  zipTitle?: string;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [progressById, setProgressById] = useState<Record<string, number>>({});
  const [errorId, setErrorId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<ExportProgress | null>(null);
  const [zipError, setZipError] = useState(false);
  const canDownload = permissions.download_files;

  async function handleOpen(file: ProjectFile) {
    setErrorId(null);
    // رابط خارجي: افتحه مباشرة
    if (file.external_url) {
      openUrl(file.external_url);
      return;
    }
    setLoadingId(file.id);
    setProgressById((prev) => ({ ...prev, [file.id]: 0 }));
    try {
      await downloadWithProgress(`/api/client-portal/files/${file.id}?download=1`, undefined, file.name, (loaded, total) =>
        setProgressById((prev) => ({ ...prev, [file.id]: total > 0 ? Math.round((loaded / total) * 100) : 0 }))
      );
      trackFileDownload(file.name, file.id, { projectId: file.project_id, episodeId: file.episode_id });
    } catch {
      setErrorId(file.id);
    } finally {
      setLoadingId(null);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === files.length ? new Set() : new Set(files.map((f) => f.id))));
  }

  async function downloadSelected() {
    const selected = files.filter((f) => selectedIds.has(f.id));
    if (selected.length === 0) return;
    setZipError(false);
    setZipping(true);
    setZipProgress({ stage: "جاري تجهيز الملفات...", percent: 0 });
    try {
      await exportEpisodeFilesZip(zipTitle, selected, setZipProgress);
      for (const file of selected) {
        if (!file.external_url) trackFileDownload(file.name, file.id, { projectId: file.project_id, episodeId: file.episode_id });
      }
    } catch {
      setZipError(true);
    } finally {
      setZipping(false);
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {canDownload && files.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selectedIds.size === files.length}
              onChange={toggleSelectAll}
              style={{ accentColor: "var(--gold)", width: 16, height: 16 }}
            />
            تحديد الكل ({files.length})
          </label>
          {selectedIds.size > 0 && (
            <button className="btn btn-gold" onClick={downloadSelected} disabled={zipping} style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="archive" size={15} />
              تحميل المحدد ({selectedIds.size}) كملف ZIP
            </button>
          )}
        </div>
      )}
      {zipping && zipProgress && <DownloadProgressBar stage={zipProgress.stage} percent={zipProgress.percent} />}
      {zipError && <div style={{ fontSize: 12.5, color: "#ef4444" }}>تعذّر تجميع الملفات المحددة — حاول مرة أخرى.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {files.map((file) => {
          const isLink = Boolean(file.external_url);
          const actionable = isLink || canDownload;
          return (
            <div key={file.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              {canDownload && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(file.id)}
                  onChange={() => toggleSelect(file.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ accentColor: "var(--gold)", width: 16, height: 16, flexShrink: 0 }}
                  aria-label={`تحديد ${file.name}`}
                />
              )}
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
                  {loadingId === file.id ? `جارٍ التنزيل... ${progressById[file.id] ?? 0}%` : isLink ? "رابط خارجي" : formatBytes(file.size_bytes) || "ملف"}
                  {errorId === file.id && <span style={{ color: "#ef4444" }}> — تعذّر الفتح</span>}
                </div>
                {loadingId === file.id && (
                  <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.09)", overflow: "hidden", marginTop: 5 }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${progressById[file.id] ?? 0}%`,
                        background: "linear-gradient(90deg, var(--gold), #E8C067)",
                        transition: "width 0.25s ease",
                      }}
                    />
                  </div>
                )}
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
    </div>
  );
}
