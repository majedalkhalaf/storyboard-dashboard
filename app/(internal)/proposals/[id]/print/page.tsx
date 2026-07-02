import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import PrintButton from "@/app/components/finance/PrintButton";
import DocumentHeader, { printResetCss } from "@/app/components/finance/DocumentHeader";
import { PROPOSAL_TYPES } from "@/app/lib/constants";
import type { Proposal } from "@/app/lib/types";

export const dynamic = "force-dynamic";

interface ProposalContent {
  sections?: { heading: string; body: string }[];
}

export default async function ProposalPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const company = session!.company!;

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*, clients(name, email, phone)")
    .eq("company_id", company.id)
    .eq("id", id)
    .single();

  if (!proposal) notFound();

  const p = proposal as Proposal & { clients: { name: string; email: string | null; phone: string | null } | null };
  const content = (p.content ?? {}) as ProposalContent;
  const typeLabel = PROPOSAL_TYPES.find((t) => t.value === p.type)?.label ?? p.type;

  return (
    <>
      <style>{printResetCss}</style>
      <div className="doc-toolbar no-print" style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
        <PrintButton />
      </div>

      <div className="doc-page">
        <DocumentHeader company={company} title={typeLabel} subtitle={p.title} />

        {p.clients?.name && (
          <div className="doc-meta">
            <div>
              <div className="doc-label">مُقدَّم إلى</div>
              <div className="doc-strong">{p.clients.name}</div>
              {p.clients.email && <div className="doc-muted">{p.clients.email}</div>}
            </div>
          </div>
        )}

        {(content.sections ?? []).map((s, i) => (
          <div className="doc-section" key={i}>
            <div className="doc-section-title">{s.heading}</div>
            <p style={{ whiteSpace: "pre-wrap" }}>{s.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
