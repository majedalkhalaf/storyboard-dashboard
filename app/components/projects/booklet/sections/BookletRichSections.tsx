import Icon from "@/app/components/ui/Icon";
import { Slide, SlideTitle } from "@/app/components/projects/presentation/sections/EasySections";
import { formatDate, formatDuration } from "@/app/components/projects/utils";
import type { BookletSectionProps } from "./BookletEasySections";
import { BarChart, ProgressBar } from "./BookletCharts";

export function ExecutionPlanSection({ data, theme }: BookletSectionProps) {
  const plan = data.executionPlan;
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الخطة التنفيذية</SlideTitle>
      {plan.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد مراحل مسجَّلة بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {plan.map((s) => {
            const pct = s.episodesTotal > 0 ? Math.round((s.completed / s.episodesTotal) * 100) : 0;
            const status = s.completed === s.episodesTotal && s.episodesTotal > 0 ? "مكتملة" : s.inProgress > 0 ? "قيد التنفيذ" : "لم تبدأ";
            return (
              <div key={s.key} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{s.label}</div>
                  <span style={{ fontSize: 11, color: theme.accent, fontWeight: 700 }}>{status}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 8, fontSize: 11.5, color: theme.muted }}>
                  {s.responsibleNames.length > 0 && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Icon name="team" size={13} /> {s.responsibleNames.join("، ")}
                    </span>
                  )}
                  {(s.earliestStart || s.latestEnd) && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Icon name="calendar" size={13} />
                      {s.earliestStart && formatDate(s.earliestStart)}
                      {s.earliestStart && s.latestEnd && " – "}
                      {s.latestEnd && formatDate(s.latestEnd)}
                    </span>
                  )}
                  <span>{s.completed}/{s.episodesTotal}</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <ProgressBar theme={theme} percentage={pct} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Slide>
  );
}

