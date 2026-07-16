"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import StatusChip from "@/app/components/client/StatusChip";
import ModalPortal from "@/app/components/ui/ModalPortal";
import EpisodeHeroPlayer, { type HeroVideoFile } from "@/app/components/client/episode-review/EpisodeHeroPlayer";
import EpisodeStatusCard from "@/app/components/client/episode-review/EpisodeStatusCard";
import EpisodeNotesSection from "@/app/components/client/episode-review/EpisodeNotesSection";
import EpisodeFilesSection from "@/app/components/client/episode-review/EpisodeFilesSection";
import EpisodeAdvancedDetails from "@/app/components/client/episode-review/EpisodeAdvancedDetails";
import { createClient } from "@/app/lib/supabase/client";
import { canClient } from "@/app/lib/permissions";
import { episodeStatusMeta, relativeTime, formatDate } from "@/app/components/client/utils";
import { getEpisodeKindLabel, isSpecialEpisodeKind } from "@/app/lib/item-noun";
import type { ClientPermissions, Episode, EpisodeStage, StoryboardScene } from "@/app/lib/types";

type MinimalEpisode = Pick<
  Episode,
  "id" | "number" | "title" | "description" | "cover_image_url" | "status" | "progress" | "duration_seconds" | "kind" | "script" | "scenario" | "created_at" | "updated_at"
>;

// صفحة الحلقة صفحة "مراجعة وتسليم" للعميل — يستمع هذا الاشتراك فقط لجدولي
// الحلقة والاعتماد (بحسب طلب صريح بتقليل Realtime إلى الحالة والاعتماد،
// والملاحظات تُدار محلياً داخل EpisodeNotesSection بلا حاجة لتحديث الصفحة كاملة).
function useEpisodeStatusRealtime(episodeId: string) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`client-episode-status:${episodeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "episodes", filter: `id=eq.${episodeId}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "approvals", filter: `episode_id=eq.${episodeId}` }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router مستقر عبر عمر المكوّن
  }, [episodeId]);
}

