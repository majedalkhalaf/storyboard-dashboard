"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import { logActivity } from "@/app/lib/activity";
import { extractVideoMetadata, uploadFile, RESUMABLE_UPLOAD_THRESHOLD, type UploadController } from "@/app/lib/storage-upload";
import { buildFilePath, safeStorageKey } from "@/app/lib/storage-path";
import type { FileCategory, ProjectFile } from "@/app/lib/types";
import { FILE_CATEGORY_ICON, humanEta, humanFileSize, humanSpeed, inferCategory, relativeTime } from "./utils";

// عدد الرفعات المتوازية بحد أقصى — رفع كل الملفات دفعة واحدة قد يُغرق النطاق الترددي
// نفسه فيبطئ الجميع، لذا نُحدّد سقفاً معقولاً بدل التسلسل الكامل (رفع واحد تلو الآخر).
const MAX_CONCURRENT_UPLOADS = 3;

// تصنيفات الملفات كما هي فعلياً في قاعدة البيانات (لا تصنيفات وهمية جديدة)
export const FILE_CATEGORY_LABEL: Record<FileCategory, string> = {
  image: "صورة",
  video: "فيديو",
  document: "مستند",
  audio: "صوت",
  archive: "أرشيف",
  design: "تصميم",
  project_file: "ملف مشروع",
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
    .from(file.bucket_name || "project-files")
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
type QueueStatus = "queued" | "uploading" | "paused" | "success" | "error" | "cancelled";

interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  loaded: number;
  total: number;
  speedBps: number;
  error?: string;
}

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
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [clientVisible, setClientVisible] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<ProjectFile | null>(null);

  const controllersRef = useRef<Map<string, UploadController>>(new Map());
  const startedIdsRef = useRef<Set<string>>(new Set());
  const speedTrackRef = useRef<Map<string, { time: number; loaded: number }>>(new Map());

  const [view, setView] = useState<ViewMode>("grid");
  const [categoryFilter, setCategoryFilter] = useState<FileCategory | "">("");
  const [sortMode, setSortMode] = useState<SortMode>("date_desc");
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: ProjectFile; url: string | null; loading: boolean } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  async function finalizeUpload(item: QueueItem, category: FileCategory, path: string) {
    let thumbnailUrl: string | null = null;
    let duration: number | null = null;
    let width: number | null = null;
    let height: number | null = null;

    if (category === "video") {
      // استخراج حقيقي من الملف محلياً (لا Placeholder): مدة/أبعاد + التقاط إطار فعلي كصورة مصغّرة.
      // الصورة المصغّرة تُرفع إلى public-assets (بخلاف الفيديو الأصلي الخاص) لأنها معاينة
      // منخفضة الحساسية وتحتاج رابطاً عاماً دائماً بدل رابط موقّت ينتهي خلال دقائق.
      const meta = await extractVideoMetadata(item.file);
      duration = meta.durationSeconds;
      width = meta.width;
      height = meta.height;
      if (meta.thumbnailBlob) {
        const thumbPath = `${companyId}/thumbnails/${safeStorageKey(item.file.name).replace(/\.[a-zA-Z0-9]+$/, "")}.jpg`;
        const { error: thumbErr } = await supabase.storage
          .from("public-assets")
          .upload(thumbPath, meta.thumbnailBlob, { upsert: false, contentType: "image/jpeg" });
        if (!thumbErr) thumbnailUrl = supabase.storage.from("public-assets").getPublicUrl(thumbPath).data.publicUrl;
      }
    }

    const ext = item.file.name.includes(".") ? (item.file.name.split(".").pop() ?? "").toLowerCase() : null;

    await supabase.from("files").insert({
      company_id: companyId,
      project_id: projectId,
      episode_id: episodeId,
      uploaded_by: userId,
      uploaded_by_role: profile.role,
      name: item.file.name,
      original_name: item.file.name,
      storage_path: path,
      bucket_name: "project-files",
      file_type: item.file.type || null,
      mime_type: item.file.type || null,
      file_extension: ext,
      category,
      size_bytes: item.file.size,
      client_visible: clientVisible,
      client_can_view: clientVisible,
      client_can_download: clientVisible,
      status: "ready",
      thumbnail_url: thumbnailUrl,
      duration_seconds: duration,
      width,
      height,
    });

    await logActivity(supabase, {
      companyId,
      projectId,
      episodeId,
      action: "file_uploaded",
      details: { name: item.file.name, category, size_bytes: item.file.size },
    });
    await load();
    onChanged?.();
  }

  function startUpload(item: QueueItem) {
    if (startedIdsRef.current.has(item.id)) return;
    startedIdsRef.current.add(item.id);
    setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "uploading" } : q)));

    const category = forceCategory ?? inferCategory(item.file.type, item.file.name);
    const path = buildFilePath({ companyId, projectId, episodeId, category, originalName: item.file.name });
    speedTrackRef.current.set(item.id, { time: Date.now(), loaded: 0 });

    const controller = uploadFile(supabase, "project-files", path, item.file, {
      onProgress: (loaded, total) => {
        const track = speedTrackRef.current.get(item.id);
        const now = Date.now();
        let nextSpeed: number | null = null;
        if (track) {
          const dt = (now - track.time) / 1000;
          if (dt >= 0.5) {
            nextSpeed = Math.max(0, (loaded - track.loaded) / dt);
            speedTrackRef.current.set(item.id, { time: now, loaded });
          }
        }
        setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, loaded, total, speedBps: nextSpeed ?? q.speedBps } : q)));
      },
      onError: (message) => {
        startedIdsRef.current.delete(item.id);
        setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: q.status === "paused" ? "paused" : "error", error: message } : q)));
      },
      onSuccess: async () => {
        try {
          await finalizeUpload(item, category, path);
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "success", loaded: q.total } : q)));
        } catch {
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "error", error: "تم رفع الملف لكن فشل حفظ بياناته" } : q)));
        }
      },
    });
    controllersRef.current.set(item.id, controller);
  }

  // معالج الطابور: يبدأ رفع الملفات "قيد الانتظار" تباعاً حتى سقف الرفعات المتزامنة —
  // يُعاد تشغيله تلقائياً في كل تغيير على الطابور (اكتمال/فشل/إلغاء عنصر يُخلي مكاناً لغيره)
  useEffect(() => {
    const activeCount = queue.filter((q) => q.status === "uploading").length;
    const availableSlots = MAX_CONCURRENT_UPLOADS - activeCount;
    if (availableSlots <= 0) return;
    queue
      .filter((q) => q.status === "queued")
      .slice(0, availableSlots)
      .forEach(startUpload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  function enqueue(fileList: FileList | File[]) {
    const items: QueueItem[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "queued",
      loaded: 0,
      total: file.size,
      speedBps: 0,
    }));
    if (items.length === 0) return;
    setQueue((prev) => [...prev, ...items]);
  }

  function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    enqueue(fileList);
    if (inputRef.current) inputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  }

  function pauseQueueItem(id: string) {
    controllersRef.current.get(id)?.pause();
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: "paused" } : q)));
  }
  function resumeQueueItem(id: string) {
    controllersRef.current.get(id)?.resume();
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: "uploading" } : q)));
  }
  function cancelQueueItem(id: string) {
    controllersRef.current.get(id)?.cancel();
    controllersRef.current.delete(id);
    startedIdsRef.current.delete(id);
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: "cancelled" } : q)));
  }
  function retryQueueItem(id: string) {
    startedIdsRef.current.delete(id);
    controllersRef.current.delete(id);
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: "queued", loaded: 0, error: undefined } : q)));
  }
  function dismissQueueItem(id: string) {
    controllersRef.current.delete(id);
    startedIdsRef.current.delete(id);
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) enqueue(e.dataTransfer.files);
  }

  // استبدال محتوى ملف موجود مع إبقاء نفس الصف/المعرّف (حتى لا تنكسر أي روابط/إشارات سابقة له):
  // نرفع الملف الجديد لمسار تخزين جديد، نحدّث صف الملف نفسه، ثم نحذف الكائن القديم من التخزين.
  async function handleReplace(fileList: FileList | null) {
    const target = replaceTargetRef.current;
    const newFile = fileList?.[0];
    if (!target || !newFile) return;
    setReplacingId(target.id);
    try {
      const category = forceCategory ?? inferCategory(newFile.type, newFile.name);
      const newPath = buildFilePath({ companyId, projectId, episodeId, category, originalName: newFile.name });
      const { error: upErr } = await supabase.storage.from("project-files").upload(newPath, newFile, { upsert: false });
      if (upErr) return;
      const ext = newFile.name.includes(".") ? (newFile.name.split(".").pop() ?? "").toLowerCase() : null;
      await supabase
        .from("files")
        .update({
          name: newFile.name,
          original_name: newFile.name,
          storage_path: newPath,
          file_type: newFile.type || null,
          mime_type: newFile.type || null,
          file_extension: ext,
          category,
          size_bytes: newFile.size,
        })
        .eq("id", target.id);
      const oldPath = target.storage_path;
      if (oldPath) await supabase.storage.from(target.bucket_name || "project-files").remove([oldPath]);
      await logActivity(supabase, { companyId, projectId, episodeId, action: "file_replaced", details: { name: newFile.name } });
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

  // منطق حذف مشترك (ملف واحد أو دفعة) — يزيل كائنات Storage (مجمّعة حسب bucket)، يحذف
  // صفوف "files"، يسجّل نشاط "file_deleted" لكل ملف (نفس اسم الحدث المستخدم سابقاً في
  // الحذف الفردي)، ثم يحدّث القائمة المحلية فوراً (Optimistic) بدل انتظار إعادة جلب كاملة.
  async function performDelete(list: ProjectFile[]) {
    const byBucket = new Map<string, string[]>();
    for (const f of list) {
      if (!f.storage_path) continue;
      const bucket = f.bucket_name || "project-files";
      byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), f.storage_path]);
    }
    await Promise.all([...byBucket.entries()].map(([bucket, paths]) => supabase.storage.from(bucket).remove(paths)));
    const ids = list.map((f) => f.id);
    await supabase.from("files").delete().in("id", ids);
    // إشعار العميل عند حذف ملف كان مرئياً له يتم تلقائياً عبر trigger في قاعدة البيانات
    // (notify_client_on_file_delete، راجع supabase/migrations/0017_file_delete_notify.sql)
    // بنفس منطق التحقق من صلاحية "files" وحالة العميل المستخدم في trigger الإضافة الحالي.
    await Promise.all(list.map((f) => logActivity(supabase, { companyId, projectId, episodeId, action: "file_deleted", details: { name: f.name } })));
    setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
    onChanged?.();
  }

  async function remove(f: ProjectFile) {
    if (!confirm(`حذف الملف "${f.name}"؟`)) return;
    await performDelete([f]);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleVisible(f: ProjectFile) {
    const next = !f.client_visible;
    await supabase.from("files").update({ client_visible: next, client_can_view: next, client_can_download: next }).eq("id", f.id);
    await load();
  }

  const availableCategories = useMemo(() => Array.from(new Set(files.map((f) => f.category))), [files]);
  const activeQueue = queue.filter((q) => q.status !== "success" && q.status !== "cancelled");

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

  const selectedVisible = useMemo(() => visibleFiles.filter((f) => selected.has(f.id)), [visibleFiles, selected]);
  const selectedSize = useMemo(() => selectedVisible.reduce((s, f) => s + (f.size_bytes ?? 0), 0), [selectedVisible]);

  async function removeSelected() {
    if (selectedVisible.length === 0) return;
    if (!confirm(`حذف ${selectedVisible.length} ملف محدد (${humanFileSize(selectedSize) || "0 B"})؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    setBulkDeleting(true);
    try {
      await performDelete(selectedVisible);
      setSelected(new Set());
    } finally {
      setBulkDeleting(false);
    }
  }

  async function removeAllVisible() {
    if (visibleFiles.length === 0) return;
    const totalSize = visibleFiles.reduce((s, f) => s + (f.size_bytes ?? 0), 0);
    const label = episodeId ? "كل مرفقات الحلقة" : "كل الملفات المعروضة";
    if (!confirm(`حذف ${label} (${visibleFiles.length} ملف، ${humanFileSize(totalSize) || "0 B"})؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    setBulkDeleting(true);
    try {
      await performDelete(visibleFiles);
      setSelected(new Set());
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative" }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            background: "rgba(var(--gold-rgb),0.12)",
            border: "2px dashed var(--gold)",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--gold)", fontWeight: 700 }}>
            <Icon name="upload" size={30} />
            أفلت الملفات هنا للرفع
          </div>
        </div>
      )}

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
        <div style={{ display: "flex", gap: 8 }}>
          <label className="btn btn-gold" style={{ cursor: "pointer" }}>
            <Icon name="upload" size={16} /> رفع ملفات
            <input ref={inputRef} type="file" multiple accept={accept} hidden onChange={(e) => handleUpload(e.target.files)} />
          </label>
          <label className="btn btn-outline" style={{ cursor: "pointer" }} title="رفع مجلد كامل (متصفحات Chrome/Edge)">
            <Icon name="folderUp" size={16} /> رفع مجلد
            <input
              ref={folderInputRef}
              type="file"
              multiple
              hidden
              // خاصية غير قياسية لكن مدعومة في متصفحات Chromium لاختيار مجلد كامل
              {...({ webkitdirectory: "true", directory: "true" } as Record<string, string>)}
              onChange={(e) => handleUpload(e.target.files)}
            />
          </label>
        </div>
        <input ref={replaceInputRef} type="file" accept={accept} hidden onChange={(e) => handleReplace(e.target.files)} />
      </div>

      {activeQueue.length > 0 && (
        <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {activeQueue.map((q) => (
            <UploadQueueRow
              key={q.id}
              item={q}
              onPause={() => pauseQueueItem(q.id)}
              onResume={() => resumeQueueItem(q.id)}
              onCancel={() => cancelQueueItem(q.id)}
              onRetry={() => retryQueueItem(q.id)}
              onDismiss={() => dismissQueueItem(q.id)}
            />
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="card" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn btn-outline"
            style={{ padding: "6px 10px", fontSize: 12 }}
            onClick={() => setSelected(new Set(visibleFiles.map((f) => f.id)))}
          >
            تحديد الكل
          </button>
          <button
            className="btn btn-outline"
            style={{ padding: "6px 10px", fontSize: 12 }}
            disabled={selected.size === 0}
            onClick={() => setSelected(new Set())}
          >
            إلغاء التحديد
          </button>
          {selectedVisible.length > 0 && (
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {selectedVisible.length} محدد ({humanFileSize(selectedSize) || "0 B"})
            </span>
          )}
          <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
            <button
              className="btn btn-outline"
              style={{ padding: "6px 10px", fontSize: 12, color: "#ef4444", cursor: bulkDeleting ? "wait" : "pointer" }}
              disabled={selectedVisible.length === 0 || bulkDeleting}
              onClick={removeSelected}
            >
              <Icon name="trash" size={13} /> حذف المحدد
            </button>
            <button
              className="btn btn-outline"
              style={{ padding: "6px 10px", fontSize: 12, color: "#ef4444", cursor: bulkDeleting ? "wait" : "pointer" }}
              disabled={bulkDeleting}
              onClick={removeAllVisible}
            >
              <Icon name="trash" size={13} /> {episodeId ? "حذف كل مرفقات الحلقة" : "حذف كل الملفات"}
            </button>
          </div>
        </div>
      )}

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
                <input
                  type="checkbox"
                  checked={selected.has(f.id)}
                  onChange={() => toggleSelect(f.id)}
                  style={{ marginTop: 4, flexShrink: 0 }}
                  aria-label="تحديد الملف"
                />
                {f.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.thumbnail_url} alt={f.name} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                ) : (
                  <span style={{ color: "var(--gold)", flexShrink: 0 }}>
                    <Icon name={FILE_CATEGORY_ICON[f.category]} size={20} />
                  </span>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {humanFileSize(f.size_bytes)} {f.size_bytes ? "·" : ""} {relativeTime(f.created_at)}
                    {f.duration_seconds ? ` · ${Math.round(f.duration_seconds)}ث` : ""}
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
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    checked={visibleFiles.length > 0 && selectedVisible.length === visibleFiles.length}
                    onChange={(e) => setSelected(e.target.checked ? new Set(visibleFiles.map((f) => f.id)) : new Set())}
                    aria-label="تحديد الكل"
                  />
                </th>
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
                    <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleSelect(f.id)} aria-label="تحديد الملف" />
                  </td>
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

function UploadQueueRow({
  item,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onDismiss,
}: {
  item: QueueItem;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const percent = item.total > 0 ? Math.round((item.loaded / item.total) * 100) : 0;
  const isLarge = item.total > RESUMABLE_UPLOAD_THRESHOLD;
  const remaining = item.total - item.loaded;
  const displayPercent = item.status === "success" ? 100 : percent;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, gap: 8 }}>
        <span style={{ wordBreak: "break-word", flex: 1 }}>{item.file.name}</span>
        <span style={{ color: "var(--text-muted)", flexShrink: 0, whiteSpace: "nowrap" }}>
          {humanFileSize(item.loaded)} / {humanFileSize(item.total)}
        </span>
        {item.status === "uploading" && (
          <span style={{ color: "var(--text-muted)", flexShrink: 0, whiteSpace: "nowrap" }}>
            {humanSpeed(item.speedBps)} · متبقٍ {humanEta(remaining, item.speedBps)}
          </span>
        )}
        <span
          style={{
            fontWeight: 700,
            flexShrink: 0,
            color: item.status === "error" ? "#ef4444" : item.status === "success" ? "var(--success, #22c55e)" : "var(--text-secondary)",
          }}
        >
          {item.status === "queued" && "بالانتظار"}
          {item.status === "uploading" && `${percent}%`}
          {item.status === "paused" && "متوقّف مؤقتاً"}
          {item.status === "success" && "تم"}
          {item.status === "error" && (item.error ?? "فشل الرفع")}
        </span>
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          {item.status === "uploading" && isLarge && (
            <button className="btn-ghost" title="إيقاف مؤقت" style={{ padding: 5, borderRadius: 6 }} onClick={onPause}>
              <Icon name="pause" size={13} />
            </button>
          )}
          {item.status === "paused" && (
            <button className="btn-ghost" title="استئناف" style={{ padding: 5, borderRadius: 6 }} onClick={onResume}>
              <Icon name="play" size={13} />
            </button>
          )}
          {(item.status === "uploading" || item.status === "paused" || item.status === "queued") && (
            <button className="btn-ghost" title="إلغاء" style={{ padding: 5, borderRadius: 6, color: "#ef4444" }} onClick={onCancel}>
              <Icon name="close" size={13} />
            </button>
          )}
          {item.status === "error" && (
            <>
              <button className="btn-ghost" title="إعادة المحاولة" style={{ padding: 5, borderRadius: 6 }} onClick={onRetry}>
                <Icon name="retry" size={13} />
              </button>
              <button className="btn-ghost" title="تجاهل" style={{ padding: 5, borderRadius: 6 }} onClick={onDismiss}>
                <Icon name="close" size={13} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="progress-bar" style={{ height: 6 }}>
        <div
          className="progress-fill"
          style={{
            width: `${displayPercent}%`,
            background: item.status === "error" ? "#ef4444" : item.status === "paused" ? "var(--text-muted)" : undefined,
          }}
        />
      </div>
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
