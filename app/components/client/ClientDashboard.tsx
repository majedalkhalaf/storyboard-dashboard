import Link from "next/link";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import PerformanceRing from "@/app/components/dashboard/PerformanceRing";
import StatCard from "@/app/components/dashboard/StatCard";
import BrandingInjector from "@/app/components/client/BrandingInjector";
import { relativeTime, formatDate, fileIconName, formatBytes, projectStatusMeta } from "@/app/components/client/utils";
import type { Company, CompanyPipelineStage, Note, Project, ProjectFile } from "@/app/lib/types";

export interface ActivityItem {
  id: string;
  kind: "file" | "note" | "episode";
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  at: string;
}

export interface OtherProjectRow {
  id: string;
  name: string;
  status: Project["status"];
  progress: number;
}

export default function ClientDashboard({
  firstName,
  project,
  company,
  progress,
  episodesTotal,
  episodesCompleted,
  openNotesCount,
  nextInvoice,
  pipelineStages,
  currentStageKey,
  recentFiles,
  recentNotes,
  activity,
  otherProjects,
}: {
  firstName: string;
  project: Project;
  company: Company | null;
  progress: number;
  episodesTotal: number;
  episodesCompleted: number;
  openNotesCount: number;
  nextInvoice: { amount: number; due_date: string | null } | null;
  pipelineStages: CompanyPipelineStage[];
  currentStageKey: string | null;
  recentFiles: ProjectFile[];
  recentNotes: Note[];
  activity: ActivityItem[];
  otherProjects: OtherProjectRow[];
}) {
  const status = projectStatusMeta(project.status);
  const currentIndex = pipelineStages.findIndex((s) => s.key === currentStageKey);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <BrandingInjector color={company?.primary_color} />

      <div style={{ marginBottom: 22 }}>
        <h1 className="page-title-size" style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          مرحباً {firstName} 👋
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
          يسعدنا متابعتك لمشروعك — بإمكانك من هنا الاطلاع على جميع تفاصيل التنفيذ والملفات والتحديثات لحظة بلحظة.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "stretch", marginBottom: 20 }}>
        {/* بطاقة المشروع الرئيسية */}
        <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ height: 130, background: "var(--bg-hover)", position: "relative" }}>
            {project.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.cover_image_url} alt={project.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="video" size={34} className="text-muted" />
              </div>
            )}
            <span
              className="chip"
              style={{ position: "absolute", top: 12, insetInlineStart: 12, color: status.color, borderColor: status.color, background: "rgba(0,0,0,0.5)" }}
            >
              {status.label}
            </span>
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 800 }}>{project.name}</h2>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                {company?.name ? `تنفيذ: ${company.name}` : ""}
                {project.updated_at ? ` · آخر تحديث ${relativeTime(project.updated_at)}` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: "auto", flexWrap: "wrap" }}>
              <Link href={`/client/projects/${project.id}`} className="btn btn-gold">
                عرض تفاصيل المشروع <Icon name="arrowLeft" size={15} />
              </Link>
              <Link href={`/client/projects/${project.id}?tab=notes`} className="btn btn-outline">
                <Icon name="message" size={15} /> إرسال ملاحظة
              </Link>
            </div>
          </div>
        </div>

        {/* نسبة الإنجاز */}
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
          <PerformanceRing percent={progress} label="نسبة الإنجاز الكلية" size={128} />
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard label="نسبة الإنجاز الكلية" value={`${Math.round(progress)}%`} icon="barChart" color="var(--gold)" />
        <StatCard
          label="موعد التسليم المتوقع"
          value={project.delivery_date ? formatDate(project.delivery_date) : "غير محدد"}
          icon="calendar"
          color="#3987e5"
        />
        <StatCard label="الملاحظات المفتوحة" value={openNotesCount} icon="message" color="#F59E0B" />
        <StatCard label="الحلقات المكتملة" value={episodesTotal ? `${episodesCompleted} من ${episodesTotal}` : "—"} icon="checkCircle" color="var(--success)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2.2fr", gap: 20, alignItems: "start" }}>
        {/* النشاطات والمستجدات */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>النشاطات والمستجدات</h3>
          {activity.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا يوجد نشاط بعد</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {activity.map((a) => (
                <div key={a.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: a.color, background: `${a.color}1a`, borderRadius: 8, padding: 6, display: "inline-flex", flexShrink: 0, height: "fit-content" }}>
                    <Icon name={a.icon} size={14} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.subtitle}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>{relativeTime(a.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* مراحل المشروع */}
          {pipelineStages.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>مراحل المشروع</h3>
              <div style={{ display: "flex", overflowX: "auto", gap: 4 }}>
                {pipelineStages.map((s, i) => {
                  const done = currentIndex >= 0 && i < currentIndex;
                  const active = i === currentIndex;
                  return (
                    <div key={s.key} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 110 }}>
                      <div
                        className="card"
                        style={{
                          flex: 1,
                          padding: "10px 8px",
                          textAlign: "center",
                          borderColor: active ? "var(--gold)" : done ? "var(--success)" : "var(--border)",
                          background: active ? "rgba(var(--gold-rgb),0.1)" : "var(--bg-card)",
                        }}
                      >
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: active ? "var(--gold)" : done ? "var(--success)" : "var(--text-secondary)" }}>{s.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{done ? "مكتملة" : active ? "قيد التنفيذ" : "لم تبدأ"}</div>
                      </div>
                      {i < pipelineStages.length - 1 && <div style={{ width: 12, height: 2, background: done ? "var(--success)" : "var(--border)", flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* الملفات الأخيرة */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>آخر الملفات المضافة</h3>
              <Link href={`/client/projects/${project.id}?tab=files`} style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>
                عرض الكل
              </Link>
            </div>
            {recentFiles.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا توجد ملفات بعد</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                {recentFiles.map((f) => (
                  <div key={f.id} className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    <Icon name={fileIconName(f.category)} size={18} className="text-muted" />
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                      {formatBytes(f.size_bytes)} · {relativeTime(f.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* الملاحظات الأخيرة */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>الملاحظات الأخيرة</h3>
              <Link href={`/client/projects/${project.id}?tab=notes`} style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>
                عرض الكل
              </Link>
            </div>
            {recentNotes.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا توجد ملاحظات بعد</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recentNotes.map((n) => (
                  <div key={n.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>{relativeTime(n.created_at)}</div>
                    </div>
                    <span className="chip" style={{ flexShrink: 0, fontSize: 10.5 }}>{n.status === "done" || n.status === "closed" ? "مغلقة" : "مفتوحة"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: nextInvoice ? "1fr 1fr" : "1fr", gap: 20 }}>
            {/* الفواتير */}
            {nextInvoice && (
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>الفاتورة القادمة</h3>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--gold)" }}>{nextInvoice.amount.toLocaleString("ar-SA")} ر.س</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  {nextInvoice.due_date ? `تستحق في ${formatDate(nextInvoice.due_date)}` : "بلا تاريخ استحقاق محدد"}
                </div>
                <Link href={`/client/projects/${project.id}?tab=finance`} className="btn btn-outline" style={{ marginTop: 14, justifyContent: "center" }}>
                  عرض الفواتير
                </Link>
              </div>
            )}

            {/* الدعم الفني / التواصل */}
            {company && (company.email || company.phone) && (
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>هل تحتاج إلى مساعدة؟</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>فريق {company.name} متاح لمساعدتك</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {company.phone && (
                    <a href={`tel:${company.phone}`} className="btn btn-outline" style={{ fontSize: 12, padding: "6px 12px" }}>
                      <Icon name="phone" size={13} /> اتصال
                    </a>
                  )}
                  {company.phone && (
                    <a
                      href={`https://wa.me/${company.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn"
                      style={{ fontSize: 12, padding: "6px 12px", background: "#25D366", color: "#fff", fontWeight: 700 }}
                    >
                      <Icon name="phone" size={13} /> واتساب
                    </a>
                  )}
                  {company.email && (
                    <a href={`mailto:${company.email}`} className="btn btn-outline" style={{ fontSize: 12, padding: "6px 12px" }}>
                      <Icon name="mail" size={13} /> بريد إلكتروني
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* مشاريع أخرى */}
          {otherProjects.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>مشاريعك الأخرى</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {otherProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/client/projects/${p.id}`}
                    className="card"
                    style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit" }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                    <span className="chip" style={{ fontSize: 11 }}>{Math.round(p.progress)}%</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
