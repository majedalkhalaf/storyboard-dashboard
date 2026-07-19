import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import { canClient } from "@/app/lib/permissions";
import { INVOICE_STATUSES, PAYMENT_STATUSES } from "@/app/lib/constants";
import { formatCurrency, formatDate } from "@/app/components/client/utils";
import Icon from "@/app/components/ui/Icon";
import ResponsiveStatRow from "@/app/components/dashboard/ResponsiveStatRow";
import PerformanceRing from "@/app/components/dashboard/PerformanceRing";
import FinanceRealtimeRefresh from "@/app/components/client/FinanceRealtimeRefresh";
import type { ClientPermissions, Invoice, Payment, Project } from "@/app/lib/types";

interface ProjectClientRow {
  id: string;
  permissions: ClientPermissions;
  project: Project | null;
}

// صفحة "الحسابات" — حساب مالي مستقل لكل مشروع (وليس أرقاماً مشتركة بين كل
// المشاريع): لكل مشروع قيمته، مدفوعاته، متبقيه، نسبة تحصيله، آخر دفعة، وحالة
// حسابه، مع فواتيره ودفعاته تحته مباشرة. تُزامَن لحظياً مع أي تعديل مالي من
// لوحة الشركة عبر FinanceRealtimeRefresh (invoices/payments في نشرة Realtime).
export default async function ClientInvoicesPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_clients")
    .select("id, permissions, project:projects(*)")
    .eq("client_user_id", session.userId)
    .eq("status", "active");

  const rows = ((data ?? []) as unknown as ProjectClientRow[])
    .filter((r) => r.project && !r.project.archived)
    .sort((a, b) => (b.project!.updated_at || "").localeCompare(a.project!.updated_at || ""));

  const accountRows = rows.filter((r) => canClient(r.permissions, "invoices") || canClient(r.permissions, "payments"));

  if (accountRows.length === 0) {
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

  const projectIds = accountRows.map((r) => r.project!.id);
  const [{ data: invoiceRows }, { data: paymentRows }] = await Promise.all([
    supabase.from("invoices").select("*").in("project_id", projectIds).order("due_date", { ascending: true }),
    supabase.from("payments").select("*").in("project_id", projectIds).order("created_at", { ascending: false }),
  ]);
  const invoices = (invoiceRows ?? []) as Invoice[];
  const payments = (paymentRows ?? []) as Payment[];

  const accounts = accountRows.map((r) => {
    const project = r.project!;
    const showInvoices = canClient(r.permissions, "invoices");
    const showPayments = canClient(r.permissions, "payments");
    const projectInvoices = showInvoices ? invoices.filter((i) => i.project_id === project.id) : [];
    const projectPayments = showPayments ? payments.filter((p) => p.project_id === project.id) : [];

    const totalInvoiced = projectInvoices.filter((i) => i.status !== "cancelled").reduce((s, i) => s + (i.amount || 0) + (i.tax || 0), 0);
    const projectValue = project.budget ?? totalInvoiced;
    const paid = projectPayments.filter((p) => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0);
    const remaining = Math.max(projectValue - paid, 0);
    const collectionPct = projectValue > 0 ? Math.min(100, Math.round((paid / projectValue) * 100)) : 0;
    const hasOverdue = projectInvoices.some((i) => i.status === "overdue") || projectPayments.some((p) => p.status === "overdue");
    const lastPayment = projectPayments.find((p) => p.status === "paid" && p.paid_date) ?? null;

    let accountStatus: { label: string; color: string };
    if (!showInvoices && !showPayments) accountStatus = { label: "—", color: "#6B7280" };
    else if (hasOverdue) accountStatus = { label: "متأخر", color: "#EF4444" };
    else if (remaining <= 0 && projectValue > 0) accountStatus = { label: "مسدد بالكامل", color: "#1DB954" };
    else accountStatus = { label: "متبقٍ رصيد", color: "#F59E0B" };

    return { project, showInvoices, showPayments, projectInvoices, projectPayments, projectValue, paid, remaining, collectionPct, lastPayment, accountStatus };
  });

  const totalDue = accounts.reduce((s, a) => s + a.remaining, 0);
  const totalPaid = accounts.reduce((s, a) => s + a.paid, 0);
  const overdueAccounts = accounts.filter((a) => a.accountStatus.label === "متأخر").length;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <FinanceRealtimeRefresh />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800 }}>
          الحسابات
        </h1>
        <Link href="/client/reports" className="btn btn-outline" style={{ fontSize: 12.5 }}>
          <Icon name="fileUp" size={14} />
          تنزيل التقارير والمستندات
        </Link>
      </div>

      <div style={{ marginBottom: 24 }}>
        <ResponsiveStatRow
          minColWidth={190}
          cards={[
            { key: "due", label: "المبلغ المستحق", value: formatCurrency(totalDue), icon: "alert", color: "#EF4444" },
            { key: "paid", label: "إجمالي المدفوع", value: formatCurrency(totalPaid), icon: "checkCircle", color: "var(--success)" },
            { key: "overdue", label: "حسابات متأخرة", value: overdueAccounts, icon: "warning", color: "#F59E0B" },
            { key: "projects", label: "عدد المشاريع", value: accounts.length, icon: "projects", color: "var(--gold)" },
          ]}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {accounts.map((a) => (
          <div key={a.project.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>{a.project.name}</h3>
                <span className="chip" style={{ marginTop: 6, color: a.accountStatus.color, borderColor: a.accountStatus.color, background: `${a.accountStatus.color}1a` }}>
                  {a.accountStatus.label}
                </span>
              </div>
              <Link href={`/client/projects/${a.project.id}`} className="btn btn-outline" style={{ fontSize: 12.5 }}>
                عرض المشروع
              </Link>
            </div>

            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
              <PerformanceRing percent={a.collectionPct} label="نسبة التحصيل" size={92} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, flex: 1, minWidth: 240 }}>
                <MiniStat label="قيمة المشروع" value={formatCurrency(a.projectValue)} />
                <MiniStat label="المدفوع" value={formatCurrency(a.paid)} color="var(--success)" />
                <MiniStat label="المتبقي" value={formatCurrency(a.remaining)} color="var(--gold)" />
                <MiniStat label="آخر دفعة" value={a.lastPayment?.paid_date ? `${formatDate(a.lastPayment.paid_date)} · ${formatCurrency(a.lastPayment.amount)}` : "—"} />
              </div>
            </div>

            {a.showInvoices && a.projectInvoices.length > 0 && (
              <div style={{ marginBottom: a.showPayments && a.projectPayments.length > 0 ? 14 : 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>الفواتير</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {a.projectInvoices.map((inv) => {
                    const meta = INVOICE_STATUSES.find((s) => s.value === inv.status) ?? INVOICE_STATUSES[0];
                    return (
                      <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 12.5, padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8 }}>
                        <span style={{ minWidth: 0 }}>
                          #{inv.number} {inv.due_date ? `· تستحق ${formatDate(inv.due_date)}` : ""}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong>{formatCurrency((inv.amount || 0) + (inv.tax || 0))}</strong>
                          <span className="chip" style={{ fontSize: 10.5, color: meta.color, borderColor: meta.color }}>
                            {meta.label}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {a.showPayments && a.projectPayments.length > 0 && (
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>الدفعات</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {a.projectPayments.map((p) => {
                    const meta = PAYMENT_STATUSES.find((s) => s.value === p.status) ?? PAYMENT_STATUSES[0];
                    return (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 12.5, padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8 }}>
                        <span style={{ minWidth: 0 }}>{p.paid_date ? `دُفعت ${formatDate(p.paid_date)}` : p.due_date ? `تستحق ${formatDate(p.due_date)}` : "—"}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong>{formatCurrency(p.amount)}</strong>
                          <span className="chip" style={{ fontSize: 10.5, color: meta.color, borderColor: meta.color }}>
                            {meta.label}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(!a.showInvoices || a.projectInvoices.length === 0) && (!a.showPayments || a.projectPayments.length === 0) && (
              <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا توجد فواتير أو دفعات مسجّلة لهذا المشروع بعد.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2, color: color ?? "var(--text-primary)" }}>{value}</div>
    </div>
  );
}
