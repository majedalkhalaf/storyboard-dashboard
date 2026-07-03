"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import type { FileCategory, ProjectFile } from "@/app/lib/types";
import { FILE_CATEGORY_ICON, humanFileSize, inferCategory, relativeTime } from "./utils";

// تصنيفات الملفات كما هي فعلياً في قاعدة البيانات (لا تصنيفات وهمية جديدة) — تُستخدم هنا وفي AssetsTab.tsx
export const FILE_CATEGORY_LABEL: Record<FileCategory, string> = {
  image: "صورة",
  video: "فيديو",
  document: "مستند",
  audio: "صوت",
  archive: "أرشيف",
  link: "رابط",
  other: "أخرى",
};

export type PreviewKind = "image" | "video" | "pdf" | null;

// نوع المعاينة المدعومة داخل الصفحة (بقية الأنواع تُفتح بالطريقة القديمة في تبويب جديد)
export function previewKind(file: ProjectFile): PreviewKind {
  const type = (file.file_type ?? "").toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.category === "image" || type.startsWith("image/")) return "image";
  if (file.category === "video" || type.startsWith("video/")) return "video";
  if (type === "application/pdf" || ext === "pdf") return "pdf";
  return null;
}

export async function resolveFileUrl(supabase: SupabaseClient, file: ProjectFile, options?: { download?: boolean }): Promise<string | null> {
  if (file.external_url) return file.external_url;
  if (!file.storage_path) return null;
  const { data } = await supabase.storage
    .from("project-files")
    .createSignedUrl(file.storage_path, 300, options?.download ? { download: true } : undefined);
  return data?.signedUrl ?? null;
}

/** فتح الملف في تبويب جديد بدون إجبار التحميل — السلوك القديم لزر "فتح"، ويُستخدم أيضاً كبديل للمعاينة داخلياً للأنواع غير المدعومة */
export async function openFile(supabase: SupabaseClient, file: ProjectFile) {
  const url = await resolveFileUrl(supabase, file);
  if (url) window.open(url, "_blank");
}

/** تحميل فعلي يُجبر المتصفح على حفظ الملف بدل عرضه */
export async function downloadFile(supabase: SupabaseClient, file: ProjectFile) {
  const url = await resolveFileUrl(supabase, file, { download: true });
  if (url) window.open(url, "_blank");
}

export async function copyFileLink(supabase: SupabaseClient, file: ProjectFile): Promise<boolean> {
  const url = await resolveFileUrl(supabase, file);
  if (!url) return false;
  await navigator.clipboard.writeText(url);
  return true;
}

export function FilePreviewModal({
  file,
  url,
  loading,
  onClose,
}: {
  file: ProjectFile;
  url: string | null;
  loading: boolean;
  onClose: () => void;
}) {
  const kind = previewKind(file);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 820, padding: 16 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, wordBreak: "break-word" }}>{file.name}</div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 6, borderRadius: 8, flexShrink: 0 }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        {loading ? (
          <div className="skeleton" style={{ width: "100%", height: 360, borderRadius: 10 }} />
        ) : !url ? (
          <div className="empty-state">
            <p>تعذّر تحميل المعاينة</p>
          </div>
        ) : kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={file.name}
            style={{ display: "block", width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 10, margin: "0 auto" }}
          />
        ) : kind === "video" ? (
          <video src={url} controls style={{ width: "100%", maxHeight: "70vh", borderRadius: 10 }} />
        ) : kind === "pdf" ? (
          <iframe src={url} title={file.name} style={{ width: "100%", height: "70vh", border: "none", borderRadius: 10 }} />
        ) : null}
      </div>
    </div>
  );
}

type ViewMode = "grid" | "list";
type SortMode = "date_desc" | "date_asc" | "name" | "size";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "date_desc", label: "الأحدث أولاً" },
  { value: "date_asc", label: "الأقدم أولاً" },
  { value: "name", label: "الاسم" },
  { value: "size", label: "الحجم" },
];

interface Props {
  projectId: string;
  episodeId: string | null;
  /** التصنيفات المعروضة، أو "all" لعرض الكل */
  filter: "all" | FileCategory[];
  accept?: string;
  emptyText?: string;
  /** عند الرفع اجبر التصنيف على هذه القيمة بدل الاستنتاج (لتبويبات الصور/الفيديو) */
  forceCategory?: FileCategory;
  onChanged?: () => void;
}

