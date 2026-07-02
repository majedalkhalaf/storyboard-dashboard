import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import PrintButton from "@/app/components/finance/PrintButton";
import DocumentHeader, { printResetCss } from "@/app/components/finance/DocumentHeader";
import { fmtMoney, fmtDate } from "@/app/components/finance/format";
import { PROJECT_STATUSES, EPISODE_STATUSES } from "@/app/lib/constants";

export const dynamic = "force-dynamic";

export default async function ProjectReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const company = session!.company!;

  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(name, email, phone)")
    .eq("company_id", company.id)
    .eq("id", id)
    .single();

  if (!project) notFound();

  const [{ data: episodes }, { count: filesCount }, { data: invoices }, { count: notesCount }, { data: activity }] = await Promise.all([
    supabase.from("episodes").select("title, number, status, progress").eq("project_id", id).order("sort_order"),
    supabase.from("files").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("invoices").select("number, amount, tax, status").eq("project_id", id),
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("activity_logs").select("action, created_at, actor_role").eq("project_id", id).order("created_at", { ascending: false }).limit(15),
  ]);

  const statusLabel = PROJECT_STATUSES.find((s) => s.value === project.status)?.label ?? project.status;
  const totalInvoiced = (invoices ?? []).reduce((s, i) => s + Number(i.amount) + Number(i.tax ?? 0), 0);
  const totalPaid = (invoices ?? []).filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount) + Number(i.tax ?? 0), 0);

  return (
    <>
      <style>{printResetCss}</style>
      <div className="doc-toolbar no-print" style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
        <PrintButton label="تصدير التقرير PDF" />
      </div>

      <div className="doc-page">
        <DocumentHeader company={company} title="تقرير مشروع" subtitle={project.name} />

        <div className="doc-meta">
          <div>
            <div className="doc-label">العميل</div>
            <div className="doc-strong">{project.clients?.name ?? "—"}</div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div className="doc-row">
              <span className="doc-muted">الحالة:</span> {statusLabel}
            </div>
            <div className="doc-row">
              <span className="doc-muted">نسبة الإنجاز:</span> {project.progress}%
            </div>
            <div className="doc-row">
              <span className="doc-muted">تاريخ التصدير:</span> {fmtDate(new Date().toISOString())}
            </div>
          </div>
        </div>

        <div className="doc-section">
          <div className="doc-section-title">الحلقات ({(episodes ?? []).length})</div>
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ textAlign: "right" }}>#</th>
                <th style={{ textAlign: "right" }}>العنوان</th>
                <th style={{ textAlign: "right" }}>الحالة</th>
                <th style={{ textAlign: "left" }}>الإنجاز</th>
              </tr>
            </thead>
            <tbody>
              {(episodes ?? []).map((e, i) => (
                <tr key={i}>
                  <td>{e.number ?? i + 1}</td>
                  <td>{e.title}</td>
                  <td>{EPISODE_STATUSES.find((s) => s.value === e.status)?.label ?? e.status}</td>
                  <td style={{ textAlign: "left" }}>{e.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="doc-section">
          <div className="doc-section-title">ملخص مالي</div>
          <div className="doc-row">إجمالي الفواتير: {fmtMoney(totalInvoiced)}</div>
          <div className="doc-row">المحصّل: {fmtMoney(totalPaid)}</div>
          <div className="doc-row">المتبقي: {fmtMoney(totalInvoiced - totalPaid)}</div>
        </div>

        <div className="doc-section">
          <div className="doc-section-title">إحصائيات عامة</div>
          <div className="doc-row">عدد الملفات المرفوعة: {filesCount ?? 0}</div>
          <div className="doc-row">عدد الملاحظات: {notesCount ?? 0}</div>
        </div>

        {(activity ?? []).length > 0 && (
          <div className="doc-section">
            <div className="doc-section-title">آخر النشاطات</div>
            {(activity ?? []).map((a, i) => (
              <div key={i} className="doc-row">
                {fmtDate(a.created_at)} — {a.action}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
