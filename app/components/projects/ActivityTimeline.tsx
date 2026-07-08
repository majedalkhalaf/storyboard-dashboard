"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { USER_ROLE_LABELS } from "@/app/lib/constants";
import { relativeTime, formatDateTime } from "./utils";

export interface ActivityItem {
  id: string;
  actor_role: string | null;
  actor_name: string | null;
  actor_job_title?: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  project_created: "أنشأ المشروع",
  project_updated: "حدّث بيانات المشروع",
  project_status_changed: "غيّر حالة المشروع",
  project_duplicated: "كرّر المشروع",
  episode_created: "أضاف حلقة جديدة",
  episode_updated: "حدّث الحلقة",
  episode_status_changed: "غيّر حالة الحلقة",
  episode_stage_updated: "حدّث مرحلة تنفيذ",
  episode_stage_changed: "غيّر مرحلة التنفيذ",
  episode_title_changed: "غيّر عنوان الحلقة",
  episode_deleted: "حذف الحلقة",
  episode_duplicated: "كرّر الحلقة",
  approval_revoked: "أعاد فتح حلقة للمراجعة",
  note_added: "أضاف ملاحظة",
  note_updated: "عدّل ملاحظة",
  note_deleted: "حذف ملاحظة",
  video_comment_added: "أضاف تعليقاً على الفيديو",
  video_link_added: "أضاف رابط فيديو",
  episode_script_version_saved: "حفظ نسخة من السكربت/السيناريو",
  file_uploaded: "رفع ملفاً",
  file_deleted: "حذف ملفاً",
  file_replaced: "استبدل ملفاً",
  expense_added: "أضاف مصروفاً",
  payment_added: "أضاف دفعة",
  payment_updated: "عدّل دفعة",
  payment_marked_paid: "أكّد استلام دفعة",
};

function describe(item: ActivityItem): string {
  const base = ACTION_LABELS[item.action] ?? item.action;
  const d = item.details ?? {};
  if (item.action === "project_status_changed" || item.action === "episode_status_changed" || item.action === "episode_stage_changed") {
    if (d.from && d.to) return `${base} من «${d.from}» إلى «${d.to}»`;
  }
  if (item.action === "episode_stage_updated" && d.stage) {
    return `${base}: ${d.stage}${d.to ? ` → ${d.to}` : ""}`;
  }
  if ((item.action === "episode_created" || item.action === "project_created") && d.title) return `${base}: ${d.title}`;
  if (item.action === "project_created" && d.name) return `${base}: ${d.name}`;
  if (item.action === "episode_title_changed" && d.from && d.to) return `${base}: من «${d.from}» إلى «${d.to}»`;
  if (item.action === "video_comment_added" && d.at) return `${base} عند ${d.at}`;
  if ((item.action === "file_uploaded" || item.action === "file_deleted" || item.action === "file_replaced") && typeof d.name === "string") {
    return `${base}: ${d.name}`;
  }
  if ((item.action === "expense_added" || item.action === "payment_added" || item.action === "payment_updated" || item.action === "payment_marked_paid") && typeof d.amount === "number") {
    return `${base}: ${d.amount.toLocaleString("en-US")} ر.س${d.title ? ` (${d.title})` : ""}`;
  }
  return base;
}

export default function ActivityTimeline({ items, limit }: { items: ActivityItem[]; limit?: number }) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="clock" size={30} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا يوجد نشاط بعد</p>
      </div>
    );
  }

  const capped = !!limit && items.length > limit && !expanded;
  const visible = capped ? items.slice(0, limit) : items;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {visible.map((item) => (
        <div key={item.id} style={{ display: "flex", gap: 10, padding: "8px 4px", borderBottom: "1px solid var(--border)" }}>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "var(--bg-hover)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gold)",
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            <Icon name="clock" size={12} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700 }}>{item.actor_name || USER_ROLE_LABELS[item.actor_role ?? ""] || "مستخدم"}</span>
              {item.actor_job_title && <span style={{ color: "var(--text-muted)", fontSize: 11 }}> ({item.actor_job_title})</span>}{" "}
              <span style={{ color: "var(--text-secondary)" }}>{describe(item)}</span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 1 }} title={formatDateTime(item.created_at)}>
              {relativeTime(item.created_at)}
            </div>
          </div>
        </div>
      ))}
      {capped && (
        <button
          className="btn-ghost"
          onClick={() => setExpanded(true)}
          style={{ fontSize: 12, padding: "10px 4px", color: "var(--gold)", textAlign: "center", fontWeight: 600 }}
        >
          عرض كل النشاطات ({items.length})
        </button>
      )}
    </div>
  );
}
