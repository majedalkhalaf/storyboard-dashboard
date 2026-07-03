"use client";

import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import StatusChip from "@/app/components/client/StatusChip";
import FileList from "@/app/components/client/FileList";
import NotesThread from "@/app/components/client/NotesThread";
import ApproveEpisode from "@/app/components/client/ApproveEpisode";
import { canClient } from "@/app/lib/permissions";
import { episodeStatusMeta, relativeTime } from "@/app/components/client/utils";
import { STAGE_STATUSES } from "@/app/lib/constants";
import type { ClientPermissions, Episode, EpisodeStage, Note, ProjectFile } from "@/app/lib/types";

export default function EpisodeDetailView({
  episode,
  projectId,
  companyId,
  permissions,
  files,
  stages,
  notes,
  alreadyApproved,
  userId,
  userName,
}: {
  episode: Episode;
  projectId: string;
  companyId: string;
  permissions: ClientPermissions;
  files: ProjectFile[];
  stages: EpisodeStage[];
  notes: Note[];
  alreadyApproved: boolean;
  userId: string;
  userName: string | null;
}) {
  const es = episodeStatusMeta(episode.status);
  const images = files.filter((f) => f.category === "image");
  const mediaFiles = files.filter((f) => f.category !== "image");

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
      <Link href={`/client/projects/${projectId}`} className="btn btn-ghost" style={{ padding: "4px 8px", marginBottom: 12, fontSize: 13 }}>
        <Icon name="arrowRight" size={16} />
        العودة للمشروع
      </Link>

      {/* رأس الحلقة */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
        {episode.cover_image_url && (
          <div style={{ background: "#000", display: "flex", justifyContent: "center", maxHeight: 300, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={episode.cover_image_url} alt={episode.title} style={{ width: "100%", maxHeight: 300, objectFit: "contain" }} />
          </div>
        )}
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                {episode.number != null ? `الحلقة ${episode.number}` : "حلقة"} · آخر تحديث {relativeTime(episode.updated_at)}
              </div>
              <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{episode.title}</h1>
              <StatusChip label={es.label} color={es.color} />
            </div>
            <ApproveEpisode
              episodeId={episode.id}
              projectId={projectId}
              companyId={companyId}
              currentUserId={userId}
              status={episode.status}
              alreadyApproved={alreadyApproved}
              canApprove={canClient(permissions, "approve_episodes")}
              variant="detail"
            />
          </div>

          {episode.description && (
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {episode.description}
            </p>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 5 }}>
              <span>نسبة الإنجاز</span>
              <span style={{ fontWeight: 800, color: "var(--gold)" }}>{episode.progress ?? 0}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${episode.progress ?? 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* مراحل التنفيذ */}
      {canClient(permissions, "execution_phases") && stages.length > 0 && (
        <Section title="مراحل التنفيذ" icon="templates">
          <StagesTimeline stages={stages} />
        </Section>
      )}

      {/* الملفات والوسائط */}
      {canClient(permissions, "files") && (
        <Section title="الملفات والوسائط" icon="attachment">
          <FileList files={mediaFiles} permissions={permissions} emptyLabel="لا توجد ملفات لهذه الحلقة بعد." />
        </Section>
      )}

      {/* الستوري بورد */}
      {canClient(permissions, "storyboard") && (
        <Section title="الستوري بورد" icon="image">
          {images.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <Icon name="image" size={26} className="nav-icon" />
              <p style={{ marginTop: 6, fontSize: 13 }}>لا توجد لوحات ستوري بورد بعد.</p>
            </div>
          ) : (
            <StoryboardGallery images={images} />
          )}
        </Section>
      )}

      {/* السكربت */}
      {canClient(permissions, "script") && episode.script && (
        <Section title="السكربت" icon="edit">
          <div className="card" style={{ padding: 16 }}>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 14 }}>{episode.script}</p>
          </div>
        </Section>
      )}

      {/* السيناريو */}
      {canClient(permissions, "scenario") && episode.scenario && (
        <Section title="السيناريو" icon="edit">
          <div className="card" style={{ padding: 16 }}>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 14 }}>{episode.scenario}</p>
          </div>
        </Section>
      )}

      {/* الملاحظات */}
      <Section title="الملاحظات" icon="message">
        <NotesThread
          companyId={companyId}
          projectId={projectId}
          episodeId={episode.id}
          targetType="episode"
          targetId={episode.id}
          currentUserId={userId}
          currentUserName={userName}
          permissions={permissions}
          initialNotes={notes}
        />
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ComponentProps<typeof Icon>["name"]; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon name={icon} size={18} className="nav-icon" />
        <h2 style={{ fontSize: 16, fontWeight: 800 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StagesTimeline({ stages }: { stages: EpisodeStage[] }) {
  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 2 }}>
      {stages.map((stage, idx) => {
        const meta = STAGE_STATUSES.find((s) => s.value === stage.status) ?? STAGE_STATUSES[0];
        const done = stage.status === "completed";
        return (
          <div key={stage.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "stretch" }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: done ? meta.color : "var(--bg-hover)",
                  border: `2px solid ${meta.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: done ? "#0A0A0B" : meta.color,
                }}
              >
                {done ? <Icon name="check" size={13} /> : <Icon name="circle" size={8} />}
              </div>
              {idx < stages.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 24, background: "var(--border)" }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{stage.label}</span>
                <StatusChip label={meta.label} color={meta.color} />
              </div>
              {stage.status === "in_progress" && (
                <div className="progress-bar" style={{ marginTop: 8 }}>
                  <div className="progress-fill" style={{ width: `${stage.progress ?? 0}%` }} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StoryboardGallery({ images }: { images: ProjectFile[] }) {
  async function openImage(file: ProjectFile) {
    if (file.external_url) {
      window.open(file.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      const res = await fetch(`/api/client-portal/files/${file.id}`);
      const json = (await res.json()) as { url?: string };
      if (json.url) window.open(json.url, "_blank", "noopener,noreferrer");
    } catch {
      /* تجاهل */
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
      {images.map((img) => (
        <button
          key={img.id}
          onClick={() => openImage(img)}
          className="shot-card"
          style={{ padding: 0, overflow: "hidden", cursor: "pointer", aspectRatio: "4 / 3", position: "relative", border: "1px solid var(--border)" }}
        >
          {img.external_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.external_url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--text-muted)" }}>
              <Icon name="image" size={26} />
              <span style={{ fontSize: 11 }}>عرض الصورة</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
