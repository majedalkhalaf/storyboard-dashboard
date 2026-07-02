"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { DEFAULT_EPISODE_STAGES } from "@/app/lib/constants";

export default function EpisodeFormModal({
  projectId,
  nextNumber,
  nextSortOrder,
  onClose,
  onCreated,
}: {
  projectId: string;
  nextNumber: number;
  nextSortOrder: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const { userId, company } = useSession();
  const companyId = company!.id;

  const [number, setNumber] = useState<string>(String(nextNumber));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
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
        const path = `${companyId}/covers/${crypto.randomUUID()}-${coverFile.name}`;
        const { error: upErr } = await supabase.storage.from("public-assets").upload(path, coverFile, { upsert: false });
        if (!upErr) coverUrl = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
      }

      const { data: episode, error: eErr } = await supabase
        .from("episodes")
        .insert({
          project_id: projectId,
          company_id: companyId,
          number: number ? Number(number) : null,
          title: title.trim(),
          description: description.trim() || null,
          type: type.trim() || null,
          status: "not_started",
          cover_image_url: coverUrl,
          sort_order: nextSortOrder,
          created_by: userId,
        })
        .select("id")
        .single();
      if (eErr) throw eErr;

      const stageRows = DEFAULT_EPISODE_STAGES.map((s, i) => ({
        episode_id: episode.id,
        company_id: companyId,
        key: s.key,
        label: s.label,
        status: "pending" as const,
        progress: 0,
        sort_order: i,
      }));
      await supabase.from("episode_stages").insert(stageRows);

      await logActivity(supabase, {
        companyId,
        projectId,
        episodeId: episode.id,
        action: "episode_created",
        details: { title: title.trim(), number: number ? Number(number) : null },
      });

      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر إنشاء الحلقة");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>حلقة جديدة</h2>
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
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>الرقم</label>
              <input type="number" className="input-field" value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>النوع</label>
              <input className="input-field" value={type} onChange={(e) => setType(e.target.value)} placeholder="مثال: مقابلة" />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>العنوان *</label>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الحلقة" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>الوصف</label>
            <textarea className="input-field" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} />
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

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 14 }}>
          سيتم إنشاء {DEFAULT_EPISODE_STAGES.length} مراحل تنفيذ افتراضية لهذه الحلقة.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            إلغاء
          </button>
          <button className="btn btn-gold" onClick={create} disabled={saving}>
            {saving ? "جارٍ الإنشاء..." : "إنشاء الحلقة"}
          </button>
        </div>
      </div>
    </div>
  );
}
