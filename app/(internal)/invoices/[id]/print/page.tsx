/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import PrintButton from "@/app/components/finance/PrintButton";
import DocumentHeader, { printResetCss, defaultSignatureUrl } from "@/app/components/finance/DocumentHeader";
import { INVOICE_STATUSES } from "@/app/lib/constants";
import type { CompanyBankAccount, Invoice } from "@/app/lib/types";

export const dynamic = "force-dynamic";

function fmtMoney(v: number | null | undefined) {
  return `${Number(v ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ر.س`;
}
function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB");
}

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const company = session!.company!;

  const [{ data: invoice }, { data: bankAccount }] = await Promise.all([
    supabase.from("invoices").select("*, projects(name), clients(name, email, phone)").eq("company_id", company.id).eq("id", id).single(),
    supabase.from("company_bank_accounts").select("*").eq("company_id", company.id).eq("is_default", true).maybeSingle(),
  ]);

  if (!invoice) notFound();

  const inv = invoice as Invoice & {
    projects: { name: string } | null;
    clients: { name: string; email: string | null; phone: string | null } | null;
  };
  const account = bankAccount as CompanyBankAccount | null;
  const total = Number(inv.amount) + Number(inv.tax ?? 0);
  const statusLabel = INVOICE_STATUSES.find((s) => s.value === inv.status)?.label ?? inv.status;

  return (
    <>
      <style>{printResetCss}</style>
      <div className="doc-toolbar no-print" style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
        <PrintButton />
      </div>

      <div className="doc-page">
        <DocumentHeader company={company} title="فاتورة" subtitle={inv.number} />

        <div className="doc-meta">
          <div>
            <div className="doc-label">فاتورة إلى</div>
            <div className="doc-strong">{inv.clients?.name ?? "—"}</div>
            {inv.clients?.email && <div className="doc-muted">{inv.clients.email}</div>}
            {inv.clients?.phone && <div className="doc-muted">{inv.clients.phone}</div>}
          </div>
          <div style={{ textAlign: "left" }}>
            <div className="doc-row"><span className="doc-muted">رقم الفاتورة:</span> <strong>{inv.number}</strong></div>
            <div className="doc-row"><span className="doc-muted">تاريخ الإصدار:</span> {fmtDate(inv.issue_date)}</div>
            <div className="doc-row"><span className="doc-muted">تاريخ الاستحقاق:</span> {fmtDate(inv.due_date)}</div>
            <div className="doc-row"><span className="doc-muted">الحالة:</span> {statusLabel}</div>
          </div>
        </div>

        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ textAlign: "right" }}>البند</th>
              <th style={{ textAlign: "left" }}>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{inv.projects?.name ?? "خدمات إنتاج"}</td>
              <td style={{ textAlign: "left" }}>{fmtMoney(inv.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="doc-totals">
          <div className="doc-total-row"><span>المجموع الفرعي</span><span>{fmtMoney(inv.amount)}</span></div>
          <div className="doc-total-row"><span>الضريبة</span><span>{fmtMoney(inv.tax)}</span></div>
          <div className="doc-total-row doc-grand"><span>الإجمالي</span><span>{fmtMoney(total)}</span></div>
        </div>

        {inv.notes && (
          <div className="doc-notes">
            <div className="doc-label">ملاحظات</div>
            <p>{inv.notes}</p>
          </div>
        )}

        {account && (
          <div className="doc-section">
            <div className="doc-section-title">بيانات التحويل البنكي</div>
            <div className="doc-notes" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <BankField label="البنك" value={account.bank_name} />
              <BankField label="المستفيد" value={account.beneficiary_name} />
              <BankField label="رقم الحساب" value={account.account_number} />
              <BankField label="IBAN" value={account.iban} />
              <BankField label="SWIFT" value={account.swift_code} />
              <BankField label="العملة" value={account.currency} />
            </div>
          </div>
        )}

        <div className="doc-signatures">
          <div className="doc-sign-box">
            {company.stamp_url && <img src={company.stamp_url} alt="" className="doc-sign-img" />}
            <div className="doc-sign-line">ختم الشركة</div>
          </div>
          <div className="doc-sign-box">
            {defaultSignatureUrl(company) && <img src={defaultSignatureUrl(company)!} alt="" className="doc-sign-img" />}
            <div className="doc-sign-line">التوقيع المعتمد</div>
          </div>
        </div>

        <DocumentFooter company={company} />
      </div>
    </>
  );
}

function BankField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="doc-label">{label}</div>
      <div style={{ fontSize: 13 }}>{value}</div>
    </div>
  );
}

function DocumentFooter({
  company,
}: {
  company: { name: string; email: string | null; phone: string | null; website: string | null; tax_number: string | null };
}) {
  return (
    <div className="doc-footer">
      <div>{company.name}</div>
      <div className="doc-muted">
        {[company.phone, company.email, company.website].filter(Boolean).join(" · ")}
      </div>
      {company.tax_number && <div className="doc-muted">الرقم الضريبي: {company.tax_number}</div>}
    </div>
  );
}
