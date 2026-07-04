"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import VideoWithMuteToggle from "@/app/components/ui/VideoWithMuteToggle";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import type { BehindScenesMediaItem, BehindScenesMediaType, ProjectAnnouncement } from "@/app/lib/types";

function mediaType(file: File): BehindScenesMediaType {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

// قسم "إعلان للعميل" — عنصر إعلاني اختياري واحد لكل مشروع (عنوان + وسائط)
// يظهر في صفحة المشروع لدى العميل كتبويب مستقل، وليس مرتبطاً بأي حلقة. يمكن
// إنشاؤه أو تعديله أو إزالته بالكامل في أي وقت؛ وجوده وحده هو ما يحدد ظهوره
// للعميل — لا يوجد مفتاح مشاركة إضافي لأن الغرض منه أصلاً إعلامي/إعلاني.
export default function ProjectAnnouncementSection({ projectId, companyId }: { projectId: string; companyId: string }) {
  const [announcement, setAnnouncement] = useState<ProjectAnnouncement | null | undefined>(undefined);
  const [composerOpen, setComposerOpen] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("project_announcements").select("*").eq("project_id", projectId).maybeSingle();
    setAnnouncement((data as ProjectAnnouncement | null) ?? null);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل إعلان المشروع الحالي عند فتح القسم
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load مُعاد إنشاؤه كل عرض عمداً ليقرأ projectId الحالي دوماً
  }, [projectId]);

  async function deleteAnnouncement() {
    if (!confirm("إزالة الإعلان نهائياً؟ لن يظهر للعميل بعد ذلك.")) return;
    const supabase = createClient();
    await supabase.from("project_announcements").delete().eq("project_id", projectId);
    setAnnouncement(null);
  }

  if (announcement === undefined) return <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!announcement ? (
        <div className="empty-state" style={{ padding: 30 }}>
          <Icon name="megaphone" size={34} className="nav-icon" />
          <p style={{ marginTop: 10, fontSize: 13.5 }}>لا يوجد إعلان للعميل حالياً في هذا المشروع.</p>
          <button className="btn btn-gold" style={{ marginTop: 14 }} onClick={() => setComposerOpen(true)}>
            <Icon name="plus" size={15} /> إنشاء إعلان للعميل
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h4 style={{ fontSize: 15, fontWeight: 800 }}>{announcement.title || "إعلان بلا عنوان"}</h4>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={() => setComposerOpen(true)}>
                <Icon name="edit" size={14} /> تعديل
              </button>
              <button className="btn btn-outline" style={{ fontSize: 12.5, color: "#ef4444" }} onClick={deleteAnnouncement}>
                <Icon name="trash" size={14} /> إزالة الإعلان
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {announcement.media.map((m) =>
              m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={m.url} src={m.url} alt={m.name} style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 10, background: "#000" }} />
              ) : m.type === "video" ? (
                <VideoWithMuteToggle key={m.url} src={m.url} style={{ maxHeight: 420, borderRadius: 10, background: "#000" }} />
              ) : (
                <audio key={m.url} src={m.url} controls style={{ width: "100%" }} />
              )
            )}
          </div>
        </>
      )}

      {composerOpen && (
        <AnnouncementComposer
          companyId={companyId}
          projectId={projectId}
          existing={announcement ?? null}
          onClose={() => setComposerOpen(false)}
          onSaved={() => {
            setComposerOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AnnouncementComposer({
  companyId,
  projectId,
  existing,
  onClose,
  onSaved,
}: {
  companyId: string;
  projectId: string;
  existing: ProjectAnnouncement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useSession();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [media, setMedia] = useState<BehindScenesMediaItem[]>(existing?.media ?? []);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(fileList: FileList | File[]) {
    const supabase = createClient();
    for (const file of Array.from(fileList)) {
      setUploadingCount((c) => c + 1);
      try {
        const type = mediaType(file);
        const path = `${companyId}/announcements/${projectId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("public-assets").upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (uploadError) {
          setError("تعذّر رفع أحد الملفات");
          continue;
        }
        const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
        setMedia((prev) => [...prev, { type, url: data.publicUrl, name: file.name }]);
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }
  }

  function removeMedia(url: string) {
    setMedia((prev) => prev.filter((m) => m.url !== url));
  }

  async function submit() {
    if (!title.trim() && media.length === 0) {
      setError("أضف عنواناً أو وسائط على الأقل.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("project_announcements")
      .upsert({ project_id: projectId, company_id: companyId, title: title.trim() || null, media, created_by: profile.id }, { onConflict: "project_id" });
    setBusy(false);
    if (saveError) {
      setError("تعذّر حفظ الإعلان، حاول مرة أخرى.");
      return;
    }
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal-content" style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Icon name="megaphone" size={20} className="nav-icon" />
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>{existing ? "تعديل إعلان العميل" : "إنشاء إعلان للعميل"}</h3>
        </div>

        <input className="input-field" placeholder="عنوان الإعلان" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 14 }} />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? "var(--gold)" : "var(--border)"}`,
            borderRadius: 10,
            padding: 18,
            textAlign: "center",
            cursor: "pointer",
            background: dragActive ? "rgba(var(--gold-rgb),0.06)" : "var(--bg-secondary)",
            marginBottom: 10,
          }}
        >
          <Icon name="fileUp" size={22} className="nav-icon" />
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>اسحب وأفلت صوراً أو فيديو أو تسجيلاً صوتياً، أو اضغط للاختيار</p>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*" hidden onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
        </div>

        {uploadingCount > 0 && <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>جارٍ رفع {uploadingCount} ملف...</p>}

        {media.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {media.map((m) => (
              <div key={m.url} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-secondary)", borderRadius: 8, padding: "6px 10px" }}>
                <Icon name={m.type === "image" ? "image" : m.type === "video" ? "video" : "mic"} size={14} className="nav-icon" />
                <span style={{ fontSize: 12.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                <button className="btn btn-ghost" style={{ padding: "3px 6px" }} onClick={() => removeMedia(m.url)} aria-label="حذف">
                  <Icon name="close" size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 10, display: "flex", gap: 6, alignItems: "center" }}>
            <Icon name="alert" size={15} />
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={busy || uploadingCount > 0}>
            <Icon name="check" size={16} />
            {busy ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}
