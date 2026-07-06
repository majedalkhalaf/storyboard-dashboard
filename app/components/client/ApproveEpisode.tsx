"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import ModalPortal from "@/app/components/ui/ModalPortal";
import { createClient } from "@/app/lib/supabase/client";
import { formatDate } from "@/app/components/client/utils";
import type { EpisodeStatus } from "@/app/lib/types";

// عنصر اعتماد الحلقة. يعرض:
// - شارة خضراء "تم الاعتماد النهائي" (مع التاريخ) إن وُجد اعتماد فعّال.
// - زر "اعتماد الحلقة"/"اعتماد نهائي" (يفتح نافذة تأكيد) إن كانت الحلقة جاهزة للاعتماد ولدى العميل الصلاحية.
// - لا شيء في الحالات الأخرى.
// العميل لا يستطيع إلغاء الاعتماد بعد إتمامه — فقط مدير المشروع من لوحة الفريق الداخلية.
export default function ApproveEpisode({
  episodeId,
  projectId,
  companyId,
  currentUserId,
  status,
  alreadyApproved,
  approvedAt,
  canApprove,
  hasOpenEditRequest = false,
  variant = "detail",
}: {
  episodeId: string;
  projectId: string;
  companyId: string;
  currentUserId: string;
  status: EpisodeStatus;
  alreadyApproved: boolean;
  approvedAt?: string | null;
  canApprove: boolean;
  /** إخفاء زر الاعتماد طالما هناك طلب تعديل مفتوح (لم يُحلّ بعد) على هذه الحلقة —
      لا معنى لاعتماد حلقة بينما طلب تعديل عليها لا يزال قيد المعالجة. */
  hasOpenEditRequest?: boolean;
  variant?: "detail" | "card" | "hero";
}) {
  const [approved, setApproved] = useState(alreadyApproved);
  const [approvedDate, setApprovedDate] = useState<string | null>(approvedAt ?? null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const badge = (
    <span
      className="chip"
      style={{
        background: "rgba(29,185,84,0.12)",
        borderColor: "rgba(29,185,84,0.4)",
        color: "#1DB954",
        fontWeight: 700,
        padding: variant === "hero" ? "8px 14px" : undefined,
        fontSize: variant === "hero" ? 13 : undefined,
      }}
    >
      <Icon name="checkCircle" size={variant === "hero" ? 16 : 14} />
      تم الاعتماد النهائي{approvedDate ? ` — ${formatDate(approvedDate)}` : ""}
    </span>
  );

  if (approved) return badge;

  // يُخفى الزر بالكامل (بلا بديل) طالما هناك طلب تعديل مفتوح على الحلقة — يظهر
  // مجدداً تلقائياً بمجرد حلّ الطلب (تغيير حالته إلى "done" من فريق العمل).
  if (hasOpenEditRequest) return null;

  // الزر يظهر على كل بطاقة حلقة طالما لم تُعتمد/تُسلَّم بعد والعميل يملك
  // صلاحية الاعتماد — بلا اشتراط أن يضعها الفريق الداخلي "جاهزة للاعتماد"
  // أولاً، بناءً على طلب صريح ومتكرر بأن يظهر الزر مباشرة على كل بطاقة.
  if (!canApprove || status === "approved" || status === "delivered") {
    if (status === "approved" || status === "delivered") return badge;
    return null;
  }

  function closeDialog() {
    setOpen(false);
    setNote("");
    setError(null);
  }

  async function confirmApproval() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("approvals").insert({
      company_id: companyId,
      project_id: projectId,
      episode_id: episodeId,
      client_id: currentUserId,
      note: note.trim() || null,
      device_info: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    setBusy(false);
    if (insertError) {
      setError("تعذّر تسجيل الاعتماد، حاول مرة أخرى.");
      return;
    }
    setApprovedDate(new Date().toISOString());
    setApproved(true);
    setOpen(false);
  }

  return (
    <>
      <button
        className={variant === "hero" ? "btn" : "btn btn-gold"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        style={
          variant === "card"
            ? { fontSize: 13, padding: "8px 12px" }
            : variant === "hero"
              ? { justifyContent: "center", background: "#1DB954", color: "#06210f", fontWeight: 800, fontSize: 14, padding: "10px 20px" }
              : { justifyContent: "center" }
        }
      >
        <Icon name="checkCircle" size={variant === "card" ? 15 : 18} />
        {variant === "card" ? "اعتماد نهائي للحلقة" : variant === "hero" ? "اعتماد نهائي" : "اعتماد الحلقة"}
      </button>

      {open && (
        <ModalPortal>
        <div className="modal-overlay" onClick={() => !busy && closeDialog()}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Icon name="checkCircle" size={22} className="nav-icon" />
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>هل أنت متأكد من اعتماد هذه الحلقة اعتماداً نهائياً؟</h3>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16, lineHeight: 1.7 }}>
              في حال الاعتماد النهائي لن تتمكن من طلب أي تعديل على هذه الحلقة مرة أخرى، لكن يمكنك دائماً الدخول إليها ومشاهدة
              وتحميل مرفقاتها في أي وقت.
            </p>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>ملاحظة (اختياري)</label>
            <textarea
              className="input-field"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أي ملاحظة تودّ إضافتها مع الاعتماد..."
              style={{ marginBottom: 12 }}
            />
            {error && (
              <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 10, display: "flex", gap: 6, alignItems: "center" }}>
                <Icon name="alert" size={15} />
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={closeDialog} disabled={busy}>
                إلغاء
              </button>
              <button className="btn" style={{ background: "#1DB954", color: "#06210f", fontWeight: 800 }} onClick={confirmApproval} disabled={busy}>
                {busy ? "جارٍ الاعتماد..." : "اعتماد نهائي"}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
}
