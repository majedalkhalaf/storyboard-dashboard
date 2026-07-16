import Icon from "@/app/components/ui/Icon";
import type { BookletData } from "@/app/lib/booklet-sections";
import type { PresentationTheme } from "@/app/lib/presentation-themes";
import { HighlightedText } from "@/app/lib/presentation-highlight";
import type { BookletTexts } from "@/app/lib/types";
import { Slide, SlideTitle, CompanyContactBlock } from "@/app/components/projects/presentation/sections/EasySections";
import { formatDate } from "@/app/components/projects/utils";

export interface BookletSectionProps {
  data: BookletData;
  texts: BookletTexts;
  theme: PresentationTheme;
}

export function BookletCoverSection({ data, theme }: BookletSectionProps) {
  return (
    <Slide
      theme={theme}
      style={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        backgroundImage: data.projectCoverUrl ? `linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.6)), url(${data.projectCoverUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: data.projectCoverUrl ? "#fff" : theme.text,
      }}
    >
      {data.companyLogoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.companyLogoUrl} alt="" style={{ maxHeight: 110, maxWidth: "55%", marginBottom: 28, objectFit: "contain" }} />
      )}
      <div style={{ fontSize: 12, letterSpacing: 3, color: theme.accent, marginBottom: 10 }}>كتيّب تسليم المشروع النهائي</div>
      <h1 style={{ fontSize: 44, fontWeight: 900 }}>{data.projectName}</h1>
      {data.clientName && <div style={{ fontSize: 16, marginTop: 16, opacity: 0.85 }}>تسليم إلى: {data.clientName}</div>}
      {data.projectDeliveredDate && <div style={{ fontSize: 13, marginTop: 10, opacity: 0.7 }}>تاريخ التسليم: {formatDate(data.projectDeliveredDate)}</div>}
      <div style={{ fontSize: 12, marginTop: 28, opacity: 0.6 }}>{data.companyName}</div>
    </Slide>
  );
}

export function HandoverMessageSection({ data, texts, theme }: BookletSectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>رسالة التسليم</SlideTitle>
      <p style={{ fontSize: 16, lineHeight: 2, color: theme.text, opacity: 0.9, whiteSpace: "pre-wrap" }}>
        <HighlightedText theme={theme} text={texts.handover_message || `يسعدنا تسليمكم مشروع **${data.projectName}** بعد رحلة عمل متكاملة.`} />
      </p>
    </Slide>
  );
}

function StatCard({ theme, icon, value, label }: { theme: PresentationTheme; icon: Parameters<typeof Icon>[0]["name"]; value: string | number; label: string }) {
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 18, textAlign: "center" }}>
      <Icon name={icon} size={20} className="text-muted" />
      <div style={{ fontSize: 26, fontWeight: 900, color: theme.accent, marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function ProjectOverviewSection({ data, theme }: BookletSectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>نظرة عامة على المشروع</SlideTitle>
      {data.projectDescription && (
        <p style={{ fontSize: 14, lineHeight: 1.9, color: theme.text, opacity: 0.85, whiteSpace: "pre-wrap", marginBottom: 20 }}>{data.projectDescription}</p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatCard theme={theme} icon="calendar" value={formatDate(data.projectStartDate)} label="تاريخ البدء" />
        <StatCard theme={theme} icon="badgeCheck" value={data.projectDeliveredDate ? formatDate(data.projectDeliveredDate) : "قيد التسليم"} label="تاريخ التسليم" />
        <StatCard theme={theme} icon="clock" value={data.daysElapsed != null ? `${data.daysElapsed} يوم` : "—"} label="مدة التنفيذ" />
        <StatCard theme={theme} icon="location" value={data.locations.length || "—"} label="عدد المواقع" />
      </div>
      {data.services.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 24 }}>
          {data.services.map((s, i) => (
            <span key={i} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 999, background: theme.accent, color: "#0A0A0B", fontWeight: 700 }}>
              {s.label}
            </span>
          ))}
        </div>
      )}
    </Slide>
  );
}

export function AchievementsSection({ data, texts, theme }: BookletSectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الإنجازات بالأرقام</SlideTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard theme={theme} icon="episodes" value={data.totalEpisodes} label="إجمالي العناصر" />
        <StatCard theme={theme} icon="checkCircle" value={data.completedEpisodes} label="عناصر مكتملة" />
        <StatCard theme={theme} icon="files" value={data.totalFiles} label="ملف ومخرج" />
        <StatCard theme={theme} icon="clock" value={formatSecondsShort(data.totalDurationSeconds)} label="إجمالي مدة المحتوى" />
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.9, color: theme.text, opacity: 0.9, whiteSpace: "pre-wrap" }}>
        <HighlightedText theme={theme} text={texts.achievements_summary || "—"} />
      </p>
    </Slide>
  );
}

function formatSecondsShort(totalSeconds: number): string {
  if (totalSeconds <= 0) return "—";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}س ${minutes}د`;
  return `${minutes}د`;
}

export function ActivityLogSection({ data, theme }: BookletSectionProps) {
  const log = data.activityLog;
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>سجل ما تم تنفيذه</SlideTitle>
      {log.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا يوجد سجل نشاط مسجَّل بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {log.map((entry) => (
            <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: theme.text }}>{entry.label}</div>
                {entry.episodeTitle && <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>{entry.episodeTitle}</div>}
              </div>
              <div style={{ fontSize: 11, color: theme.muted, whiteSpace: "nowrap" }}>{formatDate(entry.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}

export function BookletClosingSection({ data, texts, theme }: BookletSectionProps) {
  return (
    <Slide theme={theme} style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, color: theme.accent }}>
        <HighlightedText theme={theme} text={texts.closing_message || "شكراً لثقتكم بنا"} />
      </h1>
      <p style={{ fontSize: 13, color: theme.muted, marginTop: 20 }}>{data.companyName}</p>
      <CompanyContactBlock data={data} theme={theme} />
    </Slide>
  );
}
