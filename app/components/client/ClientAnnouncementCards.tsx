"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import VideoWithMuteToggle from "@/app/components/ui/VideoWithMuteToggle";
import { exportAnnouncementMediaZip, downloadAnnouncementMediaItem, type ExportProgress } from "@/app/lib/client-zip-export";
import { relativeTime } from "@/app/components/client/utils";
import type { BehindScenesMediaItem, ClientAnnouncement } from "@/app/lib/types";

// بطاقة خاصة (منفصلة تماماً عن المشاريع) تُظهر إعلاناً موجَّهاً لهذا العميل
// تحديداً — تظهر في أعلى الصفحة الرئيسية لبوابته فور إنشائها من الفريق.
export default function ClientAnnouncementCards({ announcements }: { announcements: ClientAnnouncement[] }) {
  const [open, setOpen] = useState<ClientAnnouncement | null>(null);

  if (announcements.length === 0) return null;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
        {announcements.map((a) => (
          <button
            key={a.id}
            onClick={() => setOpen(a)}
            className="card"
            style={{
              padding: 18,
              display: "flex",
              alignItems: "center",
              gap: 14,
              textAlign: "start",
              cursor: "pointer",
              border: "1px solid var(--gold)",
              background: "rgba(var(--gold-rgb),0.06)",
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--gold)",
                color: "#0A0A0B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="megaphone" size={20} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{a.title || "إعلان جديد"}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                {a.media.length > 0 ? `${a.media.length} عنصر مرفق · ` : ""}
                {relativeTime(a.created_at)}
              </div>
            </div>
            <span className="btn btn-gold" style={{ fontSize: 12.5, flexShrink: 0, pointerEvents: "none" }}>
              عرض الإعلان
            </span>
          </button>
        ))}
      </div>

      {open && <AnnouncementModal announcement={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function AnnouncementModal({ announcement, onClose }: { announcement: ClientAnnouncement; onClose: () => void }) {
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  async function handleDownloadAll() {
    if (downloadingAll) return;
    setDownloadingAll(true);
    try {
      await exportAnnouncementMediaZip(announcement.title || "إعلان", announcement.media, setProgress);
    } finally {
      setDownloadingAll(false);
      setProgress(null);
    }
  }

  async function handleDownloadItem(item: BehindScenesMediaItem) {
    if (downloadingUrl) return;
    setDownloadingUrl(item.url);
    try {
      await downloadAnnouncementMediaItem(item);
    } finally {
      setDownloadingUrl(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Icon name="megaphone" size={20} className="nav-icon" />
          <h3 style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>{announcement.title || "إعلان جديد"}</h3>
          <button className="btn btn-ghost" onClick={onClose} aria-label="إغلاق">
            <Icon name="close" size={18} />
          </button>
        </div>

        {announcement.media.length > 1 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn btn-gold" style={{ fontSize: 12.5 }} onClick={handleDownloadAll} disabled={downloadingAll}>
              <Icon name="archive" size={14} />
              {downloadingAll ? `${progress?.stage ?? "جارٍ التحميل..."} ${progress?.percent ?? 0}%` : "تحميل الكل"}
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {announcement.media.map((m) => (
            <div key={m.url} className="card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.name} style={{ width: "100%", height: "auto", maxHeight: "70vh", objectFit: "contain", borderRadius: 8, background: "#000" }} />
              ) : m.type === "video" ? (
                <VideoWithMuteToggle src={m.url} style={{ maxHeight: 420, borderRadius: 8, background: "#000" }} />
              ) : (
                <audio src={m.url} controls style={{ width: "100%" }} />
              )}
              <button
                className="btn btn-outline"
                style={{ fontSize: 12.5, alignSelf: "flex-start" }}
                onClick={() => handleDownloadItem(m)}
                disabled={downloadingUrl === m.url}
              >
                <Icon name="export" size={13} /> {downloadingUrl === m.url ? "جارٍ التحميل..." : "تحميل"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