export default function EpisodeDetailView({
  episode,
  projectName,
  clientName,
  projectId,
  companyId,
  permissions,
  openNotesCount,
  filesCount,
  latestVideoFile,
  stages,
  stageAssigneeNames,
  storyboardScenes,
  alreadyApproved,
  approvedAt,
  approvalNote,
  userId,
  userName,
}: {
  episode: MinimalEpisode;
  projectName: string;
  clientName: string | null;
  projectId: string;
  companyId: string;
  permissions: ClientPermissions;
  openNotesCount: number;
  filesCount: number;
  latestVideoFile: HeroVideoFile | null;
  stages: EpisodeStage[];
  stageAssigneeNames: Record<string, string>;
  storyboardScenes: StoryboardScene[];
  alreadyApproved: boolean;
  approvedAt: string | null;
  approvalNote: string | null;
  userId: string;
  userName: string | null;
}) {
  useEpisodeStatusRealtime(episode.id);
  const es = episodeStatusMeta(episode.status);

  const showStages = canClient(permissions, "execution_phases") && stages.length > 0;
  const showScript = canClient(permissions, "script") && Boolean(episode.script);
  const showScenario = canClient(permissions, "scenario") && Boolean(episode.scenario);
  const showStoryboard = canClient(permissions, "storyboard") && storyboardScenes.length > 0;
  const canApprove = canClient(permissions, "approve_episodes");

  const [approvalDetailsOpen, setApprovalDetailsOpen] = useState(false);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href={`/client/projects/${projectId}`} className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 13, alignSelf: "flex-start" }}>
        <Icon name="arrowRight" size={16} />
        العودة لكل الحلقات
      </Link>

      {/* رأس الحلقة */}
      <div className="card" style={{ overflow: "hidden" }}>
        {episode.cover_image_url && (
          <div style={{ width: "100%", maxHeight: 220, overflow: "hidden", background: "var(--bg-secondary)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={episode.cover_image_url} alt={episode.title} style={{ width: "100%", height: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
          </div>
        )}
        <div style={{ padding: 18 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{episode.number != null ? `الحلقة ${episode.number}` : "حلقة"}</div>
          <h1 className="page-title-size" style={{ fontSize: 21, fontWeight: 800, marginBottom: 8 }}>{episode.title}</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <StatusChip label={es.label} color={es.color} />
            {isSpecialEpisodeKind(episode.kind) && (
              <span className="chip" style={{ fontSize: 11, color: "var(--gold)", borderColor: "var(--gold)", background: "rgba(var(--gold-rgb),0.12)", fontWeight: 700 }}>
                <Icon name="sparkles" size={12} /> {getEpisodeKindLabel(episode, "")}
              </span>
            )}
          </div>
          {episode.description && (
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 10, whiteSpace: "pre-wrap" }}>{episode.description}</p>
          )}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)" }}>
            {projectName && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="video" size={13} /> {projectName}
              </span>
            )}
            {clientName && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="user" size={13} /> {clientName}
              </span>
            )}
            {episode.duration_seconds != null && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="clock" size={13} /> {formatDate(episode.created_at)}
              </span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="clock" size={13} /> آخر تحديث {relativeTime(episode.updated_at)}
            </span>
          </div>
        </div>
      </div>

      {/* مشغّل الفيديو — أكبر وأهم عنصر في الصفحة */}
      <EpisodeHeroPlayer
        coverImageUrl={episode.cover_image_url}
        file={latestVideoFile}
        companyId={companyId}
        projectId={projectId}
        episodeId={episode.id}
        userId={userId}
        canComment={canClient(permissions, "add_notes")}
        canDownload={canClient(permissions, "download_files")}
        canUploadAttachments={canClient(permissions, "upload_attachments")}
      />

      {/* شريط ملخص مضغوط — أربعة مؤشرات فقط */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        <SummaryTile label="نسبة الإنجاز" value={`${episode.progress ?? 0}%`} icon="barChart" />
        <SummaryTile label="ملاحظات مفتوحة" value={openNotesCount} icon="edit" />
        <SummaryTile label="الملفات" value={filesCount} icon="attachment" />
        <SummaryTile
          label="الاعتماد"
          value={alreadyApproved ? "معتمدة" : "بالانتظار"}
          icon="checkCircle"
          onClick={alreadyApproved ? () => setApprovalDetailsOpen(true) : undefined}
        />
      </div>

      {/* بطاقة الحالة والإجراء المطلوب */}
      <EpisodeStatusCard
        episodeId={episode.id}
        projectId={projectId}
        companyId={companyId}
        currentUserId={userId}
        status={episode.status}
        progress={episode.progress ?? 0}
        alreadyApproved={alreadyApproved}
        approvedAt={approvedAt}
        canApprove={canApprove}
        openNotesCount={openNotesCount}
      />

      {/* الملاحظات والمراجعة */}
      <EpisodeNotesSection
        companyId={companyId}
        projectId={projectId}
        episodeId={episode.id}
        currentUserId={userId}
        currentUserName={userName}
        permissions={permissions}
      />

      {/* الملفات والتحميلات */}
      <EpisodeFilesSection episodeTitle={episode.title} episodeId={episode.id} isApproved={alreadyApproved} permissions={permissions} />

      {/* تفاصيل إضافية — خلف صلاحيات خاصة فقط، مطوية افتراضياً */}
      <EpisodeAdvancedDetails
        showStages={showStages}
        stages={stages}
        stageAssigneeNames={stageAssigneeNames}
        showScript={showScript}
        script={episode.script}
        showScenario={showScenario}
        scenario={episode.scenario}
        showStoryboard={showStoryboard}
        storyboardScenes={storyboardScenes}
      />

      {approvalDetailsOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setApprovalDetailsOpen(false)}>
            <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Icon name="checkCircle" size={20} className="nav-icon" />
                <h3 style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>تفاصيل الاعتماد</h3>
                <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={() => setApprovalDetailsOpen(false)}>
                  <Icon name="close" size={18} />
                </button>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                تم الاعتماد {approvedAt ? `بتاريخ ${formatDate(approvedAt)}` : ""}
              </p>
              {approvalNote && <p style={{ fontSize: 13.5, background: "var(--bg-secondary)", borderRadius: 10, padding: 12 }}>{approvalNote}</p>}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

function SummaryTile({ label, value, icon, onClick }: { label: string; value: string | number; icon: Parameters<typeof Icon>[0]["name"]; onClick?: () => void }) {
  const content = (
    <>
      <Icon name={icon} size={16} className="text-muted" />
      <div style={{ fontSize: 15, fontWeight: 800, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </>
  );
  const style: React.CSSProperties = { padding: "12px 8px", textAlign: "center" };
  return onClick ? (
    <button type="button" onClick={onClick} className="card" style={{ ...style, cursor: "pointer", border: "1px solid var(--border)" }}>
      {content}
    </button>
  ) : (
    <div className="card" style={style}>
      {content}
    </div>
  );
}
