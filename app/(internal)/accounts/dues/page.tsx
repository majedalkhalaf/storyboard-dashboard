import { getCurrentSession } from "@/app/lib/supabase/session";
import { createClient } from "@/app/lib/supabase/server";
import Icon from "@/app/components/ui/Icon";
import { fmtMoney, fmtDate, todayIso } from "@/app/components/finance/format";
import type { Invoice, Payment } from "@/app/lib/types";

export const dynamic = "force-dynamic";

interface DueRow {
  kind: "invoice" | "payment";
  id: string;
  label: string; // رقم الفاتورة أو "دفعة"
  projectName: string;
  clientName: string | null;
  amount: number;
  dueDate: string | null;
}

function badgeFor(dueDate: string | null) {
  if (!dueDate) return { label: "بلا تاريخ", color: "var(--text-muted)" };
  const today = new Date(todayIso());
  const d = new Date(dueDate);
  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `متأخر ${Math.abs(diffDays)} يوم`, color: "#EF4444" };
  if (diffDays <= 7) return { label: diffDays === 0 ? "يستحق اليوم" : `يستحق خلال ${diffDays} يوم`, color: "#F59E0B" };
  return { label: `يستحق خلال ${diffDays} يوم`, color: "var(--text-muted)" };
}

export default async function FinanceDuesPage() {
  const session = await getCurrentSession();
  const companyId = session!.company!.id;
  const supabase = await createClient();

  const [{ data: invoiceRows }, { data: paymentRows }, { data: projectRows }, { data: clientRows }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, number, project_id, client_id, amount, tax, due_date")
      .eq("company_id", companyId)
      .in("status", ["unpaid", "overdue"]),
    supabase.from("payments").select("id, project_id, amount, due_date").eq("company_id", companyId).in("status", ["pending", "overdue"]),
    supabase.from("projects").select("id, name, client_id").eq("company_id", companyId),
    supabase.from("clients").select("id, name").eq("company_id", companyId),
  ]);

  const projectNameById = new Map((projectRows ?? []).map((p) => [p.id as string, p.name as string]));
  const clientIdByProjectId = new Map((projectRows ?? []).map((p) => [p.id as string, p.client_id as string | null]));
  const clientNameById = new Map((clientRows ?? []).map((c) => [c.id as string, c.name as string]));

  const invoices = (invoiceRows ?? []) as Pick<Invoice, "id" | "number" | "project_id" | "client_id" | "amount" | "tax" | "due_date">[];
  const payments = (paymentRows ?? []) as Pick<Payment, "id" | "project_id" | "amount" | "due_date">[];

  const clientNameForProject = (projectId: string | null) => {
    if (!projectId) return null;
    const clientId = clientIdByProjectId.get(projectId);
    return clientId ? (clientNameById.get(clientId) ?? null) : null;
  };

  const rows: DueRow[] = [
    ...invoices.map((i) => ({
      kind: "invoice" as const,
      id: i.id,
      label: `فاتورة ${i.number}`,
      projectName: (i.project_id && projectNameById.get(i.project_id)) ?? "—",
      clientName: (i.client_id && clientNameById.get(i.client_id)) ?? clientNameForProject(i.project_id),
      amount: Number(i.amount) + Number(i.tax ?? 0),
      dueDate: i.due_date,
    })),
    ...payments.map((p) => ({
      kind: "payment" as const,
      id: p.id,
      label: "دفعة مستحقة",
      projectName: (p.project_id && projectNameById.get(p.project_id)) ?? "—",
      clientName: clientNameForProject(p.project_id),
      amount: Number(p.amount),
      dueDate: p.due_date,
    })),
  ];

  const today = new Date(todayIso());
  const overdue = rows.filter((r) => r.dueDate && new Date(r.dueDate) < today).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  const upcoming = rows
    .filter((r) => !r.dueDate || new Date(r.dueDate) >= today)
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  const totalDue = rows.reduce((s, r) => s + r.amount, 0);
  const totalOverdue = overdue.reduce((s, r) => s + r.amount, 0);

  const byClient = new Map<string, number>();
  for (const r of rows) byClient.set(r.clientName ?? "بدون عميل", (byClient.get(r.clientName ?? "بدون عميل") ?? 0) + r.amount);
  const byClientRows = Array.from(byClient.entries())
    .map(([clientName, amount]) => ({ clientName, amount }))
    .sort((a, b) => b.amount - a.amount);

  const byProject = new Map<string, number>();
  for (const r of rows) byProject.set(r.projectName, (byProject.get(r.projectName) ?? 0) + r.amount);
  const byProjectRows = Array.from(byProject.entries())
    .map(([projectName, amount]) => ({ projectName, amount }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
          المستحقات
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          الفواتير والدفعات غير المحصّلة عبر كل مشاريع الشركة
        </p>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
        <div className="stat-card">
          <span style={{ color: "#F59E0B", display: "inline-flex" }}>
            <Icon name="clock" size={20} />
          </span>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10, color: "#F59E0B" }}>{fmtMoney(totalDue)}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>إجمالي المستحقات</div>
        </div>
        <div className="stat-card">
          <span style={{ color: "#EF4444", display: "inline-flex" }}>
            <Icon name="alert" size={20} />
          </span>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10, color: "#EF4444" }}>{fmtMoney(totalOverdue)}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>متأخرة</div>
        </div>
        <div className="stat-card">
          <span style={{ color: "var(--gold)", display: "inline-flex" }}>
            <Icon name="tasks" size={20} />
          </span>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10 }}>{rows.length}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>عدد البنود</div>
        </div>
      </div>

      <DuesTable title="المستحقات المتأخرة" rows={overdue} emptyLabel="لا توجد مستحقات متأخرة" />
      <DuesTable title="المستحقات القادمة" rows={upcoming} emptyLabel="لا توجد مستحقات قادمة" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="finance-charts-grid">
        <GroupTable title="حسب العميل" rows={byClientRows.map((r) => ({ label: r.clientName, amount: r.amount }))} />
        <GroupTable title="حسب المشروع" rows={byProjectRows.map((r) => ({ label: r.projectName, amount: r.amount }))} />
      </div>

      <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
        ملاحظة: لا يوجد زر «إرسال تذكير» في هذه الصفحة — لا توجد قناة إشعار فعلية للعميل (بريد/واتساب) في النظام حالياً، وإضافة زر يبدو
        وكأنه يرسل تذكيراً فعلياً بينما لا يحدث شيء تُعتبر ميزة وهمية.
      </p>
    </div>
  );
}

