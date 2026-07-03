"use client";

import { useMemo, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { inferCategory } from "@/app/components/projects/utils";
import { safeStorageKey } from "@/app/lib/storage-path";

interface ProjectOption {
  id: string;
  name: string;
}

interface EpisodeOption {
  id: string;
  project_id: string;
  title: string;
}

export default function UploadFileModal({
  projects,
  episodes,
  onClose,
  onUploaded,
}: {
  projects: ProjectOption[];
  episodes: EpisodeOption[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const supabase = createClient();
  const { userId, company } = useSession();
  const companyId = company!.id;

  const [projectId, setProjectId] = useState("");
  const [episodeId, setEpisodeId] = useState("");
  const [clientVisible, setClientVisible] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectEpisodes = useMemo(() => episodes.filter((e) => e.project_id === projectId), [episodes, projectId]);

  async function upload() {
    if (!projectId) {
      setError("المشروع مطلوب");
      return;
    }
    if (!file) {
      setError("اختر ملفاً للرفع");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      // نفس مخطط المسار المستخدم في FilesPanel.tsx تماماً — لا نخترع مخططاً جديداً
      const path = `${companyId}/${projectId}/${safeStorageKey(file.name)}`;
      const { error: upErr } = await supabase.storage.from("project-files").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const category = inferCategory(file.type, file.name);
      const { error: insErr } = await supabase.from("files").insert({
        company_id: companyId,
        project_id: projectId,
        episode_id: episodeId || null,
        uploaded_by: userId,
        name: file.name,
        storage_path: path,
        file_type: file.type || null,
        category,
        size_bytes: file.size,
        client_visible: clientVisible,
      });
      if (insErr) throw insErr;

      await logActivity(supabase, {
        companyId,
        projectId,
        episodeId: episodeId || null,
        action: "file_uploaded",
        details: { name: file.name },
      });

      onUploaded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر رفع الملف");
      setUploading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !uploading && onClose()}>
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>رفع ملف</h2>
          <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose} disabled={uploading}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {error && (
          <div className="btn-danger" style={{ display: "block", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>المشروع *</label>
            <select
              className="input-field"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setEpisodeId("");
              }}
            >
              <option value="">— اختر مشروعاً —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>الحلقة (اختياري)</label>
            <select className="input-field" value={episodeId} onChange={(e) => setEpisodeId(e.target.value)} disabled={!projectId}>
              <option value="">بدون حلقة</option>
              {projectEpisodes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>الملف *</label>
            <input type="file" className="input-field" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={clientVisible} onChange={(e) => setClientVisible(e.target.checked)} />
            مرئي للعميل
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={uploading}>
            إلغاء
          </button>
          <button className="btn btn-gold" onClick={upload} disabled={uploading}>
            {uploading ? "جارٍ الرفع..." : "رفع الملف"}
          </button>
        </div>
      </div>
    </div>
  );
}
