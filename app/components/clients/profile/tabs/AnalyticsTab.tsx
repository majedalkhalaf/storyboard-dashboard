"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { fetchClientAnalytics, type ClientAnalyticsData, type ClientAnalyticsTimelineItem } from "@/app/lib/client-profile";
import { formatDateTime, relativeTime } from "@/app/components/projects/utils";

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0 دقيقة";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} ساعة ${minutes} د`;
  return `${minutes} دقيقة`;
}

export default function AnalyticsTab({ clientId }: { clientId: string }) {
  const [data, setData] = useState<ClientAnalyticsData | null>(null);

  useEffect(() => {
    fetchClientAnalytics(clientId).then(setData);
  }, [clientId]);

  if (data === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skeleton" style={{ height: 100, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 60, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 60, borderRadius: 10 }} />
      </div>
    );
  }

  if (!data.hasPortalAccess) {
    return (
      <div className="empty-state card" style={{ padding: 30 }}>
        <Icon name="barChart" size={30} className="text-muted" />
        <p style={{ marginTop: 8 }}>هذا العميل لا يملك دخولاً إلى بوابة العميل بعد، فلا يوجد نشاط لتحليله.</p>
      </div>
    );
  }

  const { stats, timeline } = data;
  const cards: { label: string; value: string; icon: Parameters<typeof Icon>[0]["name"]; color: string }[] = [
    { label: "مرات الدخول", value: String(stats.totalLogins), icon: "user", color: "#22C55E" },
    { label: "إجمالي الوقت", value: formatDuration(stats.totalTimeSeconds), icon: "clock", color: "var(--gold)" },
    { label: "متوسط مدة الجلسة", value: formatDuration(stats.avgSessionSeconds), icon: "timeline", color: "#3987e5" },
    { label: "الصفحات المُزارة", value: String(stats.pageViews), icon: "eye", color: "#3987e5" },
    { label: "الحلقات المُشاهدة", value: String(stats.episodesViewed), icon: "episodes", color: "#8B5CF6" },
    { label: "الملفات المُحمَّلة", value: String(stats.filesDownloaded), icon: "export", color: "#3987e5" },
    { label: "الفيديوهات المُشاهدة", value: String(stats.videosWatched), icon: "video", color: "#F59E0B" },
    { label: "تعليقات الفيديو", value: String(stats.videoComments), icon: "message", color: "#8B5CF6" },
    { label: "طلبات التعديل", value: String(stats.editRequests), icon: "edit", color: "#8B5CF6" },
    { label: "الاعتمادات", value: String(stats.approvals), icon: "badgeCheck", color: "var(--success)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <span style={{ color: c.color, display: "inline-flex" }}>
              <Icon name={c.icon} size={16} />
            </span>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 8 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>سجل النشاط التفصيلي</h3>
        <AnalyticsTimeline items={timeline} />
      </div>
    </div>
  );
}

function AnalyticsTimeline({ items }: { items: ClientAnalyticsTimelineItem[] }) {
  if (items.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="clock" size={26} className="text-muted" />
        <p style={{ marginTop: 8 }}>لا يوجد نشاط مسجَّل بعد</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 640, overflowY: "auto" }}>
      {items.map((item) => (
        <div key={item.id} style={{ display: "flex", gap: 12, padding: "10px 4px", borderBottom: "1px solid var(--border)" }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: `${item.color}1a`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: item.color,
              flexShrink: 0,
            }}
          >
            <Icon name={item.icon} size={15} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</div>
            {item.subtitle && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>{item.subtitle}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10.5, color: "var(--text-muted)", marginTop: 3 }} title={formatDateTime(item.at)}>
              <span>{relativeTime(item.at)} · {formatDateTime(item.at)}</span>
              {item.device && <span>· {item.device}</span>}
              {item.browser && <span>· {item.browser}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