function DuesTable({ title, rows, emptyLabel }: { title: string; rows: DueRow[]; emptyLabel: string }) {
  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      {rows.length === 0 ? (
        <div className="empty-state card">
          <Icon name="checkCircle" size={28} className="text-muted" />
          <p style={{ marginTop: 10 }}>{emptyLabel}</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>البند</th>
                <th>المشروع</th>
                <th>العميل</th>
                <th>المبلغ</th>
                <th>تاريخ الاستحقاق</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const badge = badgeFor(r.dueDate);
                return (
                  <tr key={`${r.kind}-${r.id}`}>
                    <td>{r.label}</td>
                    <td style={{ fontWeight: 600 }}>{r.projectName}</td>
                    <td style={{ color: "var(--text-muted)" }}>{r.clientName ?? "—"}</td>
                    <td style={{ fontWeight: 700 }}>{fmtMoney(r.amount)}</td>
                    <td>{fmtDate(r.dueDate)}</td>
                    <td>
                      <span className="chip" style={{ color: badge.color, borderColor: badge.color, fontSize: 11 }}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GroupTable({ title, rows }: { title: string; rows: { label: string; amount: number }[] }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{title}</h2>
      {rows.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا توجد بيانات</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--text-secondary)" }}>{r.label}</span>
              <span style={{ fontWeight: 700, color: "#F59E0B" }}>{fmtMoney(r.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
