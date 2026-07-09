"use client";

// بطلب صريح: "نظرة عامة" لم تعد لوحة أقسام قابلة للطي (كانت تحتاج ضغط كل قسم
// لرؤية محتواه) — أصبحت صفحة ملخص واحدة متدفقة، كل أقسامها ظاهرة دائماً بلا أي
// زر طي/فتح، مع إبقاء إمكانية التعديل (الغلاف والوصف) كما كانت تماماً.

import { useRef, useState } from "react";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import ActivityTimeline from "@/app/components/projects/ActivityTimeline";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { isInternalAdmin } from "@/app/lib/permissions";
import { STAGE_STATUSES } from "@/app/lib/constants";
import { safeStorageKey } from "@/app/lib/storage-path";
import type { EpisodeFullDetail } from "@/app/lib/episode-detail";
import { formatDate } from "../utils";

export default function OverviewTab({
  episode,
  onChanged,
}: {
  episode: EpisodeFullDetail;
  onChanged: (patch: Partial<EpisodeFullDetail>) => void;
}) {
  const supabase = createClient();
  const { company, userId, profile } = useSession();
  const companyId = company!.id;
  const canRevokeApproval = isInternalAdmin(profile.role);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(episode.description ?? "");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  async function save() {
    setEditing(false);
    if (description !== (episode.description ?? "")) {
      await supabase.from("episodes").update({ description: description || null }).eq("id", episode.id);
      onChanged({ description: description || null });
    }
  }

  async function uploadCover(file: File | null) {
    if (!file) return;
    setCoverError(null);
    if (file.size > 20 * 1024 * 1024) {
      setCoverError("حجم الصورة كبير جداً (الحد الأقصى 20 ميجابايت)");
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }
    setUploadingCover(true);
    try {
      const path = `${companyId}/covers/${safeStorageKey(file.name)}`;
      const { error: upErr } = await supabase.storage.from("public-assets").upload(path, file, { upsert: false });
      if (upErr) {
        setCoverError(upErr.message || "تعذّر رفع الصورة");
        return;
      }
      const url = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
      await supabase.from("episodes").update({ cover_image_url: url }).eq("id", episode.id);
      onChanged({ cover_image_url: url });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function removeCover() {
    await supabase.from("episodes").update({ cover_image_url: null }).eq("id", episode.id);
    onChanged({ cover_image_url: null });
  }

  // إلغاء الاعتماد وإعادة فتح الحلقة للمراجعة — بطلب صريح: متاح لفريق العمل
  // (الإدارة تحديداً) فقط، ولا وجود لأي تحكم مماثل في بوابة العميل.
  async function revokeApproval(approvalId: string) {
    if (!confirm("إعادة فتح الحلقة للمراجعة وإلغاء الاعتماد الحالي؟")) return;
    setRevokingId(approvalId);
    try {
      const revokedAt = new Date().toISOString();
      await supabase.from("approvals").update({ revoked_at: revokedAt, revoked_by: userId }).eq("id", approvalId);
      const patch: Partial<EpisodeFullDetail> = {
        approvals: episode.approvals.map((a) => (a.id === approvalId ? { ...a, revoked_at: revokedAt } : a)),
      };
      if (episode.status === "approved") {
        await supabase.from("episodes").update({ status: "in_review" }).eq("id", episode.id);
        patch.status = "in_review";
      }
      await logActivity(supabase, { companyId, projectId: episode.project_id, episodeId: episode.id, action: "approval_revoked", details: {} });
      onChanged(patch);
    } finally {
      setRevokingId(null);
    }
  }

  const statItems = [
    { label: "الملفات", value: episode.files.length, icon: "attachment" as const },
    { label: "الملاحظات", value: episode.notes.length + episode.comments.length, icon: "message" as const },
    { label: "نسخ السكربت", value: episode.scriptVersions.length, icon: "fileCheck" as const },
    { label: "الاعتمادات", value: episode.approvals.length, icon: "shield" as const },
  ];
  const completedStages = episode.stages.filter((s) => s.status === "completed").length;
  const activeApproval = episode.approvals.find((a) => !a.revoked_at);

  return (
    <div className="card animate-fade-in" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* الغلاف والوصف — القسم الوحيد القابل للتعديل مباشرة من هنا */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          <div
            style={{
              width: 160,
              height: 100,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: episode.cover_image_url
                ? `center/cover no-repeat url(${episode.cover_image_url})`
                : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!episode.cover_image_url && <Icon name="video" size={22} className="text-muted" />}
          </div>
          <label className="btn btn-outline" style={{ cursor: uploadingCover ? "wait" : "pointer", fontSize: 12, padding: "6px 10px" }}>
            <Icon name="upload" size={13} /> {uploadingCover ? "جارٍ الرفع..." : episode.cover_image_url ? "تغيير الصورة" : "إضافة صورة"}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              hidden
              disabled={uploadingCover}
              onChange={(e) => uploadCover(e.target.files?.[0] ?? null)}
            />
          </label>
          {episode.cover_image_url && (
            <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 11.5, color: "#ef4444" }} onClick={removeCover}>
              <Icon name="trash" size={12} /> إزالة الصورة
            </button>
          )}
          {coverError && <p style={{ fontSize: 11.5, color: "#ef4444" }}>{coverError}</p>}
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>وصف الحلقة</h3>
            {!editing && (
              <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setEditing(true)}>
                <Icon name="edit" size={13} /> تعديل
              </button>
            )}
          </div>
          {editing ? (
            <div>
              <textarea className="input-field" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} autoFocus />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button className="btn btn-gold" style={{ padding: "8px 16px", fontSize: 13 }} onClick={save}>
                  حفظ
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: description ? "var(--text-primary)" : "var(--text-muted)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
              {description || "لا يوجد وصف."}
            </p>
          )}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ملخص الأرقام والتواريخ في شبكة واحدة بدل قسمين منفصلين */}
      <div>
        <SectionHeading icon="barChart" title="ملخص الحلقة" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <Meta icon="calendar" label="تاريخ التصوير" value={formatDate(episode.shooting_date)} />
          <Meta icon="calendar" label="تاريخ التسليم" value={formatDate(episode.delivery_date)} />
          {statItems.map((s) => (
            <div key={s.label} className="stat-card">
              <Icon name={s.icon} size={16} className="text-muted" />
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* مراحل التنفيذ */}
      <div>
        <SectionHeading icon="timeline" title="مراحل التنفيذ" trailing={`${completedStages}/${episode.stages.length} مكتملة`} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {episode.stages.map((stage) => {
            const info = STAGE_STATUSES.find((s) => s.value === stage.status);
            return (
              <div key={stage.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, width: 120, flexShrink: 0, color: "var(--text-secondary)" }}>{stage.label}</span>
                <div className="progress-bar" style={{ height: 5, flex: 1 }}>
                  <div className="progress-fill" style={{ width: `${stage.progress}%`, background: info?.color }} />
                </div>
                <span className="chip" style={{ color: info?.color, borderColor: info?.color, fontSize: 10, flexShrink: 0 }}>
                  {info?.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* الاعتماد */}
      <div>
        <SectionHeading icon="shield" title="الاعتماد" />
        {episode.approvals.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا يوجد اعتماد على هذه الحلقة بعد</p>
        ) : (
          <>
            {activeApproval && (
              <div
                className="card"
                style={{
                  padding: 14,
                  marginBottom: 10,
                  borderColor: "#1DB954",
                  background: "rgba(29,185,84,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#1DB954", display: "inline-flex" }}>
                    <Icon name="badgeCheck" size={20} filled />
                  </span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1DB954" }}>الحلقة معتمدة نهائياً من العميل</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2 }}>
                      اعتمدها {activeApproval.approver_name ?? "العميل"} · {formatDate(activeApproval.approved_at)}
                    </div>
                  </div>
                </div>
                {canRevokeApproval && (
                  <button
                    className="btn btn-danger"
                    style={{ fontSize: 12, padding: "7px 14px", flexShrink: 0 }}
                    disabled={revokingId === activeApproval.id}
                    onClick={() => revokeApproval(activeApproval.id)}
                  >
                    {revokingId === activeApproval.id ? "..." : "إلغاء الاعتماد"}
                  </button>
                )}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {episode.approvals.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                <Icon name={a.revoked_at ? "alert" : "badgeCheck"} size={15} className={a.revoked_at ? "text-muted" : undefined} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.approver_name ?? "عميل"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{formatDate(a.approved_at)}</div>
                </div>
                <span
                  className="chip"
                  style={{
                    fontSize: 10.5,
                    color: a.revoked_at ? "#EF4444" : "#1DB954",
                    borderColor: a.revoked_at ? "#EF4444" : "#1DB954",
                    flexShrink: 0,
                  }}
                >
                  {a.revoked_at ? "أُلغي الاعتماد" : "معتمدة"}
                </span>
              </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* آخر نشاط — ملخص مختصر فقط، السجل الكامل متاح من تبويب "سجل النشاط" المستقل */}
      <div>
        <SectionHeading icon="clock" title="آخر نشاط" />
        <ActivityTimeline items={episode.activity.slice(0, 5)} />
      </div>
    </div>
  );
}

function SectionHeading({ icon, title, trailing }: { icon: IconName; title: string; trailing?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={14} className="text-muted" /> {title}
      </h3>
      {trailing && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{trailing}</span>}
    </div>
  );
}

function Meta({ icon, label, value }: { icon: "calendar"; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
        <Icon name={icon} size={12} /> {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