export function BookletTeamSection({ data, theme }: BookletSectionProps) {
  const statsById: Record<string, { stagesAssigned: number; stagesCompleted: number; completionRate: number }> = Object.fromEntries(
    data.teamStats.map((t) => [t.id, t])
  );
  const barItems = data.teamStats
    .filter((t) => t.full_name)
    .slice(0, 8)
    .map((t) => ({ label: t.full_name as string, value: t.stagesCompleted, max: Math.max(t.stagesAssigned, 1) }));

  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الفريق</SlideTitle>
      {data.team.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا يوجد أعضاء فريق مسندون بعد.</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
            {data.team.map((member) => {
              const stat = statsById[member.id];
              return (
                <div key={member.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}>
                  {member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `2px solid ${theme.border}` }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: theme.accent, color: "#0A0A0B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>
                      {(member.full_name ?? "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{member.full_name ?? "بدون اسم"}</div>
                  {stat && stat.stagesAssigned > 0 && (
                    <div style={{ fontSize: 10.5, color: theme.muted }}>
                      {stat.stagesCompleted}/{stat.stagesAssigned} مهمة ({stat.completionRate}%)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {barItems.length > 0 && (
            <div>
              <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 8 }}>عدد المهام المنجزة لكل عضو</div>
              <BarChart theme={theme} items={barItems} height={130} />
            </div>
          )}
        </>
      )}
    </Slide>
  );
}

export function StoryboardDetailedSection({ data, theme }: BookletSectionProps) {
  const scenes = data.storyboardDetailed;
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>Storyboard التفصيلي</SlideTitle>
      {scenes.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد مشاهد Storyboard مسجَّلة بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
          {scenes.slice(0, 6).map((s) => {
            const camera = [s.cameraSetup.camera_type, s.cameraSetup.lens, s.cameraSetup.frame_rate].filter(Boolean).join(" · ");
            const director = [s.directorNotes.camera_movement, s.directorNotes.angle, s.directorNotes.mood].filter(Boolean).join(" · ");
            return (
              <div key={s.id} style={{ display: "flex", gap: 12, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12 }}>
                {s.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.cover_image_url} alt="" style={{ width: 90, height: 60, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>
                    {s.number != null ? `#${s.number} — ` : ""}
                    {s.title} <span style={{ fontSize: 11, fontWeight: 400, color: theme.muted }}>({s.episodeTitle})</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6, fontSize: 11, color: theme.muted }}>
                    {s.shot_type && <span>نوع اللقطة: {s.shot_type}</span>}
                    {s.location && <span>الموقع: {s.location}</span>}
                    {camera && <span>الكاميرا: {camera}</span>}
                    {director && <span>الإخراج: {director}</span>}
                    {s.castNames.length > 0 && <span>الطاقم: {s.castNames.join("، ")}</span>}
                    {s.equipmentNames.length > 0 && <span>المعدات: {s.equipmentNames.join("، ")}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Slide>
  );
}

export function VideosSection({ data, theme }: BookletSectionProps) {
  const videos = data.videosList;
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الفيديوهات</SlideTitle>
      {videos.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد فيديوهات مرفوعة بعد.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, overflowY: "auto" }}>
          {videos.slice(0, 9).map((v) => (
            <div key={v.id} style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${theme.border}`, background: theme.card }}>
              <div style={{ position: "relative", aspectRatio: "16 / 9", background: theme.border }}>
                {v.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnailUrl} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="play" size={14} className="text-white" />
                  </div>
                </div>
                {v.durationSeconds != null && (
                  <span style={{ position: "absolute", bottom: 6, insetInlineEnd: 6, fontSize: 10, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "2px 6px", borderRadius: 6 }}>
                    {formatDuration(v.durationSeconds)}
                  </span>
                )}
              </div>
              <div style={{ padding: "8px 10px" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                {v.episodeTitle && <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>{v.episodeTitle}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}

export function ApprovalsSection({ data, theme }: BookletSectionProps) {
  const rows = data.approvalsList;
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الاعتمادات</SlideTitle>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد اعتمادات مسجَّلة بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
          {rows.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 14px", opacity: a.revoked ? 0.55 : 1 }}>
              <Icon name={a.revoked ? "warning" : "badgeCheck"} size={16} className="text-muted" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: theme.text }}>{a.episodeTitle ?? "المشروع"}</div>
                <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 2 }}>
                  {a.approverName ? `اعتمد بواسطة ${a.approverName}` : "معتمد"} {a.revoked ? "— تم سحب الاعتماد" : ""}
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: theme.muted, whiteSpace: "nowrap" }}>{formatDate(a.approvedAt)}</div>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}

export function NotesSection({ data, theme }: BookletSectionProps) {
  const notes = data.notesList;
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الملاحظات</SlideTitle>
      {notes.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد ملاحظات مسجَّلة بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {notes.slice(0, 12).map((n) => (
            <div key={n.id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: n.authorRole === "client" ? theme.accent : theme.text }}>
                  {n.authorName ?? (n.authorRole === "client" ? "العميل" : "الفريق")}
                  {n.episodeTitle ? ` — ${n.episodeTitle}` : ""}
                </span>
                <span style={{ fontSize: 10, color: theme.muted, whiteSpace: "nowrap" }}>{formatDate(n.createdAt)}</span>
              </div>
              <p style={{ fontSize: 12, color: theme.text, opacity: 0.85, marginTop: 4, whiteSpace: "pre-wrap" }}>{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}

export function FinanceSection({ data, theme }: BookletSectionProps) {
  const f = data.finance;
  if (!f) {
    return (
      <Slide theme={theme}>
        <SlideTitle theme={theme}>الملخص المالي</SlideTitle>
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد بيانات مالية متاحة.</p>
      </Slide>
    );
  }
  const money = (n: number) => `${n.toLocaleString("ar-u-nu-latn", { maximumFractionDigits: 0 })} ${data.companyCurrency}`;
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الملخص المالي</SlideTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {f.budget != null && (
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: theme.muted }}>ميزانية المشروع</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: theme.accent, marginTop: 6 }}>{money(f.budget)}</div>
          </div>
        )}
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: theme.muted }}>فواتير مدفوعة</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: theme.accent, marginTop: 6 }}>{money(f.invoicesPaidTotal)}</div>
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: theme.muted }}>فواتير غير مدفوعة</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: theme.accent, marginTop: 6 }}>{money(f.invoicesUnpaidTotal)}</div>
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: theme.muted }}>دفعات مستلمة</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: theme.accent, marginTop: 6 }}>{money(f.paymentsReceivedTotal)}</div>
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: theme.muted }}>إجمالي المصروفات</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: theme.accent, marginTop: 6 }}>{money(f.expensesTotal)}</div>
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: theme.muted }}>عقود / عروض</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: theme.accent, marginTop: 6 }}>
            {f.contractsCount} / {f.proposalsCount}
          </div>
        </div>
      </div>
    </Slide>
  );
}
