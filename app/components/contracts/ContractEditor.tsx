"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import { CONTRACT_STATUSES } from "@/app/lib/constants";
import { fmtMoney } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";
import type { Contract, ContractStatus } from "@/app/lib/types";

interface Clause {
  title: string;
  body: string;
}
interface PricingItem {
  label: string;
  amount: number;
}
interface ContractContent {
  intro?: string;
  clauses?: Clause[];
  pricing?: PricingItem[];
  terms?: string;
}

export default function ContractEditor({
  contract,
  projectServices,
}: {
  contract: Contract & { projects: { name: string } | null; clients: { name: string } | null };
  projectServices: { label: string; category: string }[];
}) {
  const content = (contract.content ?? {}) as ContractContent;
  const [title, setTitle] = useState(contract.title);
  const [status, setStatus] = useState<ContractStatus>(contract.status);
  const [intro, setIntro] = useState(content.intro ?? "");
  const [clauses, setClauses] = useState<Clause[]>(content.clauses ?? []);
  const [pricing, setPricing] = useState<PricingItem[]>(
    content.pricing?.length ? content.pricing : projectServices.map((s) => ({ label: s.label, amount: 0 }))
  );
  const [terms, setTerms] = useState(content.terms ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const total = pricing.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  async function save(newStatus?: ContractStatus) {
    setSaving(true);
    const supabase = createClient();
    const nextStatus = newStatus ?? status;
    const { error } = await supabase
      .from("contracts")
      .update({
        title,
        status: nextStatus,
        content: { intro, clauses, pricing, terms, total },
      })
      .eq("id", contract.id);
    setSaving(false);
    if (!error) {
      setStatus(nextStatus);
      setSavedAt(new Date().toLocaleTimeString("ar-u-nu-latn"));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <Link href="/contracts" className="btn btn-ghost">
          <Icon name="arrowRight" size={16} /> العقود
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href={`/contracts/${contract.id}/print`} className="btn btn-outline">
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
          <select className="input-field" style={{ flex: 1 }} value={status} onChange={(e) => save(e.target.value as ContractStatus)}>
            {CONTRACT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          المشروع: {contract.projects?.name ?? "—"} · العميل: {contract.clients?.name ?? "—"}
          {savedAt && <span> · تم الحفظ {savedAt}</span>}
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 10 }}>مقدمة العقد</h3>
        <textarea className="input-field" rows={4} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="نص تمهيدي يوضح موضوع العقد بين الطرفين..." />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontWeight: 700 }}>البنود</h3>
          <button className="btn btn-ghost" onClick={() => setClauses([...clauses, { title: "", body: "" }])}>
            <Icon name="plus" size={16} /> إضافة بند
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {clauses.map((c, i) => (
            <div key={i} className="card" style={{ padding: 14, background: "var(--bg-secondary)" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  className="input-field"
                  placeholder="عنوان البند"
                  value={c.title}
                  onChange={(e) => setClauses(clauses.map((x, xi) => (xi === i ? { ...x, title: e.target.value } : x)))}
                />
                <button className="btn btn-ghost" onClick={() => setClauses(clauses.filter((_, xi) => xi !== i))}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
              <textarea
                className="input-field"
                rows={3}
                placeholder="نص البند"
                value={c.body}
                onChange={(e) => setClauses(clauses.map((x, xi) => (xi === i ? { ...x, body: e.target.value } : x)))}
              />
            </div>
          ))}
          {clauses.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا توجد بنود بعد</p>}
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontWeight: 700 }}>الأسعار</h3>
          <button className="btn btn-ghost" onClick={() => setPricing([...pricing, { label: "", amount: 0 }])}>
            <Icon name="plus" size={16} /> إضافة بند سعر
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pricing.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <input
                className="input-field"
                style={{ flex: 2 }}
                placeholder="البند"
                value={p.label}
                onChange={(e) => setPricing(pricing.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)))}
              />
              <input
                className="input-field"
                style={{ flex: 1 }}
                type="number"
                placeholder="المبلغ"
                value={p.amount}
                onChange={(e) => setPricing(pricing.map((x, xi) => (xi === i ? { ...x, amount: Number(e.target.value) } : x)))}
              />
              <button className="btn btn-ghost" onClick={() => setPricing(pricing.filter((_, xi) => xi !== i))}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "left", marginTop: 12, fontWeight: 800, fontSize: 16 }}>الإجمالي: {fmtMoney(total)}</div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 10 }}>الشروط العامة</h3>
        <textarea className="input-field" rows={5} value={terms} onChange={(e) => setTerms(e.target.value)} />
      </div>
    </div>
  );
}
