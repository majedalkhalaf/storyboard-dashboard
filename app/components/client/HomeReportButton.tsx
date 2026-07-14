"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { exportClientProjectZip, type ExportProgress } from "@/app/lib/client-zip-export";
import { runTrackedDownload } from "@/app/lib/download-queue-store";
import type { Episode, Project, ProjectFile } from "@/app/lib/types";

// أيقونة "تحميل تقرير كامل عن المشروع" فوق صورة الغلاف في الصفحة الرئيسية —
// تجلب الحلقات وكل الملفات المرئية للعميل عند الضغط مباشرة (بلا حاجة لتحميلها
// مسبقاً في الصفحة الرئيسية) ثم تصدّرها كملف ZIP بنفس منطق صفحة تفاصيل المشروع.
export default function HomeReportButton({ project }: { project: Project }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const [{ data: episodeRows }, { data: fileRows }] = await Promise.all([
        supabase.from("episodes").select("*").eq("project_id", project.id).order("sort_order", { ascending: true }),
        supabase.from("files").select("*").eq("project_id", project.id).eq("client_visible", true),
      ]);
      const episodes = (episodeRows ?? []) as Episode[];
      const files = (fileRows ?? []) as ProjectFile[];
      const projectFiles = files.filter((f) => !f.episode_id);
      const episodeFilesByEpisode: Record<string, ProjectFile[]> = {};
      for (const f of files) {
        if (f.episode_id) (episodeFilesByEpisode[f.episode_id] ??= []).push(f);
      }
      await runTrackedDownload(project.name, async ({ signal, onProgress }) => {
        await exportClientProjectZip(
          project,
          episodes,
          projectFiles,
          episodeFilesByEpisode,
          {},
          (p) => {
            setProgress(p);
            onProgress(p.stage, p.percent);
          },
          signal
        );
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      title={busy ? `${progress?.stage ?? "جارٍ التحميل..."} ${progress?.percent ?? 0}%` : "تحميل تقرير كامل عن المشروع"}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: busy ? "wait" : "pointer",
        flexShrink: 0,
      }}
    >
      <Icon name={busy ? "clock" : "export"} size={16} />
    </button>
  );
}
