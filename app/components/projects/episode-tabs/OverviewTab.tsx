"use client";

import { useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { STAGE_STATUSES } from "@/app/lib/constants";
import type { EpisodeFullDetail } from "@/app/lib/episode-detail";
import { formatDate } from "../utils";

export default function OverviewTab({
  episode,
  onChanged,
}: {
  episode: EpisodeFullDetail;
  onChanged: (patch: Partial<EpisodeFullDetail>) => void;
}) {
  const supabase = createClient();
  const { company } = useSession();
  const companyId = company!.id;
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(episode.description ?? "");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  async function save() {
    setEditing(false);
    if (description !== (episode.description ?? "")) {
      await supabase.from("episodes").update({ description: description || null }).eq("id", episode.id);
      onChanged({ description: description || null });
    }
  }

  async function uploadCover(file: File | null) {
    if (!file) return;
    setCoverError(null);
    if (file.size > 20 * 1024 * 1024) {
      setCoverError("حجم الصورة كبير جداً (الحد الأقصى 20 ميجابايت)");
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }
    setUploadingCover(true);
    try {
      const path = `${companyId}/covers/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("public-assets").upload(path, file, { upsert: false });
      if (upErr) {
        setCoverError(upErr.message || "تعذّر رفع الصورة");
        return;
      }
      const url = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
      await supabase.from("episodes").update({ cover_image_url: url }).eq("id", episode.id);
      onChanged({ cover_image_url: url });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function removeCover() {
    await supabase.from("episodes").update({ cover_image_url: null }).eq("id", episode.id);
    onChanged({ cover_image_url: null });
  }

  const statItems = [
    { label: "الملفات", value: episode.files.length, icon: "attachment" as const },
    { label: "الملاحظات", value: episode.notes.length, icon: "message" as const },
    { label: "تعليقات الفيديو", value: episode.comments.length, icon: "video" as const },
    { label: "نسخ السكربت", value: episode.scriptVersions.length, icon: "fileCheck" as const },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>صورة الغلاف</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 140,
              height: 90,
              borderRadius: 10,
              flexShrink: 0,
              border: "1px solid var(--border)",
              background: episode.cover_image_url
                ? `center/cover no-repeat url(${episode.cover_image_url})`
                : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!episode.cover_image_url && <Icon name="video" size={22} className="text-muted" />}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="btn btn-outline" style={{ cursor: uploadingCover ? "wait" : "pointer", width: "fit-content" }}>
              <Icon name="upload" size={14} /> {uploadingCover ? "جارٍ الرفع..." : episode.cover_image_url ? "تغيير الصورة" : "إضافة صورة"}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                hidden
                disabled={uploadingCover}
                onChange={(e) => uploadCover(e.target.files?.[0] ?? null)}
              />
            </label>
            {episode.cover_image_url && (
              <button className="btn btn-ghost" style={{ width: "fit-content", padding: "6px 10px", fontSize: 12, color: "#ef4444" }} onClick={removeCover}>
                <Icon name="trash" size={13} /> إزالة الصورة
              </button>
            )}
            {coverError && <p style={{ fontSize: 12, color: "#ef4444" }}>{coverError}</p>}
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {statItems.map((s) => (
          <div key={s.label} className="stat-card">
            <Icon name={s.icon} size={18} className="text-muted" />
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>وصف الحلقة</h3>
          {!editing && (
            <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setEditing(true)}>
              <Icon name="edit" size={13} /> تعديل
            </button>
          )}
        </div>
        {editing ? (
          <div>
            <textarea className="input-field" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} autoFocus />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button className="btn btn-gold" style={{ padding: "8px 16px", fontSize: 13 }} onClick={save}>
                حفظ
              </button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: description ? "var(--text-primary)" : "var(--text-muted)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
            {description || "لا يوجد وصف."}
          </p>
        )}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>مراحل التنفيذ</h3>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{episode.stages.filter((s) => s.status === "completed").length}/{episode.stages.length} مكتملة</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {episode.stages.map((stage) => {
            const info = STAGE_STATUSES.find((s) => s.value === stage.status);
            return (
              <div key={stage.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, width: 120, flexShrink: 0, color: "var(--text-secondary)" }}>{stage.label}</span>
                <div className="progress-bar" style={{ height: 5, flex: 1 }}>
                  <div className="progress-fill" style={{ width: `${stage.progress}%`, background: info?.color }} />
                </div>
                <span className="chip" style={{ color: info?.color, borderColor: info?.color, fontSize: 10, flexShrink: 0 }}>
                  {info?.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>تواريخ</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
          <Meta icon="calendar" label="تاريخ التصوير" value={formatDate(episode.shooting_date)} />
          <Meta icon="calendar" label="تاريخ التسليم" value={formatDate(episode.delivery_date)} />
        </div>
      </div>
    </div>
  );
}

function Meta({ icon, label, value }: { icon: "calendar"; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
        <Icon name={icon} size={12} /> {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
