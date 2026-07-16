import Icon from "@/app/components/ui/Icon";
import type { BookletData } from "@/app/lib/booklet-sections";
import type { PresentationTheme } from "@/app/lib/presentation-themes";
import { HighlightedText } from "@/app/lib/presentation-highlight";
import type { BookletTexts } from "@/app/lib/types";
import { Slide, SlideTitle, CompanyContactBlock } from "@/app/components/projects/presentation/sections/EasySections";
import { formatDate } from "@/app/components/projects/utils";
import { PROJECT_TYPES } from "@/app/lib/constants";
import { DonutChart } from "./BookletCharts";

export interface BookletSectionProps {
  data: BookletData;
  texts: BookletTexts;
  theme: PresentationTheme;
}

export function StatCard({ theme, icon, value, label }: { theme: PresentationTheme; icon: Parameters<typeof Icon>[0]["name"]; value: string | number; label: string }) {
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 18, textAlign: "center" }}>
      <Icon name={icon} size={20} className="text-muted" />
      <div style={{ fontSize: 26, fontWeight: 900, color: theme.accent, marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function formatSecondsShort(totalSeconds: number): string {
  if (totalSeconds <= 0) return "—";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}س ${minutes}د`;
  return `${minutes}د`;
}

function projectTypeLabel(data: BookletData): string {
  if (data.services.length === 0) return "";
  return PROJECT_TYPES.find((t) => t.value === data.services[0]?.category)?.label ?? "";
}

export function BookletCoverSection({ data, theme }: BookletSectionProps) {
  return (
    <Slide
      theme={theme}
      style={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        backgroundImage: data.projectCoverUrl ? `linear-gradient(rgba(0,0,0,0.62),rgba(0,0,0,0.62)), url(${data.projectCoverUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: data.projectCoverUrl ? "#fff" : theme.text,
      }}
    >
      {data.companyLogoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.companyLogoUrl} alt="" style={{ maxHeight: 100, maxWidth: "50%", marginBottom: 24, objectFit: "contain" }} />
      )}
      <div style={{ fontSize: 12, letterSpacing: 4, color: theme.accent, marginBottom: 10, textTransform: "uppercase" }}>Final Production Book</div>
      <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.65, marginBottom: 20 }}>كتيّب توثيق المشروع النهائي</div>
      <h1 style={{ fontSize: 42, fontWeight: 900 }}>{data.projectName}</h1>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
        {projectTypeLabel(data) && (
          <span style={{ fontSize: 11, padding: "5px 14px", borderRadius: 999, border: `1px solid ${theme.accent}`, color: theme.accent }}>{projectTypeLabel(data)}</span>
        )}
        {data.clientName && (
          <span style={{ fontSize: 11, padding: "5px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.35)", opacity: 0.9 }}>العميل: {data.clientName}</span>
        )}
      </div>
      {data.clientLogoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.clientLogoUrl} alt="" style={{ maxHeight: 48, maxWidth: "30%", marginTop: 22, objectFit: "contain", opacity: 0.9 }} />
      )}
      {data.projectDeliveredDate && <div style={{ fontSize: 12, marginTop: 20, opacity: 0.65 }}>تاريخ التسليم: {formatDate(data.projectDeliveredDate)}</div>}
      <div style={{ fontSize: 12, marginTop: 26, opacity: 0.6 }}>{data.companyName}</div>
    </Slide>
  );
}

