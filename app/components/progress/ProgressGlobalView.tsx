"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import BeforeAfterSlider from "@/app/components/ui/BeforeAfterSlider";
import VideoWithMuteToggle from "@/app/components/ui/VideoWithMuteToggle";
import { createClient } from "@/app/lib/supabase/client";
import { PROGRESS_UPDATE_STAGES } from "@/app/lib/constants";
import { relativeTime } from "@/app/components/projects/utils";
import type { BehindScenesMediaType, ProgressUpdate, ProgressUpdateContentType, ProgressUpdateMediaItem, ProgressUpdateStage } from "@/app/lib/types";

interface ProjectOption {
  id: string;
  name: string;
}

interface EpisodeOption {
  id: string;
  project_id: string;
  title: string;
}

interface UpdateRow extends ProgressUpdate {
  author_name: string | null;
  project_name: string | null;
  episode_title: string | null;
}

function mediaType(file: File): BehindScenesMediaType {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

// النسخة الشاملة لكل المشاريع من قسم "العمل الجاري" — عنصر أساسي في القائمة
// الجانبية، يعرض تحديثات كل المشاريع مع شارة المشروع/الحلقة على كل بطاقة.
// نفس منطق النشر متعدد المشاريع المتّبع في الكواليس الشاملة: يمكن اختيار أكثر
// من مشروع فيُنشر التحديث نفسه لكل مشروع مستقلاً، وتحديد حلقة بعينها فقط
// عند اختيار مشروع واحد بالضبط.
export default function ProgressGlobalView({
  companyId,
  projects,
  episodes,
}: {
  companyId: string;
  projects: ProjectOption[];
  episodes: EpisodeOption[];
}) {
  const [updates, setUpdates] = useState<UpdateRow[] | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("progress_updates")
      .select("*, author:profiles!author_id(full_name), project:projects(name), episode:episodes(title)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
    const rows = ((data ?? []) as Record<string, unknown>[]).map((u) => ({
      ...(u as unknown as ProgressUpdate),
      author_name: one<{ full_name: string | null }>(u.author as never)?.full_name ?? null,
      project_name: one<{ name: string | null }>(u.project as never)?.name ?? null,
      episode_title: one<{ title: string | null }>(u.episode as never)?.title ?? null,
    })) as UpdateRow[];
    setUpdates(rows);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل تحديثات العمل الجاري الشاملة عند فتح الصفحة، النمط القياسي في هذا المشروع
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`progress-global:${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "progress_updates", filter: `company_id=eq.${companyId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load مُعاد إنشاؤه كل عرض عمداً ليقرأ companyId الحالي دوماً
  }, [companyId]);

  async function deleteUpdate(id: string) {
    if (!confirm("حذف هذا التحديث نهائياً؟")) return;
    const supabase = createClient();
    await supabase.from("progress_updates").delete().eq("id", id);
    load();
  }

  const filtered = (updates ?? []).filter((u) => !projectFilter || u.project_id === projectFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            العمل الجاري
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            كل تحديثات العمل الجاري عبر كل المشاريع
          </p>
        </div>
        <button className="btn btn-gold" onClick={() => setComposerOpen(true)}>
          <Icon name="plus" size={16} /> تحديث جديد
        </button>
      </div>

      <select className="input-field" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={{ width: "auto", minWidth: 180 }}>
        <option value="">كل المشاريع</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {composerOpen && (
        <UpdateComposer
          companyId={companyId}
          projects={projects}
          episodes={episodes}
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            setComposerOpen(false);
            load();
          }}
        />
      )}

      {!updates ? (
        <div className="skeleton" style={{ height: 160, borderRadius: 10 }} />
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="timeline" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد تحديثات عمل جارٍ بعد</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((u) => (
            <UpdateCard key={u.id} update={u} onDelete={() => deleteUpdate(u.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function UpdateCard({ update, onDelete }: { update: UpdateRow; onDelete: () => void }) {
  const stageMeta = PROGRESS_UPDATE_STAGES.find((s) => s.value === update.stage);
  const before = update.media.find((m) => m.label === "before") ?? update.media[0];
  const after = update.media.find((m) => m.label === "after") ?? update.media[1];

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
            {update.project_name && (
              <span className="chip chip-gold" style={{ fontSize: 10.5 }}>
                {update.project_name}
              </span>
            )}
            {stageMeta && (
              <span className="chip" style={{ fontSize: 10.5, color: stageMeta.color, borderColor: stageMeta.color }}>
                <Icon name={stageMeta.icon} size={11} /> {stageMeta.label}
              </span>
            )}
            {update.episode_title && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· {update.episode_title}</span>}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{update.author_name ?? "عضو الفريق"}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{relativeTime(update.created_at)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className="chip"
            style={{ fontSize: 10.5, color: update.shared_with_client ? "var(--success)" : "var(--text-muted)", borderColor: update.shared_with_client ? "var(--success)" : "var(--border)" }}
          >
            {update.shared_with_client ? "مشترك مع العميل" : "خاص بفريق العمل"}
          </span>
          <button className="btn btn-ghost" style={{ padding: "4px 6px" }} onClick={onDelete} aria-label="حذف">
            <Icon name="trash" size={14} className="text-muted" />
          </button>
        </div>
      </div>

      {update.title && <h4 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 6 }}>{update.title}</h4>}
      {update.description && <p style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: 12 }}>{update.description}</p>}

      {update.content_type === "comparison" && before && after ? (
        <BeforeAfterSlider before={before} after={after} />
      ) : (
        update.media.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {update.media.map((m) =>
              m.type === "video" ? (
                <VideoWithMuteToggle key={m.url} src={m.url} style={{ maxHeight: 300, borderRadius: 10, background: "#000" }} />
              ) : m.type === "audio" ? (
                <audio key={m.url} src={m.url} controls style={{ width: "100%" }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={m.url} src={m.url} alt={m.name} style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 10, background: "#000" }} />
              )
            )}
          </div>
        )
      )}
    </div>
  );
}

function UpdateComposer({
  companyId,
  projects,
  episodes,
  onClose,
  onCreated,
}: {
  companyId: string;
  projects: ProjectOption[];
  episodes: EpisodeOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<ProgressUpdateStage>("shooting");
  const [contentType, setContentType] = useState<ProgressUpdateContentType>("update");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [episodeId, setEpisodeId] = useState<string>("");
  const [shared, setShared] = useState(false);
  const [media, setMedia] = useState<ProgressUpdateMediaItem[]>([]);
  const [beforeItem, setBeforeItem] = useState<ProgressUpdateMediaItem | null>(null);
  const [afterItem, setAfterItem] = useState<ProgressUpdateMediaItem | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const singleProjectId = selectedProjectIds.length === 1 ? selectedProjectIds[0] : null;
  const availableEpisodes = singleProjectId ? episodes.filter((e) => e.project_id === singleProjectId) : [];

  function toggleProject(id: string) {
    setEpisodeId("");
    setSelectedProjectIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function uploadOne(file: File): Promise<ProgressUpdateMediaItem | null> {
    const supabase = createClient();
    const type = mediaType(file);
    const path = `${companyId}/progress-updates/global/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("public-assets").upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (uploadError) return null;
    const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
    return { type, url: data.publicUrl, name: file.name };
  }

  async function uploadFiles(fileList: FileList | File[]) {
    for (const file of Array.from(fileList)) {
      setUploadingCount((c) => c + 1);
      const item = await uploadOne(file);
      if (item) setMedia((prev) => [...prev, item]);
      else setError("تعذّر رفع أحد الملفات");
      setUploadingCount((c) => c - 1);
    }
  }

  async function uploadSingle(file: File, slot: "before" | "after") {
    setUploadingCount((c) => c + 1);
    const item = await uploadOne(file);
    if (item) {
      const labeled = { ...item, label: slot } as ProgressUpdateMediaItem;
      if (slot === "before") setBeforeItem(labeled);
      else setAfterItem(labeled);
    } else {
      setError("تعذّر رفع الملف");
    }
    setUploadingCount((c) => c - 1);
  }

  async function submit() {
    const finalMedia = contentType === "comparison" ? [beforeItem, afterItem].filter((m): m is ProgressUpdateMediaItem => Boolean(m)) : media;
    if (contentType === "comparison" && finalMedia.length < 2) {
      setError("أضف صورتين على الأقل: قبل وبعد.");
      return;
    }
    if (!title.trim() && !description.trim() && finalMedia.length === 0) {
      setError("أضف عنواناً أو وصفاً أو وسائط على الأقل.");
      return;
    }
    if (selectedProjectIds.length === 0) {
      setError("اختر مشروعاً واحداً على الأقل.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("progress_updates").insert(
      selectedProjectIds.map((projectId) => ({
        company_id: companyId,
        project_id: projectId,
        episode_id: singleProjectId === projectId ? episodeId || null : null,
        author_id: user?.id,
        title: title.trim() || null,
        description: description.trim() || null,
        stage,
        content_type: contentType,
        media: finalMedia,
        shared_with_client: shared,
      }))
    );
    setBusy(false);
    if (insertError) {
      setError("تعذّر نشر التحديث، حاول مرة أخرى.");
      return;
    }
    onCreated();
  }

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal-content" style={{ maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Icon name="barChart" size={20} className="nav-icon" />
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>تحديث عمل جارٍ جديد</h3>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>المشاريع (اختر واحداً أو أكثر)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 140, overflowY: "auto", padding: 4, border: "1px solid var(--border)", borderRadius: 8 }}>
            {projects.map((p) => {
              const checked = selectedProjectIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="chip"
                  style={{
                    cursor: "pointer",
                    background: checked ? "rgba(var(--gold-rgb),0.12)" : undefined,
                    borderColor: checked ? "var(--gold)" : undefined,
                    color: checked ? "var(--gold)" : undefined,
                  }}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleProject(p.id)} style={{ accentColor: "var(--gold)" }} />
                  {p.name}
                </label>
              );
            })}
          </div>
          {selectedProjectIds.length > 1 && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
              عند اختيار أكثر من مشروع يُنشر نفس التحديث بشكل مستقل في كل مشروع، دون تحديد حلقة.
            </p>
          )}
        </div>

        <input className="input-field" placeholder="عنوان التحديث (اختياري)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 10 }} />
        <textarea className="input-field" rows={3} placeholder="وصف مختصر لهذه المرحلة..." value={description} onChange={(e) => setDescription(e.target.value)} style={{ marginBottom: 10 }} />

        <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <select className="input-field" style={{ flex: "1 1 160px" }} value={stage} onChange={(e) => setStage(e.target.value as ProgressUpdateStage)}>
            {PROGRESS_UPDATE_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            className="input-field"
            style={{ flex: "1 1 160px" }}
            value={episodeId}
            onChange={(e) => setEpisodeId(e.target.value)}
            disabled={!singleProjectId || availableEpisodes.length === 0}
          >
            <option value="">مستوى المشروع العام</option>
            {availableEpisodes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button
            type="button"
            className="chip"
            onClick={() => setContentType("update")}
            style={{ cursor: "pointer", background: contentType === "update" ? "rgba(var(--gold-rgb),0.15)" : undefined, borderColor: contentType === "update" ? "var(--gold)" : undefined, color: contentType === "update" ? "var(--gold)" : undefined }}
          >
            تحديث عادي
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setContentType("comparison")}
            style={{ cursor: "pointer", background: contentType === "comparison" ? "rgba(var(--gold-rgb),0.15)" : undefined, borderColor: contentType === "comparison" ? "var(--gold)" : undefined, color: contentType === "comparison" ? "var(--gold)" : undefined }}
          >
            مقارنة قبل / بعد
          </button>
        </div>

        {contentType === "update" ? (
          <MultiDropzone onFiles={uploadFiles} media={media} onRemove={(url) => setMedia((prev) => prev.filter((m) => m.url !== url))} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <SingleDropzone label="قبل" item={beforeItem} onFile={(f) => uploadSingle(f, "before")} onRemove={() => setBeforeItem(null)} />
            <SingleDropzone label="بعد" item={afterItem} onFile={(f) => uploadSingle(f, "after")} onRemove={() => setAfterItem(null)} />
          </div>
        )}

        {uploadingCount > 0 && <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>جارٍ رفع {uploadingCount} ملف...</p>}

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} style={{ accentColor: "var(--gold)" }} />
          مشاركة مع العميل (تظهر في صفحة المشروع والصفحة الرئيسية لبوابة العميل)
        </label>

        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, marginTop: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <Icon name="alert" size={15} />
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={busy || uploadingCount > 0}>
            <Icon name="send" size={16} />
            {busy ? "جارٍ النشر..." : "نشر"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MultiDropzone({ onFiles, media, onRemove }: { onFiles: (files: FileList | File[]) => void; media: ProgressUpdateMediaItem[]; onRemove: (url: string) => void }) {
  const [dragActive, setDragActive] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
        }}
        onClick={() => ref.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? "var(--gold)" : "var(--border)"}`,
          borderRadius: 10,
          padding: 18,
          textAlign: "center",
          cursor: "pointer",
          background: dragActive ? "rgba(var(--gold-rgb),0.06)" : "var(--bg-secondary)",
        }}
      >
        <Icon name="fileUp" size={22} className="nav-icon" />
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>اسحب وأفلت صوراً أو فيديو، أو اضغط للاختيار</p>
        <input ref={ref} type="file" multiple accept="image/*,video/*" hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
      </div>
      {media.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {media.map((m) => (
            <div key={m.url} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, background: "var(--bg-secondary)", padding: "6px 10px", borderRadius: 8 }}>
              <Icon name="attachment" size={14} className="nav-icon" />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
              <button type="button" className="btn btn-ghost" style={{ padding: "2px 6px" }} onClick={() => onRemove(m.url)}>
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SingleDropzone({ label, item, onFile, onRemove }: { label: string; item: ProgressUpdateMediaItem | null; onFile: (f: File) => void; onRemove: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4, fontWeight: 700 }}>{label}</div>
      {item ? (
        <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000" }}>
          {item.type === "video" ? (
            <video src={item.url} style={{ width: "100%", height: 100, objectFit: "cover" }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.name} style={{ width: "100%", height: 100, objectFit: "cover" }} />
          )}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ position: "absolute", top: 4, insetInlineEnd: 4, padding: "2px 6px", background: "rgba(0,0,0,0.6)", color: "#fff" }}
            onClick={onRemove}
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => ref.current?.click()}
          style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: 16, textAlign: "center", cursor: "pointer", background: "var(--bg-secondary)", height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="fileUp" size={18} className="nav-icon" />
          <input ref={ref} type="file" accept="image/*,video/*" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
      )}
    </div>
  );
}
