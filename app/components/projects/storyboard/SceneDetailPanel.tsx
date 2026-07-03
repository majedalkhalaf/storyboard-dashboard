"use client";

import { useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { STORYBOARD_SCENE_STATUSES, SHOT_TYPES } from "@/app/lib/constants";
import type { StoryboardSceneStatus } from "@/app/lib/types";
import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";
import { formatDuration } from "../utils";
import CameraSetupSection from "./CameraSetupSection";
import DirectorNotesSection from "./DirectorNotesSection";
import SceneAttachmentsSection from "./SceneAttachmentsSection";
import SceneNotesSection from "./SceneNotesSection";
import SceneCastSection from "./SceneCastSection";
import SceneEquipmentSection from "./SceneEquipmentSection";

export default function SceneDetailPanel({
  scene,
  onChanged,
  onRefetch,
  onDelete,
}: {
  scene: StoryboardSceneFullDetail;
  onChanged: (patch: Partial<StoryboardSceneFullDetail>) => void;
  onRefetch: () => void;
  onDelete: () => void;
}) {
  const supabase = createClient();
  const { company } = useSession();
  const companyId = company!.id;

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(scene.title);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const status = STORYBOARD_SCENE_STATUSES.find((s) => s.value === scene.status);

  async function patch(fields: Record<string, unknown>, localPatch: Partial<StoryboardSceneFullDetail>) {
    onChanged(localPatch);
    await supabase.from("storyboard_scenes").update(fields).eq("id", scene.id);
  }

  async function saveTitle() {
    setEditingTitle(false);
    if (title.trim() && title.trim() !== scene.title) await patch({ title: title.trim() }, { title: title.trim() });
  }

  async function changeStatus(next: string) {
    const patchData: Partial<StoryboardSceneFullDetail> = { status: next as StoryboardSceneStatus };
    if (next === "shot" || next === "approved") patchData.progress = 100;
    await patch({ status: next, ...(patchData.progress != null ? { progress: patchData.progress } : {}) }, patchData);
  }

  async function uploadCover(file: File | null) {
    if (!file) return;
    setUploadingCover(true);
    try {
      const path = `${companyId}/storyboard/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: false });
      if (!error) {
        const url = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
        await patch({ cover_image_url: url }, { cover_image_url: url });
      }
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            height: 220,
            position: "relative",
            background: scene.cover_image_url
              ? `center/cover no-repeat url(${scene.cover_image_url})`
              : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!scene.cover_image_url && <Icon name="image" size={34} className="text-muted" />}
          <label className="btn btn-outline" style={{ position: "absolute", bottom: 10, left: 10, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
            <Icon name="upload" size={13} /> {uploadingCover ? "جارٍ الرفع..." : "تغيير الصورة"}
            <input ref={coverInputRef} type="file" accept="image/*" hidden disabled={uploadingCover} onChange={(e) => uploadCover(e.target.files?.[0] ?? null)} />
          </label>
          <button className="btn btn-danger" style={{ position: "absolute", top: 10, left: 10, padding: "6px 10px" }} title="حذف المشهد" onClick={onDelete}>
            <Icon name="trash" size={13} />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              {editingTitle ? (
                <input
                  className="input-field"
                  value={title}
                  autoFocus
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                  style={{ fontSize: 18, fontWeight: 800, maxWidth: 400 }}
                />
              ) : (
                <h2 style={{ fontSize: 18, fontWeight: 800, cursor: "text", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setEditingTitle(true)}>
                  {scene.number != null && <span style={{ color: "var(--gold)" }}>{String(scene.number).padStart(2, "0")} ·</span>} {title}
                  <Icon name="edit" size={13} className="text-muted" />
                </h2>
              )}
            </div>
            <select
              className="input-field"
              value={scene.status}
              onChange={(e) => changeStatus(e.target.value)}
              style={{ width: "auto", color: status?.color, fontWeight: 700, fontSize: 12 }}
            >
              {STORYBOARD_SCENE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>
              <span>نسبة الإنجاز</span>
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{Math.round(scene.progress)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              defaultValue={scene.progress}
              onMouseUp={(e) => patch({ progress: Number((e.target as HTMLInputElement).value) }, { progress: Number((e.target as HTMLInputElement).value) })}
              onTouchEnd={(e) => patch({ progress: Number((e.target as HTMLInputElement).value) }, { progress: Number((e.target as HTMLInputElement).value) })}
              style={{ width: "100%" }}
            />
          </div>

          <FieldGroup>
            <TextField label="الوصف" multiline value={scene.description ?? ""} onSave={(v) => patch({ description: v || null }, { description: v || null })} />
            <TextField label="هدف اللقطة" multiline value={scene.shot_goal ?? ""} onSave={(v) => patch({ shot_goal: v || null }, { shot_goal: v || null })} />
          </FieldGroup>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 12 }}>
            <NumberField
              label="مدة اللقطة (ثانية)"
              value={scene.duration_seconds}
              display={formatDuration(scene.duration_seconds)}
              onSave={(v) => patch({ duration_seconds: v }, { duration_seconds: v })}
            />
            <SelectOrCustomField
              label="نوع اللقطة"
              value={scene.shot_type ?? ""}
              options={SHOT_TYPES}
              onSave={(v) => patch({ shot_type: v || null }, { shot_type: v || null })}
            />
            <TextField label="مكان التصوير" value={scene.location ?? ""} onSave={(v) => patch({ location: v || null }, { location: v || null })} />
            <DateField label="تاريخ التصوير" value={scene.shooting_date} onSave={(v) => patch({ shooting_date: v || null }, { shooting_date: v || null })} />
            <TimeField label="وقت التصوير" value={scene.shooting_time} onSave={(v) => patch({ shooting_time: v || null }, { shooting_time: v || null })} />
          </div>
        </div>
      </div>

      <CameraSetupSection scene={scene} onChanged={onChanged} />
      <DirectorNotesSection scene={scene} onChanged={onChanged} />
      <SceneCastSection scene={scene} onChanged={onRefetch} />
      <SceneEquipmentSection scene={scene} onChanged={onRefetch} />
      <SceneAttachmentsSection scene={scene} onChanged={onRefetch} />
      <SceneNotesSection scene={scene} onChanged={onRefetch} />
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>;
}

function TextField({ label, value, multiline, onSave }: { label: string; value: string; multiline?: boolean; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>{label}</label>
      {multiline ? (
        <textarea className="input-field" rows={3} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} style={{ resize: "vertical", fontSize: 13 }} />
      ) : (
        <input className="input-field" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} style={{ fontSize: 13 }} />
      )}
    </div>
  );
}

function NumberField({ label, value, display, onSave }: { label: string; value: number | null; display: string; onSave: (v: number | null) => void }) {
  const [v, setV] = useState(value != null ? String(value) : "");
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>
        {label} {display !== "—" && <span style={{ color: "var(--text-secondary)" }}>({display})</span>}
      </label>
      <input
        type="number"
        className="input-field"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const num = v ? Number(v) : null;
          if (num !== value) onSave(num);
        }}
        style={{ fontSize: 13 }}
      />
    </div>
  );
}

function DateField({ label, value, onSave }: { label: string; value: string | null; onSave: (v: string) => void }) {
  const [v, setV] = useState(value ?? "");
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>{label}</label>
      <input type="date" className="input-field" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (value ?? "") && onSave(v)} style={{ fontSize: 13 }} />
    </div>
  );
}

function TimeField({ label, value, onSave }: { label: string; value: string | null; onSave: (v: string) => void }) {
  const [v, setV] = useState(value ?? "");
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>{label}</label>
      <input type="time" className="input-field" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (value ?? "") && onSave(v)} style={{ fontSize: 13 }} />
    </div>
  );
}

function SelectOrCustomField({ label, value, options, onSave }: { label: string; value: string; options: string[]; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const listId = `shot-types-${label}`;
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>{label}</label>
      <input
        className="input-field"
        list={listId}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v)}
        style={{ fontSize: 13 }}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}
