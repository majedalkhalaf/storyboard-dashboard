"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { openUrl } from "@/app/lib/download";
import { FILE_CATEGORY_ICON, humanFileSize, relativeTime } from "@/app/components/projects/utils";
import type { FileCategory } from "@/app/lib/types";
import UploadFileModal from "./UploadFileModal";

const CATEGORY_LABELS: Record<FileCategory, string> = {
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

export interface FileListItem {
  id: string;
  project_id: string;
  episode_id: string | null;
  name: string;
  storage_path: string | null;
  bucket_name: string | null;
  external_url: string | null;
  file_type: string | null;
  category: FileCategory;
  size_bytes: number | null;
  client_visible: boolean;
  created_at: string;
  project_name: string;
  episode_title: string | null;
}

export interface ProjectOption {
  id: string;
  name: string;
}

export interface EpisodeOption {
  id: string;
  project_id: string;
  title: string;
}

export default function FilesView({
  files,
  projects,
  episodes,
}: {
  files: FileListItem[];
  projects: ProjectOption[];
  episodes: EpisodeOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<FileCategory | "">("");
  const [projectFilter, setProjectFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens upload modal from a deep link query param
    if (searchParams.get("new") === "1") setShowModal(true);
  }, [searchParams]);

  const totalSize = useMemo(() => files.reduce((sum, f) => sum + (f.size_bytes ?? 0), 0), [files]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q)) return false;
      if (categoryFilter && f.category !== categoryFilter) return false;
      if (projectFilter && f.project_id !== projectFilter) return false;
      return true;
    });
  }, [files, search, categoryFilter, projectFilter]);

  async function openFile(f: FileListItem) {
    if (f.external_url) {
      openUrl(f.external_url);
      return;
    }
    if (!f.storage_path) return;
    if (f.bucket_name === "r2") {
      const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
      if (base) openUrl(`${base.replace(/\/+$/, "")}/${f.storage_path}`);
      return;
    }
    const { data } = await supabase.storage.from(f.bucket_name || "project-files").createSignedUrl(f.storage_path, 300);
    if (data?.signedUrl) openUrl(data.signedUrl);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            الملفات
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {files.length} ملف {totalSize > 0 ? `· ${humanFileSize(totalSize)}` : ""}
          </p>
        </div>
        <button className="btn btn-gold" onClick={() => setShowModal(true)}>
          <Icon name="upload" size={16} /> رفع ملف
        </button>
      </div>

      {/* شريط البحث والفلاتر */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
            <Icon name="search" size={16} />
          </span>
          <input
            className="input-field"
            placeholder="ابحث باسم الملف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingRight: 38 }}
          />
        </div>
        <select
          className="input-field"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as FileCategory | "")}
          style={{ width: "auto", minWidth: 140 }}
        >
          <option value="">كل الأنواع</option>
          {(Object.keys(CATEGORY_LABELS) as FileCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          className="input-field"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{ width: "auto", minWidth: 150 }}
        >
          <option value="">كل المشاريع</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="files" size={36} className="text-muted" />
          <p style={{ marginTop: 12 }}>{files.length === 0 ? "لا توجد ملفات بعد" : "لا توجد نتائج مطابقة"}</p>
          {files.length === 0 && (
            <button className="btn btn-gold" style={{ marginTop: 14 }} onClick={() => setShowModal(true)}>
              <Icon name="upload" size={16} /> رفع أول ملف
            </button>
          )}
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>الملف</th>
                <th>المشروع</th>
                <th>الحجم</th>
                <th>تاريخ الرفع</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "var(--gold)", flexShrink: 0 }}>
                        <Icon name={FILE_CATEGORY_ICON[f.category]} size={16} />
                      </span>
                      <span style={{ fontWeight: 600, wordBreak: "break-word" }}>{f.name}</span>
                    </div>
                  </td>
                  <td>
                    {f.project_name}
                    {f.episode_title && <span style={{ color: "var(--text-muted)" }}> · {f.episode_title}</span>}
                  </td>
                  <td>{humanFileSize(f.size_bytes) || "—"}</td>
                  <td>{relativeTime(f.created_at)}</td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => openFile(f)}>
                      <Icon name="eye" size={13} /> فتح
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <UploadFileModal
          projects={projects}
          episodes={episodes}
          onClose={() => setShowModal(false)}
          onUploaded={() => router.refresh()}
        />
      )}
    </div>
  );
}
