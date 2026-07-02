"use client";

import Icon from "@/app/components/ui/Icon";
import { USER_ROLE_LABELS } from "@/app/lib/constants";
import { relativeTime } from "./utils";

export interface ActivityItem {
  id: string;
  actor_role: string | null;
  actor_name: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  project_created: "أنشأ المشروع",
  project_updated: "حدّث بيانات المشروع",
  project_status_changed: "غيّر حالة المشروع",
  episode_created: "أضاف حلقة جديدة",
  episode_updated: "حدّث الحلقة",
  episode_status_changed: "غيّر حالة الحلقة",
  episode_stage_updated: "حدّث مرحلة تنفيذ",
  approval_revoked: "أعاد فتح حلقة للمراجعة",
  note_added: "أضاف ملاحظة",
};

function describe(item: ActivityItem): string {
  const base = ACTION_LABELS[item.action] ?? item.action;
  const d = item.details ?? {};
  if (item.action === "project_status_changed" || item.action === "episode_status_changed") {
    if (d.from && d.to) return `${base} من «${d.from}» إلى «${d.to}»`;
  }
  if (item.action === "episode_stage_updated" && d.stage) {
    return `${base}: ${d.stage}${d.to ? ` → ${d.to}` : ""}`;
  }
  if ((item.action === "episode_created" || item.action === "project_created") && d.title) return `${base}: ${d.title}`;
  if (item.action === "project_created" && d.name) return `${base}: ${d.name}`;
  return base;
}

export default function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="clock" size={30} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا يوجد نشاط بعد</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {items.map((item) => (
        <div key={item.id} style={{ display: "flex", gap: 12, padding: "12px 4px", borderBottom: "1px solid var(--border)" }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "var(--bg-hover)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gold)",
              flexShrink: 0,
            }}
          >
            <Icon name="clock" size={16} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 700 }}>{item.actor_name || USER_ROLE_LABELS[item.actor_role ?? ""] || "مستخدم"}</span>{" "}
              <span style={{ color: "var(--text-secondary)" }}>{describe(item)}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{relativeTime(item.created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
