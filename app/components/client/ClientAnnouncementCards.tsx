"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import ModalPortal from "@/app/components/ui/ModalPortal";
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

// بطاقة إعلانية متكاملة: رأس بعنوان الإعلان وزر دعوة قابل للتخصيص، يليه
// شبكة تعرض صورتين على الأقل من المرفقات مباشرة في واجهة البطاقة (بلا
// إطار أسود — الصورة تملأ إطارها بالكامل)، مع مؤشر عدد على آخر خانة إن
// وُجدت مرفقات إضافية بدل تمرير أفقي. فتح البطاقة يعرض كل المرفقات كاملة.
function AnnouncementBanner({ announcement: a, onOpen }: { announcement: ClientAnnouncement; onOpen: () => void }) {
  const shown = a.media.slice(0, 2);
  const remaining = a.media.length - shown.length;

  return (
    <div
      className="announcement-banner"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        border: "1px solid var(--gold)",
        boxShadow: "0 8px 28px rgba(var(--gold-rgb),0.18), inset 0 0 0 1px rgba(var(--gold-rgb),0.15)",
        background: "linear-gradient(135deg, #2a2110, #0A0A0B)",
      }}
    >
      <button
        onClick={onOpen}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "16px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "start",
        }}
      >
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
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{a.title || "إعلان جديد"}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
              {a.media.length > 0 ? `${a.media.length} عنصر مرفق · ` : ""}
              {relativeTime(a.created_at)}
            </div>
          </div>
        </div>
        <span className="btn btn-gold" style={{ fontSize: 12.5, flexShrink: 0, pointerEvents: "none" }}>
          {a.cta_label || "عرض"}
        </span>
      </button>

      {shown.length > 0 && (
        <div
          onClick={onOpen}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onOpen()}
          style={{
            display: "grid",
            gridTemplateColumns: shown.length === 1 ? "1fr" : "1fr 1fr",
            gap: 8,
            padding: "0 14px 14px",
            cursor: "pointer",
          }}
        >
          {shown.map((m, i) => {
            const isLast = i === shown.length - 1;
            return (
              <div
                key={m.url}
                style={{
                  position: "relative",
                  aspectRatio: shown.length === 1 ? "16 / 9" : "1 / 1",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#111",
                }}
              >
                {m.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : m.type === "video" ? (
                  <video src={m.url} autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
                    ملف صوتي
                  </div>
                )}
                {isLast && remaining > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.55)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 18,
                    }}
                  >
                    +{remaining}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
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
    <ModalPortal>
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
    </ModalPortal>
  );
}
