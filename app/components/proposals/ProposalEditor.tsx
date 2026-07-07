"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import { PROPOSAL_STATUSES, PROPOSAL_TYPES } from "@/app/lib/constants";
import Icon from "@/app/components/ui/Icon";
import type { Proposal, ProposalStatus, ProposalType } from "@/app/lib/types";

interface Section {
  heading: string;
  body: string;
}
interface ProposalContent {
  sections?: Section[];
}

export default function ProposalEditor({
  proposal,
}: {
  proposal: Proposal & { projects: { name: string } | null; clients: { name: string } | null };
}) {
  const content = (proposal.content ?? {}) as ProposalContent;
  const [title, setTitle] = useState(proposal.title);
  const [type, setType] = useState<ProposalType>(proposal.type);
  const [status, setStatus] = useState<ProposalStatus>(proposal.status);
  const [sections, setSections] = useState<Section[]>(content.sections ?? []);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save(newStatus?: ProposalStatus) {
    setSaving(true);
    const supabase = createClient();
    const nextStatus = newStatus ?? status;
    const { error } = await supabase
      .from("proposals")
      .update({ title, type, status: nextStatus, content: { sections } })
      .eq("id", proposal.id);
    setSaving(false);
    if (!error) {
      setStatus(nextStatus);
      setSavedAt(new Date().toLocaleTimeString("ar-u-nu-latn"));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <Link href="/proposals" className="btn btn-ghost">
          <Icon name="arrowRight" size={16} /> العروض
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href={`/proposals/${proposal.id}/print`} className="btn btn-outline">
            <Icon name="export" size={16} /> طباعة / PDF
          </Link>
          <button className="btn btn-gold" onClick={() => save()} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input className="input-field" style={{ flex: 2, fontWeight: 700 }} value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="input-field" style={{ flex: 1 }} value={type} onChange={(e) => setType(e.target.value as ProposalType)}>
            {PROPOSAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select className="input-field" style={{ flex: 1 }} value={status} onChange={(e) => save(e.target.value as ProposalStatus)}>
            {PROPOSAL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          المشروع: {proposal.projects?.name ?? "—"} · العميل: {proposal.clients?.name ?? "—"}
          {savedAt && <span> · تم الحفظ {savedAt}</span>}
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontWeight: 700 }}>أقسام العرض</h3>
          <button className="btn btn-ghost" onClick={() => setSections([...sections, { heading: "", body: "" }])}>
            <Icon name="plus" size={16} /> إضافة قسم
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sections.map((s, i) => (
            <div key={i} className="card" style={{ padding: 14, background: "var(--bg-secondary)" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  className="input-field"
                  placeholder="عنوان القسم"
                  value={s.heading}
                  onChange={(e) => setSections(sections.map((x, xi) => (xi === i ? { ...x, heading: e.target.value } : x)))}
                />
                <button className="btn btn-ghost" onClick={() => setSections(sections.filter((_, xi) => xi !== i))}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
              <textarea
                className="input-field"
                rows={4}
                placeholder="محتوى القسم"
                value={s.body}
                onChange={(e) => setSections(sections.map((x, xi) => (xi === i ? { ...x, body: e.target.value } : x)))}
              />
            </div>
          ))}
          {sections.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا توجد أقسام بعد</p>}
        </div>
      </div>
    </div>
  );
}
