"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import ZipExportButton from "@/app/components/ui/ZipExportButton";
import StageQuickSelect from "./StageQuickSelect";
import EditableTitle from "@/app/components/ui/EditableTitle";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { safeStorageKey } from "@/app/lib/storage-path";
import { updateEpisodeTitle, updateEpisodePipelineStage, updateEpisodeNumber } from "@/app/lib/episode-actions";
import { exportEpisodeZip } from "@/app/lib/zip-export";
import type { EpisodeGalleryItem } from "@/app/lib/episode-gallery";
import type { CompanyPipelineStage } from "@/app/lib/types";
import { formatDuration, relativeTime } from "./utils";

const iconBtnStyle: React.CSSProperties = { padding: "5px 6px", borderRadius: 7 };

function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const copy = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
}

export default function EpisodeGalleryCard({
  episode,
  active,
  onSelect,
  pipelineStages,
  onChanged,
  onDeleted,
  onDragStartHandle,
  onDragEndHandle,
  onCardDragOver,
  onCardDrop,
  dimmed,
}: {
  episode: EpisodeGalleryItem;
  active: boolean;
  onSelect: () => void;
  pipelineStages: CompanyPipelineStage[];
  onChanged: (patch: Partial<EpisodeGalleryItem>) => void;
  onDeleted: () => void;
  onDragStartHandle: () => void;
  onDragEndHandle: () => void;
  onCardDragOver: (e: React.DragEvent) => void;
  onCardDrop: (e: React.DragEvent) => void;
  dimmed: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const { company } = useSession();
  const companyId = company!.id;

  const [uploadingCover, setUploadingCover] = useState(false);
  const [editingNumber, setEditingNumber] = useState(false);
  const [numberDraft, setNumberDraft] = useState(String(episode.number ?? ""));
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  async function uploadCover(file: File | null) {
    if (!file) return;
    setUploadingCover(true);
    try {
      // نفس مسار/طريقة رفع صورة الغلاف المستخدمة في تبويب "نظرة عامة" (OverviewTab.tsx)
      // — bucket عام public-assets لأنها معاينة منخفضة الحساسية تحتاج رابطاً عاماً دائماً.
      const path = `${companyId}/covers/${safeStorageKey(file.name)}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: false });
      if (error) return;
      const url = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
      await supabase.from("episodes").update({ cover_image_url: url }).eq("id", episode.id);
      onChanged({ cover_image_url: url });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function saveNumber() {
    setEditingNumber(false);
    const trimmed = numberDraft.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && Number.isNaN(parsed)) return;
    if (parsed === episode.number) return;
    onChanged({ number: parsed });
    await updateEpisodeNumber(supabase, episode.id, parsed);
  }

  async function saveTitle(next: string) {
    const oldTitle = episode.title;
    onChanged({ title: next });
    await updateEpisodeTitle(supabase, { companyId, projectId: episode.project_id, episodeId: episode.id, oldTitle, newTitle: next });
  }

  async function saveStage(key: string) {
    const label = pipelineStages.find((s) => s.key === key)?.label ?? key;
    onChanged({ pipeline_stage: key });
    await updateEpisodePipelineStage(supabase, { companyId, projectId: episode.project_id, episodeId: episode.id, stageKey: key, stageLabel: label });
  }

  // تكرار الحلقة نفسها + مراحلها (episode_stages) داخل المشروع نفسه — لا تُنسخ
  // الملفات/الملاحظات/نسخ السكربت/الاعتمادات لأنها بيانات خاصة بنسخة العمل
  // الفعلية، وتعود الحلقة الجديدة لحالة "لم يبدأ" ونسبة إنجاز 0%.
  async function duplicateEpisode() {
    setDuplicating(true);
    try {
      const { data: original } = await supabase.from("episodes").select("*").eq("id", episode.id).single();
      if (!original) return;
      const { count } = await supabase.from("episodes").select("id", { count: "exact", head: true }).eq("project_id", episode.project_id);
      const rest = omit(original, ["id", "created_at", "updated_at"]);
      const { data: inserted, error } = await supabase
        .from("episodes")
        .insert({ ...rest, title: `${original.title} (نسخة)`, status: "not_started", progress: 0, number: null, sort_order: count ?? 0 })
        .select("id")
        .single();
      if (error || !inserted) return;

      const { data: stages } = await supabase.from("episode_stages").select("*").eq("episode_id", episode.id);
      if (stages && stages.length > 0) {
        const clones = stages.map((s) => ({ ...omit(s, ["id", "created_at", "updated_at"]), episode_id: inserted.id, status: "pending", progress: 0, started_at: null, completed_at: null }));
        await supabase.from("episode_stages").insert(clones);
      }

      await logActivity(supabase, { companyId, projectId: episode.project_id, episodeId: inserted.id, action: "episode_duplicated", details: { from: episode.id, title: original.title } });
      router.refresh();
    } finally {
      setDuplicating(false);
    }
  }

  async function deleteEpisode() {
    if (!confirm(`حذف الحلقة "${episode.title}" نهائياً؟ سيُحذف كل ما يرتبط بها من ملفات وملاحظات ونسخ سكربت — لا يمكن التراجع.`)) return;
    setDeleting(true);
    try {
      const { data: fileRows } = await supabase.from("files").select("storage_path, bucket_name").eq("episode_id", episode.id);
      const byBucket = new Map<string, string[]>();
      for (const f of fileRows ?? []) {
        if (!f.storage_path) continue;
        const bucket = f.bucket_name || "project-files";
        byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), f.storage_path]);
      }
      await Promise.all(
        [...byBucket.entries()].map(([bucket, paths]) =>
          bucket === "r2"
            ? fetch("/api/uploads/r2/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keys: paths }) })
            : supabase.storage.from(bucket).remove(paths)
        )
      );
      // حذف صف الحلقة نفسه يحذف تلقائياً (on delete cascade) كل الصفوف المرتبطة بها:
      // episode_stages وfiles وnotes وapprovals وepisode_script_versions — راجع
      // supabase/migrations/0001_init_multi_tenant.sql وsupabase/migrations/0010_episode_workspace_columns.sql.
      // الكائنات الفعلية في Storage لا تُحذف تلقائياً بالـ cascade، لذا حُذفت أعلاه يدوياً.
      await supabase.from("episodes").delete().eq("id", episode.id);
      await logActivity(supabase, {
        companyId,
        projectId: episode.project_id,
        episodeId: episode.id,
        action: "episode_deleted",
        details: { title: episode.title },
      });
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="card animate-fade-in"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      onDragOver={onCardDragOver}
      onDrop={onCardDrop}
      style={{
        display: "block",
        position: "relative",
        textAlign: "right",
        overflow: "hidden",
        cursor: "pointer",
        padding: 0,
        borderColor: active ? "var(--gold)" : "var(--border)",
        boxShadow: active ? "0 0 0 1px var(--gold)" : "none",
        opacity: dimmed ? 0.5 : 1,
        transition: "border-color .15s, box-shadow .15s, opacity .15s",
      }}
    >
      {episode.unreadCount > 0 && (
        <span
          title={`${episode.unreadCount} إشعار غير مقروء`}
          style={{
            position: "absolute",
            top: -6,
            insetInlineEnd: -6,
            zIndex: 2,
            background: "#ef4444",
            color: "#fff",
            fontSize: 10,
            fontWeight: 800,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            boxShadow: "0 0 0 2px var(--bg-primary)",
          }}
        >
          {episode.unreadCount > 9 ? "9+" : episode.unreadCount}
        </span>
      )}
      <div
        style={{
          height: 120,
          position: "relative",
          background: episode.cover_image_url
            ? `center/cover no-repeat url(${episode.cover_image_url})`
            : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!episode.cover_image_url && (
          <label
            className="btn btn-outline"
            style={{ cursor: uploadingCover ? "wait" : "pointer", fontSize: 11, padding: "6px 10px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon name="image" size={13} /> {uploadingCover ? "جارٍ الرفع..." : "إضافة صورة للحلقة"}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              hidden
              disabled={uploadingCover}
              onChange={(e) => uploadCover(e.target.files?.[0] ?? null)}
            />
          </label>
        )}

        <span
          draggable
          title="اسحب لإعادة الترتيب"
          onClick={(e) => e.stopPropagation()}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            onDragStartHandle();
          }}
          onDragEnd={(e) => {
            e.stopPropagation();
            onDragEndHandle();
          }}
          style={{
            position: "absolute",
            top: 8,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "2px 6px",
            borderRadius: 6,
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            cursor: "grab",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Icon name="grip" size={13} />
        </span>

        {editingNumber ? (
          <span onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 8, right: 8 }}>
            <input
              type="number"
              autoFocus
              className="input-field"
              value={numberDraft}
              onChange={(e) => setNumberDraft(e.target.value)}
              onBlur={saveNumber}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveNumber();
                if (e.key === "Escape") setEditingNumber(false);
              }}
              style={{ width: 62, fontSize: 11, padding: "2px 6px" }}
            />
          </span>
        ) : (
          <span
            className="chip chip-gold"
            title="تعديل رقم الحلقة"
            onClick={(e) => {
              e.stopPropagation();
              setNumberDraft(String(episode.number ?? ""));
              setEditingNumber(true);
            }}
            style={{ position: "absolute", top: 8, right: 8, fontSize: 11, cursor: "pointer" }}
          >
            {episode.number != null ? `حلقة ${episode.number}` : "بدون رقم"}
          </span>
        )}

        <span
          className="chip"
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            fontSize: 11,
            color: episode.stageBadge.color,
            borderColor: episode.stageBadge.color,
            background: "rgba(0,0,0,0.5)",
          }}
        >
          {episode.stageBadge.label}
        </span>
        {episode.duration_seconds != null && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              fontSize: 11,
              padding: "2px 7px",
              borderRadius: 6,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
            }}
          >
            {formatDuration(episode.duration_seconds)}
          </span>
        )}
        {episode.hasActiveApproval && (
          <span style={{ position: "absolute", bottom: 8, right: 8, color: "#1DB954" }} title="معتمدة">
            <Icon name="badgeCheck" size={20} filled />
          </span>
        )}
      </div>

      <div style={{ padding: 14 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ marginBottom: 2 }}>
          <EditableTitle value={episode.title} onSave={saveTitle} fontSize={14} maxWidth={220} />
        </div>

        {episode.description && (
          <p
            style={{
              fontSize: 11.5,
              color: "var(--text-muted)",
              marginBottom: 8,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {episode.description}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }} onClick={(e) => e.stopPropagation()}>
          <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>المرحلة:</span>
          <StageQuickSelect stages={pipelineStages} currentKey={episode.pipeline_stage} onChange={saveStage} size="sm" />
        </div>

        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
          {episode.type || "—"} · آخر تعديل {relativeTime(episode.updated_at)}
        </div>

        <div className="progress-bar" style={{ height: 5 }}>
          <div className="progress-fill" style={{ width: `${episode.progress}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, marginBottom: 10, fontSize: 11, color: "var(--text-muted)" }}>
          <span>{Math.round(episode.progress)}% مكتمل</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="user" size={11} /> {episode.assigned_to_name || "غير مسند"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Icon name="attachment" size={12} /> {episode.filesCount}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Icon name="message" size={12} /> {episode.notesCount}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Icon name="video" size={12} /> {episode.commentsCount}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Icon name="fileCheck" size={12} /> {episode.versionsCount}
          </span>
        </div>

        {/* اختصارات سريعة — كلها تفتح الحلقة على تبويبها الافتراضي (نظرة عامة) وليس تبويباً
            محدداً: القفز مباشرة لتبويب بعينه (السكربت/الملفات/الملاحظات...) يتطلب تعديل حالة
            tab داخل EpisodeWorkspace.tsx، وهو ملف مملوك لعمل آخر جارٍ على هذا الفرع وخارج
            نطاق هذه المهمة — إفصاح صريح بدل الإدّعاء بسلوك غير موجود فعلياً. */}
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
          <button className="btn-ghost" title="رفع ملف" onClick={onSelect} style={iconBtnStyle}>
            <Icon name="upload" size={13} />
          </button>
          <button className="btn-ghost" title="السكربت" onClick={onSelect} style={iconBtnStyle}>
            <Icon name="fileCheck" size={13} />
          </button>
          <button className="btn-ghost" title="ستوري بورد" onClick={onSelect} style={iconBtnStyle}>
            <Icon name="palette" size={13} />
          </button>
          <button className="btn-ghost" title="الملاحظات" onClick={onSelect} style={iconBtnStyle}>
            <Icon name="message" size={13} />
          </button>
          <button className="btn-ghost" title="الاعتماد" onClick={onSelect} style={iconBtnStyle}>
            <Icon name="badgeCheck" size={13} />
          </button>
          <ZipExportButton
            label="تصدير الحلقة ZIP"
            icon="archive"
            size="sm"
            run={(onProgress) => exportEpisodeZip(supabase, companyId, episode.id, onProgress)}
          />
          <button className="btn-ghost" title="تكرار الحلقة" disabled={duplicating} onClick={duplicateEpisode} style={{ ...iconBtnStyle, cursor: duplicating ? "wait" : "pointer" }}>
            <Icon name="copy" size={13} />
          </button>
          <button
            className="btn-ghost"
            title="حذف الحلقة"
            disabled={deleting}
            onClick={deleteEpisode}
            style={{ ...iconBtnStyle, color: "#ef4444", marginInlineStart: "auto", cursor: deleting ? "wait" : "pointer" }}
          >
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
