import Link from "next/link";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import PerformanceRing from "@/app/components/dashboard/PerformanceRing";
import StatCard from "@/app/components/dashboard/StatCard";
import BrandingInjector from "@/app/components/client/BrandingInjector";
import ProjectStageTimeline from "@/app/components/client/ProjectStageTimeline";
import HomeReportButton from "@/app/components/client/HomeReportButton";
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
  stageProgress,
  canDownloadProject,
  recentFiles,
  recentImages,
  storyboardStatusCounts,
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
  stageProgress: Record<string, number>;
  canDownloadProject: boolean;
  recentFiles: ProjectFile[];
  recentImages: ProjectFile[];
  storyboardStatusCounts: { label: string; color: string; count: number }[];
  recentNotes: Note[];
  activity: ActivityItem[];
  otherProjects: OtherProjectRow[];
}) {
  const status = projectStatusMeta(project.status);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: "0 auto", overflowX: "hidden" }}>
      <BrandingInjector color={company?.primary_color} />

      <div style={{ position: "relative", marginBottom: 22, padding: "6px 2px" }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -60,
            insetInlineStart: -40,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(var(--gold-rgb),0.22), transparent 70%)",
            filter: "blur(10px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 className="page-title-size" style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
            مرحباً {firstName} 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            يسعدنا متابعتك لمشروعك — بإمكانك من هنا الاطلاع على جميع تفاصيل التنفيذ والملفات والتحديثات لحظة بلحظة.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "stretch", marginBottom: 20, minWidth: 0 }}>
        {/* بطاقة المشروع الرئيسية — صورة الغلاف كاملة (بدون قص) مع تفاصيل المشروع فوقها */}
        <div className="card card-hover-lift" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ height: 220, position: "relative", background: "#0A0A0B" }}>
            {project.cover_image_url ? (
              <>
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `url(${project.cover_image_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(22px) brightness(0.5) saturate(1.2)",
                    transform: "scale(1.15)",
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.cover_image_url}
                  alt={project.name}
                  style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain" }}
                />
              </>
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="video" size={34} className="text-muted" />
              </div>
            )}
            <div
              aria-hidden
              style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.1) 55%, transparent)" }}
            />
            <div style={{ position: "absolute", top: 12, insetInlineStart: 12, display: "flex", gap: 8 }}>
              <span
                className="chip"
                style={{ color: status.color, borderColor: status.color, background: "rgba(0,0,0,0.55)" }}
              >
                {status.label}
              </span>
            </div>
            {canDownloadProject && (
              <div style={{ position: "absolute", top: 12, insetInlineEnd: 12 }}>
                <HomeReportButton project={project} />
              </div>
            )}
            <div style={{ position: "absolute", bottom: 0, insetInline: 0, padding: "14px 18px" }}>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{project.name}</h2>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
                {company?.name && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="company" size={12} /> {company.name}
                  </span>
                )}
                {episodesTotal > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="episodes" size={12} /> {episodesCompleted} من {episodesTotal} حلقة
                  </span>
                )}
                {project.delivery_date && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="calendar" size={12} /> التسليم {formatDate(project.delivery_date)}
                  </span>
                )}
                {project.updated_at && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="clock" size={12} /> تحديث {relativeTime(project.updated_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ padding: "14px 20px", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={`/client/projects/${project.id}`} className="btn btn-gold">
              عرض تفاصيل المشروع <Icon name="arrowLeft" size={15} />
            </Link>
            <Link href={`/client/projects/${project.id}?tab=notes`} className="btn btn-outline">
              <Icon name="message" size={15} /> إرسال ملاحظة
            </Link>
          </div>
        </div>

        {/* نسبة الإنجاز */}
        <div className="card card-hover-lift" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
          <PerformanceRing percent={progress} label="نسبة الإنجاز الكلية" size={128} />
        </div>
      </div>

      {/* بطاقة عريضة: مراحل تقدم المشروع بنسب حقيقية لكل مرحلة */}
      {pipelineStages.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>مراحل تقدم المشروع</h3>
          <ProjectStageTimeline stages={pipelineStages} currentStageKey={currentStageKey} stageProgress={stageProgress} />
        </div>
      )}

      {/* معرض صور المشروع */}
      {recentImages.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>آخر الصور من المشروع</h3>
            <Link href={`/client/projects/${project.id}?tab=files`} style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>
              عرض الكل
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {recentImages.map((img) => (
              <div
                key={img.id}
                className="card-hover-lift"
                style={{ aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg-hover)" }}
              >
                {img.external_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.external_url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="image" size={20} className="text-muted" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2.2fr", gap: 20, alignItems: "start", minWidth: 0 }}>
        {/* النشاطات والمستجدات */}
        <div className="card" style={{ padding: 20, minWidth: 0 }}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
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

          {/* توزيع حالات الستوري بورد */}
          {storyboardStatusCounts.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>حالة الستوري بورد</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {storyboardStatusCounts.map((s) => {
                  const total = storyboardStatusCounts.reduce((sum, x) => sum + x.count, 0);
                  const pct = total ? Math.round((s.count / total) * 100) : 0;
                  return (
                    <div key={s.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                        <span>{s.label}</span>
                        <span style={{ fontWeight: 700 }}>{s.count}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: s.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
