"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import StageQuickSelect from "@/app/components/projects/StageQuickSelect";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { EPISODE_STATUSES } from "@/app/lib/constants";
import { fetchClientEpisodes, type EpisodeWithProject } from "@/app/lib/client-profile";
import { getCompanyPipelineStages } from "@/app/lib/pipeline-stages";
import { updateEpisodePipelineStage } from "@/app/lib/episode-actions";
import { relativeTime } from "@/app/components/projects/utils";
import type { CompanyPipelineStage } from "@/app/lib/types";

// هذا التبويب داخلي (فريق العمل يشاهد ملف العميل من app/(internal)/clients/[id])
// وليس بوابة العميل نفسها، لذا اختصار "تغيير المرحلة" هنا مرئي دائماً بلا فحص صلاحية إضافي.
export default function VideosTab({ clientId }: { clientId: string }) {
  const { company } = useSession();
  const companyId = company!.id;
  const [episodes, setEpisodes] = useState<EpisodeWithProject[] | null>(null);
  const [stages, setStages] = useState<CompanyPipelineStage[]>([]);

  useEffect(() => {
    fetchClientEpisodes(clientId).then(setEpisodes);
  }, [clientId]);

  useEffect(() => {
    const supabase = createClient();
    getCompanyPipelineStages(supabase, companyId).then(setStages);
  }, [companyId]);

  async function changeStage(episode: EpisodeWithProject, key: string) {
    const label = stages.find((s) => s.key === key)?.label ?? key;
    setEpisodes((prev) => (prev ?? []).map((e) => (e.id === episode.id ? { ...e, pipeline_stage: key } : e)));
    const supabase = createClient();
    await updateEpisodePipelineStage(supabase, { companyId, projectId: episode.project_id, episodeId: episode.id, stageKey: key, stageLabel: label });
  }

  if (episodes === null) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 220, borderRadius: 14 }} />
        ))}
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="video" size={32} className="text-muted" />
        <p style={{ marginTop: 12 }}>لا توجد فيديوهات لهذا العميل بعد</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
      {episodes.map((e) => {
        const status = EPISODE_STATUSES.find((s) => s.value === e.status);
        return (
          <Link key={e.id} href={`/projects/${e.project_id}?episode=${e.id}`} className="card animate-fade-in" style={{ display: "block", overflow: "hidden" }}>
            <div
              style={{
                height: 120,
                position: "relative",
                background: e.cover_image_url
                  ? `center/cover no-repeat url(${e.cover_image_url})`
                  : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!e.cover_image_url && <Icon name="video" size={26} className="text-muted" />}
              {status && (
                <span
                  className="chip"
                  style={{
                    position: "absolute",
                    top: 8,
                    insetInlineStart: 8,
                    fontSize: 11,
                    color: status.color,
                    borderColor: status.color,
                    background: "rgba(0,0,0,0.55)",
                  }}
                >
                  {status.label}
                </span>
              )}
            </div>

            <div style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.title}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.project_name}
              </div>

              <div className="progress-bar" style={{ height: 5 }}>
                <div className="progress-fill" style={{ width: `${e.progress}%` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
                <span>{Math.round(e.progress)}% مكتمل</span>
                <span>{relativeTime(e.updated_at)}</span>
              </div>

              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}
                onClick={(ev) => ev.stopPropagation()}
              >
                <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>المرحلة</span>
                <StageQuickSelect stages={stages} currentKey={e.pipeline_stage} onChange={(key) => changeStage(e, key)} size="sm" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
