import Icon from "@/app/components/ui/Icon";
import BeforeAfterSlider from "@/app/components/ui/BeforeAfterSlider";
import { MediaGallery } from "@/app/components/projects/sections/ProjectBehindScenesSection";
import { PROGRESS_UPDATE_STAGES } from "@/app/lib/constants";
import { relativeTime, projectHashtag } from "@/app/components/client/utils";
import type { ProgressUpdateContentType, ProgressUpdateMediaItem, ProgressUpdateStage } from "@/app/lib/types";

export interface ClientProgressUpdate {
  id: string;
  projectId: string;
  projectName: string;
  episodeTitle: string | null;
  authorName: string | null;
  title: string | null;
  description: string | null;
  stage: ProgressUpdateStage;
  contentType: ProgressUpdateContentType;
  media: ProgressUpdateMediaItem[];
  createdAt: string;
}

// بطاقة تحديث "العمل الجاري" — نفس المكوّن يُستخدم داخل تبويب المشروع، والصفحة
// المجمّعة، وملخّص الصفحة الرئيسية. اسم الناشر الحقيقي يظهر هنا بناءً على طلب
// صريح (بخلاف بقية أقسام التواصل التي تُخفي هوية العضو الداخلي عن العميل).
export default function ProgressUpdateCard({ update, showProjectHashtag = false }: { update: ClientProgressUpdate; showProjectHashtag?: boolean }) {
  const stageMeta = PROGRESS_UPDATE_STAGES.find((s) => s.value === update.stage);
  const before = update.media.find((m) => m.label === "before") ?? update.media[0];
  const after = update.media.find((m) => m.label === "after") ?? update.media[1];

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div>
          {showProjectHashtag && <div style={{ fontSize: 11.5, color: "var(--gold)", fontWeight: 700, marginBottom: 4 }}>{projectHashtag(update.projectName)}</div>}
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
            {stageMeta && (
              <span className="chip" style={{ fontSize: 10.5, color: stageMeta.color, borderColor: stageMeta.color, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name={stageMeta.icon} size={11} /> {stageMeta.label}
              </span>
            )}
            {update.episodeTitle && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· {update.episodeTitle}</span>}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{update.authorName ?? "عضو الفريق"}</div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{relativeTime(update.createdAt)}</div>
      </div>

      {update.title && <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{update.title}</h3>}
      {update.description && <p style={{ fontSize: 13.5, color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: update.media.length ? 12 : 0 }}>{update.description}</p>}

      {update.contentType === "comparison" && before && after ? <BeforeAfterSlider before={before} after={after} /> : update.media.length > 0 && <MediaGallery media={update.media} variant="full" />}
    </div>
  );
}
