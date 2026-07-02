"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import type { EpisodeStatus } from "@/app/lib/types";

// عنصر اعتماد الحلقة. يعرض:
// - شارة خضراء "تم الاعتماد" إن وُجد اعتماد فعّال.
// - زر "اعتماد الحلقة" (يفتح نافذة تأكيد) إن كانت الحلقة جاهزة للاعتماد ولدى العميل الصلاحية.
// - لا شيء في الحالات الأخرى.
// العميل لا يستطيع إلغاء الاعتماد بعد إتمامه.
export default function ApproveEpisode({
  episodeId,
  projectId,
  companyId,
  currentUserId,
  status,
  alreadyApproved,
  canApprove,
  variant = "detail",
}: {
  episodeId: string;
  projectId: string;
  companyId: string;
  currentUserId: string;
  status: EpisodeStatus;
  alreadyApproved: boolean;
  canApprove: boolean;
  variant?: "detail" | "card";
}) {
  const [approved, setApproved] = useState(alreadyApproved);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const badge = (
    <span
      className="chip"
      style={{ background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.4)", color: "#1DB954", fontWeight: 700 }}
    >
      <Icon name="checkCircle" size={14} />
      تم الاعتماد
    </span>
  );

  if (approved) return badge;

  // لا نعرض زر الاعتماد إلا إذا كانت الحلقة جاهزة والعميل يملك الصلاحية
  if (!canApprove || status !== "ready_for_approval") {
    if (status === "approved" || status === "delivered") return badge;
    return null;
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
    setApproved(true);
    setOpen(false);
  }

  return (
    <>
      <button
        className="btn btn-gold"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        style={variant === "card" ? { fontSize: 13, padding: "8px 12px" } : { justifyContent: "center" }}
      >
        <Icon name="checkCircle" size={variant === "card" ? 15 : 18} />
        {variant === "card" ? "بانتظار اعتمادك" : "اعتماد الحلقة"}
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => !busy && setOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Icon name="checkCircle" size={22} className="nav-icon" />
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>تأكيد اعتماد الحلقة</h3>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16, lineHeight: 1.7 }}>
              باعتمادك لهذه الحلقة فأنت تؤكد رضاك عن العمل المُنجز. لا يمكن التراجع عن الاعتماد بعد تأكيده.
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
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
                إلغاء
              </button>
              <button className="btn btn-gold" onClick={confirmApproval} disabled={busy}>
                {busy ? "جارٍ الاعتماد..." : "تأكيد الاعتماد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