// فهرس حقيقي: كل بند رابط داخلي فعلي (href="#section-key") — يبقى تفاعلياً في
// تصدير PDF من متصفحات Chrome/Firefox عند الطباعة، وفي نسخة HTML كاملاً.
export function TocSection({ theme, entries }: { theme: PresentationTheme; entries: { key: string; label: string; page: number }[] }) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الفهرس</SlideTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 32px", overflowY: "auto" }}>
        {entries.map((e) => (
          <a
            key={e.key}
            href={`#section-${e.key}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
              padding: "8px 0",
              borderBottom: `1px dashed ${theme.border}`,
              color: theme.text,
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            <span>{e.label}</span>
            <span style={{ color: theme.accent, fontWeight: 700 }}>{e.page}</span>
          </a>
        ))}
      </div>
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

export function ClientCardSection({ data, theme }: BookletSectionProps) {
  const c = data.client;
  const rows: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string }[] = [
    { icon: "clients", label: "اسم العميل", value: c.name || "—" },
    { icon: "company", label: "الشركة", value: c.companyName || "—" },
    { icon: "mail", label: "البريد الإلكتروني", value: c.email || "—" },
    { icon: "phone", label: "الهاتف", value: c.phone || "—" },
    { icon: "location", label: "المدينة", value: c.city || "—" },
    { icon: "calendar", label: "بداية المشروع", value: formatDate(data.projectStartDate) },
    { icon: "badgeCheck", label: "تاريخ التسليم", value: data.projectDeliveredDate ? formatDate(data.projectDeliveredDate) : "قيد التسليم" },
    { icon: "clock", label: "مدة التنفيذ", value: data.daysElapsed != null ? `${data.daysElapsed} يوم` : "—" },
  ];
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>بيانات العميل</SlideTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: theme.accent, color: "#0A0A0B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={r.icon} size={16} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: theme.muted }}>{r.label}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: theme.text }}>{r.value}</div>
            </div>
          </div>
        ))}
      </div>
    </Slide>
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
  const overallProgress = data.totalEpisodes > 0 ? Math.round((data.completedEpisodes / data.totalEpisodes) * 100) : 0;
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الإنجازات بالأرقام</SlideTitle>
      <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 20 }}>
        <DonutChart theme={theme} percentage={overallProgress} label="نسبة الإنجاز الكلية" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, flex: 1 }}>
          <StatCard theme={theme} icon="episodes" value={data.totalEpisodes} label="إجمالي العناصر" />
          <StatCard theme={theme} icon="checkCircle" value={data.completedEpisodes} label="عناصر مكتملة" />
          <StatCard theme={theme} icon="files" value={data.totalFiles} label="ملف ومخرج" />
          <StatCard theme={theme} icon="clock" value={formatSecondsShort(data.totalDurationSeconds)} label="إجمالي مدة المحتوى" />
        </div>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.9, color: theme.text, opacity: 0.9, whiteSpace: "pre-wrap" }}>
        <HighlightedText theme={theme} text={texts.achievements_summary || "—"} />
      </p>
    </Slide>
  );
}

const ACTIVITY_ICON: Record<string, Parameters<typeof Icon>[0]["name"]> = {
  upload: "upload",
  edit: "edit",
  approval: "badgeCheck",
  note: "message",
  stage: "tasks",
  other: "info",
};

export function ActivityLogSection({ data, theme }: BookletSectionProps) {
  const log = data.activityLog;
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>سجل ما تم تنفيذه</SlideTitle>
      {log.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا يوجد سجل نشاط مسجَّل بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
          {log.map((entry) => (
            <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "9px 14px" }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: theme.accent,
                  color: "#0A0A0B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name={ACTIVITY_ICON[entry.category] ?? "info"} size={13} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: theme.text }}>{entry.label}</div>
                {entry.episodeTitle && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 2 }}>{entry.episodeTitle}</div>}
              </div>
              <div style={{ fontSize: 10.5, color: theme.muted, whiteSpace: "nowrap" }}>{formatDate(entry.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}

export function BookletGallerySection({ data, theme }: BookletSectionProps) {
  const images = data.galleryImagesExtended;
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>خلف الكواليس والمعرض</SlideTitle>
      {images.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد صور مضافة بعد.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gridAutoRows: "minmax(70px, 1fr)", gap: 8, overflowY: "auto" }}>
          {images.map((img, i) => (
            <div
              key={img.id}
              style={{
                borderRadius: 10,
                overflow: "hidden",
                border: `1px solid ${theme.border}`,
                gridColumn: i % 7 === 0 ? "span 2" : "span 1",
                gridRow: i % 7 === 0 ? "span 2" : "span 1",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
