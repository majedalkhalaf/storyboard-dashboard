"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import type { FileCategory, ProjectFile } from "@/app/lib/types";
import { FILE_CATEGORY_ICON, humanFileSize, inferCategory, relativeTime } from "./utils";

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

  async function download(f: ProjectFile) {
    if (f.external_url) {
      window.open(f.external_url, "_blank");
      return;
    }
    if (!f.storage_path) return;
    const { data } = await supabase.storage.from("project-files").createSignedUrl(f.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={clientVisible} onChange={(e) => setClientVisible(e.target.checked)} />
          مرئي للعميل
        </label>
        <label className="btn btn-gold" style={{ cursor: uploading ? "wait" : "pointer" }}>
          <Icon name="upload" size={16} /> {uploading ? "جارٍ الرفع..." : "رفع ملف"}
          <input ref={inputRef} type="file" multiple accept={accept} hidden disabled={uploading} onChange={(e) => handleUpload(e.target.files)} />
        </label>
      </div>

      {loading ? (
        <div className="empty-state">جارٍ التحميل...</div>
      ) : files.length === 0 ? (
        <div className="empty-state card">
          <Icon name="attachment" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>{emptyText ?? "لا توجد ملفات"}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {files.map((f) => (
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

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button className="btn btn-outline" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => download(f)}>
                  <Icon name="eye" size={13} /> فتح
                </button>
                <button
                  className="btn-ghost"
                  style={{ padding: "6px 8px", borderRadius: 8, fontSize: 11 }}
                  title={f.client_visible ? "مرئي للعميل" : "مخفي عن العميل"}
                  onClick={() => toggleVisible(f)}
                >
                  <Icon name={f.client_visible ? "eye" : "eyeOff"} size={14} />
                </button>
                {(admin || f.uploaded_by === userId) && (
                  <button className="btn-ghost" style={{ padding: "6px 8px", borderRadius: 8, marginRight: "auto", color: "#ef4444" }} onClick={() => remove(f)}>
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
