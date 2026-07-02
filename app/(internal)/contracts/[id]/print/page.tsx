/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import PrintButton from "@/app/components/finance/PrintButton";
import DocumentHeader, { printResetCss } from "@/app/components/finance/DocumentHeader";
import { fmtMoney } from "@/app/components/finance/format";
import type { Contract } from "@/app/lib/types";

export const dynamic = "force-dynamic";

interface ContractContent {
  intro?: string;
  clauses?: { title: string; body: string }[];
  pricing?: { label: string; amount: number }[];
  terms?: string;
  total?: number;
}

export default async function ContractPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const company = session!.company!;

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, clients(name, email, phone)")
    .eq("company_id", company.id)
    .eq("id", id)
    .single();

  if (!contract) notFound();

  const c = contract as Contract & { clients: { name: string; email: string | null; phone: string | null } | null };
  const content = (c.content ?? {}) as ContractContent;
  const total = content.total ?? (content.pricing ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <>
      <style>{printResetCss}</style>
      <div className="doc-toolbar no-print" style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
        <PrintButton />
      </div>

      <div className="doc-page">
        <DocumentHeader company={company} title="عقد" subtitle={c.title} />

        <div className="doc-meta">
          <div>
            <div className="doc-label">الطرف الثاني</div>
            <div className="doc-strong">{c.clients?.name ?? "—"}</div>
            {c.clients?.email && <div className="doc-muted">{c.clients.email}</div>}
            {c.clients?.phone && <div className="doc-muted">{c.clients.phone}</div>}
          </div>
          <div style={{ textAlign: "left" }}>
            <div className="doc-row">
              <span className="doc-muted">الإصدار:</span> v{c.version}
            </div>
          </div>
        </div>

        {content.intro && (
          <div className="doc-section">
            <p>{content.intro}</p>
          </div>
        )}

        {(content.clauses ?? []).length > 0 && (
          <div className="doc-section">
            <div className="doc-section-title">البنود</div>
            {content.clauses!.map((cl, i) => (
              <div className="doc-clause" key={i}>
                <div className="doc-clause-title">
                  {i + 1}. {cl.title}
                </div>
                <div className="doc-clause-body">{cl.body}</div>
              </div>
            ))}
          </div>
        )}

        {(content.pricing ?? []).length > 0 && (
          <>
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "right" }}>البند</th>
                  <th style={{ textAlign: "left" }}>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {content.pricing!.map((p, i) => (
                  <tr key={i}>
                    <td>{p.label}</td>
                    <td style={{ textAlign: "left" }}>{fmtMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="doc-totals">
              <div className="doc-total-row doc-grand">
                <span>الإجمالي</span>
                <span>{fmtMoney(total)}</span>
              </div>
            </div>
          </>
        )}

        {content.terms && (
          <div className="doc-notes">
            <div className="doc-label">الشروط العامة</div>
            <p style={{ whiteSpace: "pre-wrap" }}>{content.terms}</p>
          </div>
        )}

        <div className="doc-signatures">
          <div className="doc-sign-box">
            {company.stamp_url && <img src={company.stamp_url} alt="" className="doc-sign-img" />}
            <div className="doc-sign-line">{company.name}</div>
          </div>
          <div className="doc-sign-box">
            {company.signature_url && <img src={company.signature_url} alt="" className="doc-sign-img" />}
            <div className="doc-sign-line">{c.clients?.name ?? "العميل"}</div>
          </div>
        </div>
      </div>
    </>
  );
}
