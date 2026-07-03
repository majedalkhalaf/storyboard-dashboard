"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { EPISODE_STATUSES } from "@/app/lib/constants";
import type { EpisodeFullDetail } from "@/app/lib/episode-detail";
import { formatDate, relativeTime } from "./utils";

// الحالات التي يجب أن يبقى فيها الفريق قادراً على "إرسال الحلقة للعميل
// للاعتماد" — أي حالة قبل ready_for_approval نفسها؛ بعدها ينتقل التحكم
// لبوابة العميل (اعتماد) أو يبقى الفريق بانتظار رده.
const SENDABLE_STATUSES = new Set(["not_started", "in_progress", "in_review"]);

export default function EpisodeSidebar({ episode, clientName }: { episode: EpisodeFullDetail; clientName: string | null }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(episode.status);
  const status = EPISODE_STATUSES.find((s) => s.value === currentStatus);
  const activeApproval = episode.approvals.find((a) => !a.revoked_at);
  const activeStage = [...episode.stages].reverse().find((s) => s.status === "in_progress") ?? [...episode.stages].reverse().find((s) => s.status === "completed");

  async function sendToClient() {
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.from("episodes").update({ status: "ready_for_approval" }).eq("id", episode.id);
    setSending(false);
    if (!error) {
      setCurrentStatus("ready_for_approval");
      router.refresh();
    }
  }

  const rows: { icon: "checkCircle" | "video" | "user" | "clients" | "calendar" | "clock" | "fileCheck" | "attachment" | "message" | "shield"; label: string; value: string }[] = [
    { icon: "checkCircle", label: "الحالة", value: status?.label ?? "—" },
    { icon: "video", label: "المرحلة الحالية", value: activeStage?.label ?? "لم يبدأ" },
    { icon: "user", label: "المسؤول", value: episode.assigned_to_name ?? "غير مسند" },
    { icon: "clients", label: "العميل", value: clientName ?? "بدون عميل" },
    { icon: "calendar", label: "تاريخ الإنشاء", value: formatDate(episode.created_at) },
    { icon: "clock", label: "آخر تعديل", value: relativeTime(episode.updated_at) },
  ];

  const stats: { icon: "fileCheck" | "attachment" | "message" | "shield"; label: string; value: number }[] = [
    { icon: "fileCheck", label: "نسخ السكربت", value: episode.scriptVersions.length },
    { icon: "attachment", label: "الملفات", value: episode.files.length },
    { icon: "message", label: "الملاحظات", value: episode.notes.length + episode.comments.length },
    { icon: "shield", label: "الاعتمادات", value: episode.approvals.length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>معلومات الحلقة</h3>
          {activeApproval && (
            <span className="chip" style={{ color: "#1DB954", borderColor: "#1DB954", fontSize: 11 }}>
              <Icon name="badgeCheck" size={12} /> معتمدة
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
            <span>نسبة الإنجاز</span>
            <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{Math.round(episode.progress)}%</span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${episode.progress}%` }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
                <Icon name={r.icon} size={13} /> {r.label}
              </span>
              <span style={{ fontWeight: 600, textAlign: "left" }}>{r.value}</span>
            </div>
          ))}
        </div>

        {SENDABLE_STATUSES.has(currentStatus) && (
          <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} disabled={sending} onClick={sendToClient}>
            <Icon name="send" size={14} /> {sending ? "جارٍ الإرسال..." : "إرسال الحلقة للعميل للاعتماد"}
          </button>
        )}
        {currentStatus === "ready_for_approval" && (
          <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="clock" size={13} /> بانتظار اعتماد العميل
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12 }}>ملخص سريع</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "var(--gold)" }}>
                <Icon name={s.icon} size={16} />
              </span>
              <span style={{ fontSize: 17, fontWeight: 800 }}>{s.value}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