export default function FilesPanel({ projectId, episodeId, filter, accept, emptyText, forceCategory, onChanged }: Props) {
  const supabase = createClient();
  const { userId, company, profile } = useSession();
  const companyId = company!.id;
  const admin = isInternalAdmin(profile.role);

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [clientVisible, setClientVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<ProjectFile | null>(null);

  const [view, setView] = useState<ViewMode>("grid");
  const [categoryFilter, setCategoryFilter] = useState<FileCategory | "">("");
  const [sortMode, setSortMode] = useState<SortMode>("date_desc");
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: ProjectFile; url: string | null; loading: boolean } | null>(null);

  const load = useCallback(async () => {
    let query = supabase.from("files").select("*").eq("project_id", projectId);
    query = episodeId ? query.eq("episode_id", episodeId) : query.is("episode_id", null);
    if (filter !== "all") query = query.in("category", filter);
    const { data } = await query.order("created_at", { ascending: false });
    setFiles((data as ProjectFile[]) ?? []);
    setLoading(false);
  }, [supabase, projectId, episodeId, filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل أولي عند التركيب، النمط القياسي لجلب البيانات
    load();
  }, [load]);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const path = `${companyId}/${projectId}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("project-files").upload(path, file, { upsert: false });
        if (upErr) continue;
        const category = forceCategory ?? inferCategory(file.type, file.name);
        await supabase.from("files").insert({
          company_id: companyId,
          project_id: projectId,
          episode_id: episodeId,
          uploaded_by: userId,
          name: file.name,
          storage_path: path,
          file_type: file.type || null,
          category,
          size_bytes: file.size,
          client_visible: clientVisible,
        });
      }
      await load();
      onChanged?.();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // استبدال محتوى ملف موجود مع إبقاء نفس الصف/المعرّف (حتى لا تنكسر أي روابط/إشارات سابقة له):
  // نرفع الملف الجديد لمسار تخزين جديد، نحدّث صف الملف نفسه، ثم نحذف الكائن القديم من التخزين.
  async function handleReplace(fileList: FileList | null) {
    const target = replaceTargetRef.current;
    const newFile = fileList?.[0];
    if (!target || !newFile) return;
    setReplacingId(target.id);
    try {
      const newPath = `${companyId}/${projectId}/${crypto.randomUUID()}-${newFile.name}`;
      const { error: upErr } = await supabase.storage.from("project-files").upload(newPath, newFile, { upsert: false });
      if (upErr) return;
      const category = forceCategory ?? inferCategory(newFile.type, newFile.name);
      await supabase
        .from("files")
        .update({ name: newFile.name, storage_path: newPath, file_type: newFile.type || null, category, size_bytes: newFile.size })
        .eq("id", target.id);
      const oldPath = target.storage_path;
      if (oldPath) await supabase.storage.from("project-files").remove([oldPath]);
      await load();
      onChanged?.();
    } finally {
      setReplacingId(null);
      replaceTargetRef.current = null;
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  }

  function triggerReplace(f: ProjectFile) {
    replaceTargetRef.current = f;
    replaceInputRef.current?.click();
  }

  async function openPreview(f: ProjectFile) {
    const kind = previewKind(f);
    if (!kind) {
      await openFile(supabase, f);
      return;
    }
    setPreview({ file: f, url: null, loading: true });
    const url = await resolveFileUrl(supabase, f);
    setPreview({ file: f, url, loading: false });
  }

  async function handleCopyLink(f: ProjectFile) {
    const ok = await copyFileLink(supabase, f);
    if (ok) {
      setCopiedId(f.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  }

  async function remove(f: ProjectFile) {
    if (!confirm(`حذف الملف "${f.name}"؟`)) return;
    if (f.storage_path) await supabase.storage.from("project-files").remove([f.storage_path]);
    await supabase.from("files").delete().eq("id", f.id);
    await load();
    onChanged?.();
  }

  async function toggleVisible(f: ProjectFile) {
    await supabase.from("files").update({ client_visible: !f.client_visible }).eq("id", f.id);
    await load();
  }

  const availableCategories = useMemo(() => Array.from(new Set(files.map((f) => f.category))), [files]);

  const visibleFiles = useMemo(() => {
    const list = categoryFilter ? files.filter((f) => f.category === categoryFilter) : files.slice();
    list.sort((a, b) => {
      if (sortMode === "date_asc") return a.created_at.localeCompare(b.created_at);
      if (sortMode === "name") return a.name.localeCompare(b.name, "ar");
      if (sortMode === "size") return (b.size_bytes ?? 0) - (a.size_bytes ?? 0);
      return b.created_at.localeCompare(a.created_at);
    });
    return list;
  }, [files, categoryFilter, sortMode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={clientVisible} onChange={(e) => setClientVisible(e.target.checked)} />
            مرئي للعميل
          </label>
          {availableCategories.length > 1 && (
            <select
              className="input-field"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as FileCategory | "")}
              style={{ width: "auto", fontSize: 12, padding: "6px 10px" }}
            >
              <option value="">كل الأنواع</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {FILE_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          )}
          <select
            className="input-field"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            style={{ width: "auto", fontSize: 12, padding: "6px 10px" }}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 2, background: "var(--bg-hover)", borderRadius: 8, padding: 2 }}>
            <button
              className="btn-ghost"
              title="عرض شبكي"
              onClick={() => setView("grid")}
              style={{ padding: "6px 8px", borderRadius: 6, background: view === "grid" ? "var(--bg-card)" : "transparent", color: view === "grid" ? "var(--gold)" : "var(--text-secondary)" }}
            >
              <Icon name="grid" size={15} />
            </button>
            <button
              className="btn-ghost"
              title="عرض قائمة"
              onClick={() => setView("list")}
              style={{ padding: "6px 8px", borderRadius: 6, background: view === "list" ? "var(--bg-card)" : "transparent", color: view === "list" ? "var(--gold)" : "var(--text-secondary)" }}
            >
              <Icon name="list" size={15} />
            </button>
          </div>
        </div>
        <label className="btn btn-gold" style={{ cursor: uploading ? "wait" : "pointer" }}>
          <Icon name="upload" size={16} /> {uploading ? "جارٍ الرفع..." : "رفع ملف"}
          <input ref={inputRef} type="file" multiple accept={accept} hidden disabled={uploading} onChange={(e) => handleUpload(e.target.files)} />
        </label>
        <input ref={replaceInputRef} type="file" accept={accept} hidden onChange={(e) => handleReplace(e.target.files)} />
      </div>

      {loading ? (
        <div className="empty-state">جارٍ التحميل...</div>
      ) : visibleFiles.length === 0 ? (
        <div className="empty-state card">
          <Icon name="attachment" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>{files.length === 0 ? emptyText ?? "لا توجد ملفات" : "لا توجد ملفات مطابقة للفلتر"}</p>
        </div>
      ) : view === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {visibleFiles.map((f) => (
            <div key={f.id} className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ color: "var(--gold)", flexShrink: 0 }}>
                  <Icon name={FILE_CATEGORY_ICON[f.category]} size={20} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {humanFileSize(f.size_bytes)} {f.size_bytes ? "·" : ""} {relativeTime(f.created_at)}
                  </div>
                </div>
              </div>

              <FileActionsRow
                file={f}
                admin={admin}
                userId={userId}
                copied={copiedId === f.id}
                replacing={replacingId === f.id}
                onPreview={() => openPreview(f)}
                onDownload={() => downloadFile(supabase, f)}
                onCopyLink={() => handleCopyLink(f)}
                onReplace={() => triggerReplace(f)}
                onToggleVisible={() => toggleVisible(f)}
                onRemove={() => remove(f)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>الملف</th>
                <th>الحجم</th>
                <th>تاريخ الرفع</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleFiles.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "var(--gold)", flexShrink: 0 }}>
                        <Icon name={FILE_CATEGORY_ICON[f.category]} size={16} />
                      </span>
                      <span style={{ fontWeight: 600, wordBreak: "break-word" }}>{f.name}</span>
                    </div>
                  </td>
                  <td>{humanFileSize(f.size_bytes) || "—"}</td>
                  <td>{relativeTime(f.created_at)}</td>
                  <td>
                    <FileActionsRow
                      file={f}
                      admin={admin}
                      userId={userId}
                      copied={copiedId === f.id}
                      replacing={replacingId === f.id}
                      onPreview={() => openPreview(f)}
                      onDownload={() => downloadFile(supabase, f)}
                      onCopyLink={() => handleCopyLink(f)}
                      onReplace={() => triggerReplace(f)}
                      onToggleVisible={() => toggleVisible(f)}
                      onRemove={() => remove(f)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && <FilePreviewModal file={preview.file} url={preview.url} loading={preview.loading} onClose={() => setPreview(null)} />}
    </div>
  );
}

function FileActionsRow({
  file,
  admin,
  userId,
  copied,
  replacing,
  onPreview,
  onDownload,
  onCopyLink,
  onReplace,
  onToggleVisible,
  onRemove,
}: {
  file: ProjectFile;
  admin: boolean;
  userId: string;
  copied: boolean;
  replacing: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onCopyLink: () => void;
  onReplace: () => void;
  onToggleVisible: () => void;
  onRemove: () => void;
}) {
  const canManage = admin || file.uploaded_by === userId;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      <button className="btn btn-outline" style={{ padding: "6px 10px", fontSize: 12 }} onClick={onPreview}>
        <Icon name="eye" size={13} /> معاينة
      </button>
      <button className="btn-ghost" title="تحميل" style={{ padding: "6px 8px", borderRadius: 8 }} onClick={onDownload}>
        <Icon name="export" size={14} />
      </button>
      <button
        className="btn-ghost"
        title={copied ? "تم نسخ الرابط" : "نسخ الرابط"}
        style={{ padding: "6px 8px", borderRadius: 8, color: copied ? "var(--gold)" : undefined }}
        onClick={onCopyLink}
      >
        <Icon name={copied ? "check" : "copy"} size={14} />
      </button>
      {canManage && (
        <button
          className="btn-ghost"
          title="استبدال الملف"
          disabled={replacing}
          style={{ padding: "6px 8px", borderRadius: 8, cursor: replacing ? "wait" : "pointer" }}
          onClick={onReplace}
        >
          <Icon name="fileUp" size={14} />
        </button>
      )}
      <button
        className="btn-ghost"
        style={{ padding: "6px 8px", borderRadius: 8 }}
        title={file.client_visible ? "مرئي للعميل" : "مخفي عن العميل"}
        onClick={onToggleVisible}
      >
        <Icon name={file.client_visible ? "eye" : "eyeOff"} size={14} />
      </button>
      {canManage && (
        <button className="btn-ghost" style={{ padding: "6px 8px", borderRadius: 8, marginRight: "auto", color: "#ef4444" }} onClick={onRemove}>
          <Icon name="trash" size={14} />
        </button>
      )}
    </div>
  );
}
