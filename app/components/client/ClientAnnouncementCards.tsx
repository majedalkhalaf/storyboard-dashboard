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
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 22 }}>
        {announcements.map((a) => (
          <AnnouncementBanner key={a.id} announcement={a} onOpen={() => setOpen(a)} />
        ))}
      </div>

      {open && <AnnouncementModal announcement={open} onClose={() => setOpen(null)} />}
    </>
  );
}

// بانر إعلاني لامع بمعاينة حقيقية لأول وسيط مرفق (صورة أو فيديو) بدل أيقونة
// عامة — ما يجعله يلفت الانتباه فعلياً كإعلان، لا مجرد شريط نصي.
function AnnouncementBanner({ announcement: a, onOpen }: { announcement: ClientAnnouncement; onOpen: () => void }) {
  const preview = a.media[0];

  return (
    <button
      onClick={onOpen}
      className="announcement-banner"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: 0,
        minHeight: 128,
        borderRadius: 16,
        cursor: "pointer",
        textAlign: "start",
        border: "1px solid var(--gold)",
        boxShadow: "0 8px 28px rgba(var(--gold-rgb),0.18), inset 0 0 0 1px rgba(var(--gold-rgb),0.15)",
        background: "linear-gradient(135deg, #2a2110, #0A0A0B)",
      }}
    >
      {preview && (
        <div style={{ position: "absolute", inset: 0 }}>
          {preview.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt={preview.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : preview.type === "video" ? (
            <video src={preview.url} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,11,0.92) 15%, rgba(10,10,11,0.45) 60%, rgba(10,10,11,0.15))" }} />
        </div>
      )}

      {/* لمعة زجاجية قطرية أعلى البطاقة — تعطي الإحساس "اللامع" المطلوب دون تعقيد */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(115deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 22%, transparent 45%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, padding: 18, minHeight: 128 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: "var(--gold)",
              color: "#0A0A0B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
            }}
          >
            <Icon name="megaphone" size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>{a.title || "إعلان جديد"}</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {a.media.length > 0 ? `${a.media.length} عنصر مرفق · ` : ""}
              {relativeTime(a.created_at)}
            </div>
          </div>
        </div>
        <span className="btn btn-gold" style={{ fontSize: 12.5, flexShrink: 0, pointerEvents: "none" }}>
          عرض الإعلان
        </span>
      </div>
    </button>
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
