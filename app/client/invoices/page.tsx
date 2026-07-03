import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import { canClient } from "@/app/lib/permissions";
import { INVOICE_STATUSES, PAYMENT_STATUSES } from "@/app/lib/constants";
import { formatCurrency, formatDate } from "@/app/components/client/utils";
import Icon from "@/app/components/ui/Icon";
import StatCard from "@/app/components/dashboard/StatCard";
import type { ClientPermissions, Invoice, Payment, Project } from "@/app/lib/types";

interface ProjectClientRow {
  id: string;
  permissions: ClientPermissions;
  project: Project | null;
}

// صفحة "الحسابات" — فواتير ومدفوعات مُجمَّعة عبر كل مشاريع العميل النشطة،
// كل مشروع يظهر فيه فقط ما يملك العميل صلاحية الاطلاع عليه لهذا المشروع تحديداً
// (invoices/payments)، ومحمي مضاعفاً بسياسات RLS نفسها على الجداول.
export default async function ClientInvoicesPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_clients")
    .select("id, permissions, project:projects(*)")
    .eq("client_user_id", session.userId)
    .eq("status", "active");

  const rows = ((data ?? []) as unknown as ProjectClientRow[]).filter((r) => r.project);
  const invoiceProjectIds = rows.filter((r) => canClient(r.permissions, "invoices")).map((r) => r.project!.id);
  const paymentProjectIds = rows.filter((r) => canClient(r.permissions, "payments")).map((r) => r.project!.id);
  const projectsById = new Map(rows.map((r) => [r.project!.id, r.project!]));

  const [{ data: invoiceRows }, { data: paymentRows }] = await Promise.all([
    invoiceProjectIds.length
      ? supabase.from("invoices").select("*").in("project_id", invoiceProjectIds).order("due_date", { ascending: true })
      : Promise.resolve({ data: [] as Invoice[] }),
    paymentProjectIds.length
      ? supabase.from("payments").select("*").in("project_id", paymentProjectIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Payment[] }),
  ]);
  const invoices = (invoiceRows ?? []) as Invoice[];
  const payments = (paymentRows ?? []) as Payment[];

  const totalDue = invoices.filter((i) => i.status === "unpaid" || i.status === "overdue").reduce((s, i) => s + (i.amount || 0) + (i.tax || 0), 0);
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  if (invoiceProjectIds.length === 0 && paymentProjectIds.length === 0) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
          الحسابات
        </h1>
        <div className="card empty-state">
          <Icon name="finance" size={36} className="nav-icon" />
          <p style={{ marginTop: 12, fontSize: 14 }}>لا تملك صلاحية الاطلاع على الحسابات المالية حالياً.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
        الحسابات
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard label="المبلغ المستحق" value={formatCurrency(totalDue)} icon="alert" color="#EF4444" />
        <StatCard label="إجمالي المدفوع" value={formatCurrency(totalPaid)} icon="checkCircle" color="var(--success)" />
        <StatCard label="فواتير متأخرة" value={overdueCount} icon="warning" color="#F59E0B" />
        <StatCard label="عدد الفواتير" value={invoices.length} icon="invoices" color="var(--gold)" />
      </div>

      {invoiceProjectIds.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>الفواتير</h3>
          {invoices.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا توجد فواتير بعد</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
              {invoices.map((inv) => {
                const meta = INVOICE_STATUSES.find((s) => s.value === inv.status) ?? INVOICE_STATUSES[0];
                const project = projectsById.get(inv.project_id);
                return (
                  <Link
                    key={inv.id}
                    href={`/client/projects/${inv.project_id}?tab=finance`}
                    className="card card-hover-lift"
                    style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", textDecoration: "none", color: "inherit", minWidth: 0 }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>فاتورة #{inv.number}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project?.name ?? ""} {inv.due_date ? `· تستحق ${formatDate(inv.due_date)}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--gold)" }}>{formatCurrency((inv.amount || 0) + (inv.tax || 0))}</span>
                      <span className="chip" style={{ color: meta.color, borderColor: meta.color, background: `${meta.color}1a` }}>
                        {meta.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {paymentProjectIds.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>سجل الدفعات</h3>
          {payments.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا توجد دفعات مسجّلة بعد</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
              {payments.map((p) => {
                const meta = PAYMENT_STATUSES.find((s) => s.value === p.status) ?? PAYMENT_STATUSES[0];
                const project = projectsById.get(p.project_id);
                return (
                  <div key={p.id} className="card" style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project?.name ?? ""}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {p.paid_date ? `دُفعت في ${formatDate(p.paid_date)}` : p.due_date ? `تستحق ${formatDate(p.due_date)}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{formatCurrency(p.amount)}</span>
                      <span className="chip" style={{ color: meta.color, borderColor: meta.color, background: `${meta.color}1a` }}>
                        {meta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
