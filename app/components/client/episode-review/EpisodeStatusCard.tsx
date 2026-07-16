"use client";

import Icon from "@/app/components/ui/Icon";
import ApproveEpisode from "@/app/components/client/ApproveEpisode";
import { episodeStatusMeta } from "@/app/components/client/utils";
import type { EpisodeStatus } from "@/app/lib/types";

interface ReviewState {
  message: string;
  action: "approve" | "note" | "download" | "none";
}

function computeReviewState(status: EpisodeStatus, alreadyApproved: boolean, canApprove: boolean, openNotesCount: number): ReviewState {
  if (alreadyApproved || status === "delivered") {
    return { message: "تم اعتماد الحلقة وتسليمها بنجاح.", action: "download" };
  }
  if (status === "ready_for_approval") {
    return canApprove
      ? { message: "الحلقة جاهزة لمراجعتك. شاهد النسخة وأرسل ملاحظاتك أو اعتمدها.", action: "approve" }
      : { message: "الحلقة جاهزة لمراجعتك. شاهد النسخة وأرسل ملاحظاتك.", action: "note" };
  }
  if (openNotesCount > 0) {
    return { message: "يجري حالياً تنفيذ التعديلات المطلوبة.", action: "none" };
  }
  return { message: "لا يوجد إجراء مطلوب منك حالياً.", action: "none" };
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// بطاقة واحدة تجيب عن السؤال الوحيد الذي يهم العميل: "أين وصل العمل، وماذا
// يجب أن أفعل الآن؟" — زر إجراء رئيسي واحد فقط بحسب الحالة الفعلية، بلا أزرار
// متنافسة. الاعتماد نفسه يبقى عبر ApproveEpisode الموجود أصلاً (نافذة تأكيد +
// ملاحظة اختيارية + تسجيل تاريخ/وقت حقيقي، بلا إمكانية تراجع).
export default function EpisodeStatusCard({
  episodeId,
  projectId,
  companyId,
  currentUserId,
  status,
  progress,
  alreadyApproved,
  approvedAt,
  canApprove,
  openNotesCount,
}: {
  episodeId: string;
  projectId: string;
  companyId: string;
  currentUserId: string;
  status: EpisodeStatus;
  progress: number;
  alreadyApproved: boolean;
  approvedAt: string | null;
  canApprove: boolean;
  openNotesCount: number;
}) {
  const meta = episodeStatusMeta(status);
  const state = computeReviewState(status, alreadyApproved, canApprove, openNotesCount);

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800 }}>حالة الحلقة</h2>
        <span className="chip" style={{ background: `${meta.color}1A`, borderColor: `${meta.color}55`, color: meta.color }}>
          {meta.label}
        </span>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 5 }}>
          <span>نسبة الإنجاز</span>
          <span style={{ fontWeight: 800, color: "var(--gold)" }}>{progress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%`, background: meta.color }} />
        </div>
      </div>

      <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: state.action === "none" ? 0 : 16 }}>{state.message}</p>

      {state.action === "approve" && (
        <ApproveEpisode
          episodeId={episodeId}
          projectId={projectId}
          companyId={companyId}
          currentUserId={currentUserId}
          status={status}
          alreadyApproved={alreadyApproved}
          approvedAt={approvedAt}
          canApprove={canApprove}
          variant="hero"
        />
      )}

      {state.action === "note" && (
        <button className="btn" style={{ width: "100%", justifyContent: "center", fontWeight: 800 }} onClick={() => scrollTo("episode-notes-section")}>
          <Icon name="edit" size={16} /> إرسال ملاحظات
        </button>
      )}

      {state.action === "download" && (
        <button className="btn" style={{ width: "100%", justifyContent: "center", fontWeight: 800, background: "#1DB954", color: "#06210f" }} onClick={() => scrollTo("episode-files-section")}>
          <Icon name="export" size={16} /> تحميل النسخة النهائية
        </button>
      )}
    </div>
  );
}
