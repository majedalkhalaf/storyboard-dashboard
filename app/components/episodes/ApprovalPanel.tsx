"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { isInternalAdmin } from "@/app/lib/permissions";
import { formatDate } from "@/app/components/projects/utils";

export interface ApprovalRow {
  id: string;
  approver_name: string | null;
  note: string | null;
  approved_at: string;
  revoked_at: string | null;
}

export default function ApprovalPanel({
  projectId,
  episodeId,
  episodeStatus,
  approvals,
}: {
  projectId: string;
  episodeId: string;
  episodeStatus: string;
  approvals: ApprovalRow[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const { userId, company, profile } = useSession();
  const companyId = company!.id;
  const admin = isInternalAdmin(profile.role);
  const [working, setWorking] = useState(false);

  const active = approvals.find((a) => !a.revoked_at);

  async function reopen(approvalId: string) {
    if (!confirm("إعادة فتح الحلقة للمراجعة وإلغاء الاعتماد الحالي؟")) return;
    setWorking(true);
    await supabase.from("approvals").update({ revoked_at: new Date().toISOString(), revoked_by: userId }).eq("id", approvalId);
    if (episodeStatus === "approved") {
      await supabase.from("episodes").update({ status: "in_review" }).eq("id", episodeId);
    }
    await logActivity(supabase, { companyId, projectId, episodeId, action: "approval_revoked", details: {} });
    setWorking(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {active ? (
        <div className="card" style={{ padding: 20, borderColor: "#1DB954", background: "rgba(34,197,94,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#1DB954" }}>
                <Icon name="checkCircle" size={22} />
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1DB954" }}>الحلقة معتمدة</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  اعتمدها {active.approver_name || "العميل"} · {formatDate(active.approved_at)}
                </div>
              </div>
            </div>
            {admin && (
              <button className="btn btn-danger" disabled={working} onClick={() => reopen(active.id)}>
                {working ? "..." : "فتح للمراجعة مجدداً"}
              </button>
            )}
          </div>
          {active.note && <p style={{ fontSize: 13, marginTop: 12, color: "var(--text-secondary)" }}>«{active.note}»</p>}
        </div>
      ) : (
        <div className="empty-state card">
          <Icon name="shield" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>لم يتم اعتماد هذه الحلقة بعد</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>يعتمد العملاء الحلقات من بوابة العميل الخاصة بهم.</p>
        </div>
      )}

      {/* history of revoked approvals */}
      {approvals.filter((a) => a.revoked_at).length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>سجل الاعتمادات السابقة</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {approvals
              .filter((a) => a.revoked_at)
              .map((a) => (
                <div key={a.id} className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.75 }}>
                  <span style={{ fontSize: 13 }}>{a.approver_name || "العميل"}</span>
                  <span className="chip" style={{ color: "#EF4444", borderColor: "#EF4444" }}>
                    ملغى · {formatDate(a.approved_at)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
