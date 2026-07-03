import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { isInternalAdmin } from "@/app/lib/permissions";
import { fmtDate } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";
import type { IconName } from "@/app/components/ui/Icon";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────
// "المستندات المالية" هو مجمِّع صادق فقط: يقرأ عمود pdf_url الموجود أصلاً على
// جداول invoices/contracts/proposals ويعرض أي صف له رابط PDF محفوظ فعلياً.
// هو ليس نظام رفع/إدارة مستندات عام، ولا يخزّن أو يولّد أي ملف بنفسه.
// الوضع الحالي في هذا الكود بالذات: لا يوجد أي مسار (invoice/contract/proposal
// print أو غيره) يكتب فعلياً قيمة إلى pdf_url — الفواتير والعقود والعروض تُعرض
// وتُطبع حالياً كصفحة HTML عبر زر "طباعة" في المتصفح، دون توليد وتخزين ملف PDF
// دائم على الخادم. لذلك من المتوقع أن تظهر كل الأقسام أدناه فارغة اليوم — وهذا
// عرض صادق للواقع، وليس خللاً في الاستعلام. كما تعمّدنا عدم ضمّ جدول files هنا:
// صفوف files ذات category='document' مرتبطة بمشروع بشكل عام فقط وليس بفاتورة/
// عقد/عرض تحديداً، فلا يوجد رابط نظيف نبنيه دون تخمين.
// ─────────────────────────────────────────────────────────────────────────

interface DocRow {
  id: string;
  title: string;
  projectName: string | null;
  date: string;
  pdfUrl: string;
}

function DocSection({
  title,
  icon,
  emptyText,
  rows,
}: {
  title: string;
  icon: IconName;
  emptyText: string;
  rows: DocRow[];
}) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Icon name={icon} size={18} />
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>
          {title} ({rows.length})
        </h2>
      </div>

      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{emptyText}</p>
      ) : (
        <div className="table-scroll" style={{ overflow: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>العنوان/الرقم</th>
                <th>المشروع</th>
                <th>التاريخ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.title}</td>
                  <td>{r.projectName ?? "—"}</td>
                  <td>{fmtDate(r.date)}</td>
                  <td>
                    <a href={r.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: 12, padding: "6px 10px" }}>
                      <Icon name="eye" size={14} /> عرض
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function FinancialDocumentsPage() {
  const session = await getCurrentSession();
  if (!isInternalAdmin(session!.profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: invoices }, { data: contracts }, { data: proposals }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, number, issue_date, pdf_url, project:projects(name)")
      .eq("company_id", companyId)
      .not("pdf_url", "is", null)
      .order("issue_date", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, title, created_at, pdf_url, project:projects(name)")
      .eq("company_id", companyId)
      .not("pdf_url", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("proposals")
      .select("id, title, created_at, pdf_url, project:projects(name)")
      .eq("company_id", companyId)
      .not("pdf_url", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  type ProjectJoin = { name: string } | { name: string }[] | null;
  const projectName = (p: ProjectJoin): string | null => (Array.isArray(p) ? p[0]?.name ?? null : p?.name ?? null);

  const invoiceRows: DocRow[] = ((invoices ?? []) as unknown as { id: string; number: string; issue_date: string; pdf_url: string; project: ProjectJoin }[]).map(
    (i) => ({ id: i.id, title: `فاتورة ${i.number}`, projectName: projectName(i.project), date: i.issue_date, pdfUrl: i.pdf_url })
  );
  const contractRows: DocRow[] = ((contracts ?? []) as unknown as { id: string; title: string; created_at: string; pdf_url: string; project: ProjectJoin }[]).map(
    (c) => ({ id: c.id, title: c.title, projectName: projectName(c.project), date: c.created_at, pdfUrl: c.pdf_url })
  );
  const proposalRows: DocRow[] = ((proposals ?? []) as unknown as { id: string; title: string; created_at: string; pdf_url: string; project: ProjectJoin }[]).map(
    (p) => ({ id: p.id, title: p.title, projectName: projectName(p.project), date: p.created_at, pdfUrl: p.pdf_url })
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
          المستندات المالية
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          تجميع لملفات PDF محفوظة فعلياً على الفواتير والعقود والعروض — وليس نظام رفع مستندات عام
        </p>
      </div>

      <DocSection title="الفواتير" icon="invoices" emptyText="لا توجد فواتير بصيغة PDF محفوظة بعد" rows={invoiceRows} />
      <DocSection title="العقود" icon="contracts" emptyText="لا توجد عقود بصيغة PDF محفوظة بعد" rows={contractRows} />
      <DocSection title="عروض الأسعار" icon="proposals" emptyText="لا توجد عروض بصيغة PDF محفوظة بعد" rows={proposalRows} />
    </div>
  );
}
