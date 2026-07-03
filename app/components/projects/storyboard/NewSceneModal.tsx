"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { SHOT_TYPES } from "@/app/lib/constants";
import { safeStorageKey } from "@/app/lib/storage-path";

// إنشاء سريع — الحد الأدنى من الحقول (عنوان/رقم/نوع لقطة/مكان/غلاف)، وباقي التفاصيل
// (كاميرا/إخراج/طاقم/معدات...) تُملأ لاحقاً من لوحة تفاصيل المشهد. نفس فلسفة
// EpisodeFormModal ومعالج إنشاء المشروع: أنشئ بسرعة، فصّل لاحقاً.
export default function NewSceneModal({
  episodeId,
  nextNumber,
  onClose,
  onCreated,
}: {
  episodeId: string;
  nextNumber: number;
  onClose: () => void;
  onCreated: (sceneId: string) => void;
}) {
  const supabase = createClient();
  const { userId, company } = useSession();
  const companyId = company!.id;

  const [number, setNumber] = useState<string>(String(nextNumber));
  const [title, setTitle] = useState("");
  const [shotType, setShotType] = useState("");
  const [location, setLocation] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickCover(file: File | null) {
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  }

  async function create() {
    if (!title.trim()) {
      setError("العنوان مطلوب");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let coverUrl: string | null = null;
      if (coverFile) {
        const path = `${companyId}/storyboard/${safeStorageKey(coverFile.name)}`;
        const { error: upErr } = await supabase.storage.from("public-assets").upload(path, coverFile, { upsert: false });
        if (!upErr) coverUrl = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
      }

      const parsedNumber = number ? Number(number) : nextNumber;
      const { data, error: sErr } = await supabase
        .from("storyboard_scenes")
        .insert({
          company_id: companyId,
          episode_id: episodeId,
          number: parsedNumber,
          title: title.trim(),
          shot_type: shotType.trim() || null,
          location: location.trim() || null,
          cover_image_url: coverUrl,
          status: "planning",
          sort_order: parsedNumber,
          created_by: userId,
        })
        .select("id")
        .single();
      if (sErr) throw sErr;

      onCreated(data.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر إنشاء المشهد");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>مشهد جديد</h2>
          <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {error && (
          <div className="btn-danger" style={{ display: "block", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>الرقم</label>
              <input type="number" className="input-field" value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>العنوان *</label>
              <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المشهد" autoFocus />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>نوع اللقطة</label>
            <input
              className="input-field"
              list="new-scene-shot-types"
              value={shotType}
              onChange={(e) => setShotType(e.target.value)}
              placeholder="مثال: Wide Shot"
            />
            <datalist id="new-scene-shot-types">
              {SHOT_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>مكان التصوير</label>
            <input className="input-field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="مكان التصوير" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>صورة الغلاف</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {coverPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="غلاف" style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 8 }} />
              )}
              <label className="btn btn-outline" style={{ cursor: "pointer" }}>
                <Icon name="upload" size={14} /> اختر صورة
                <input type="file" accept="image/*" hidden onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            إلغاء
          </button>
          <button className="btn btn-gold" onClick={create} disabled={saving}>
            {saving ? "جارٍ الإنشاء..." : "إنشاء المشهد"}
          </button>
        </div>
      </div>
    </div>
  );
}
