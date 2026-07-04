"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import type { CompanyBankAccount } from "@/app/lib/types";

const CURRENCIES = ["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"];

type DraftAccount = Omit<CompanyBankAccount, "id" | "company_id" | "created_at" | "updated_at">;

const EMPTY_DRAFT: DraftAccount = {
  bank_name: "",
  beneficiary_name: "",
  account_number: "",
  iban: "",
  swift_code: "",
  currency: "SAR",
  bank_logo_url: null,
  is_default: false,
};

// حسابات بنكية متعددة للشركة — الحساب الافتراضي هو ما تسحبه الفواتير والعقود
// تلقائياً (يُفرض بقاء حساب افتراضي واحد فقط عبر trigger في قاعدة البيانات،
// وليس فقط منطق الواجهة هنا).
export default function CompanyBankAccountsSection({ companyId }: { companyId: string }) {
  const [accounts, setAccounts] = useState<CompanyBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftAccount>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("company_bank_accounts")
      .select("*")
      .eq("company_id", companyId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setAccounts((data ?? []) as CompanyBankAccount[]);
        setLoading(false);
      });
  }, [companyId]);

  async function addAccount() {
    if (!draft.bank_name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("company_bank_accounts")
      .insert({ ...draft, company_id: companyId, is_default: accounts.length === 0 ? true : draft.is_default })
      .select("*")
      .single();
    setSaving(false);
    if (!error && data) {
      const inserted = data as CompanyBankAccount;
      setAccounts((prev) => (inserted.is_default ? [inserted, ...prev.map((a) => ({ ...a, is_default: false }))] : [...prev, inserted]));
      setDraft(EMPTY_DRAFT);
      setAdding(false);
    }
  }

  async function setDefault(id: string) {
    setAccounts((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
    const supabase = createClient();
    await supabase.from("company_bank_accounts").update({ is_default: true }).eq("id", id);
  }

  async function deleteAccount(id: string) {
    if (!confirm("حذف هذا الحساب البنكي؟")) return;
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    const supabase = createClient();
    await supabase.from("company_bank_accounts").delete().eq("id", id);
  }

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontWeight: 700 }}>الحسابات البنكية</h3>
        <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={() => setAdding((v) => !v)}>
          <Icon name="plus" size={14} /> إضافة حساب
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>جارٍ التحميل...</p>
      ) : accounts.length === 0 && !adding ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا توجد حسابات بنكية مضافة بعد. الحساب الافتراضي يُستخدم تلقائياً في الفواتير.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {accounts.map((a) => (
            <div key={a.id} className="card" style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  {a.bank_name}
                  {a.is_default && (
                    <span className="chip" style={{ fontSize: 10, color: "var(--success)", borderColor: "var(--success)" }}>
                      افتراضي
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                  {[a.beneficiary_name, a.iban || a.account_number, a.currency].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {!a.is_default && (
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setDefault(a.id)}>
                    تعيين كافتراضي
                  </button>
                )}
                <button className="btn-ghost" style={{ color: "#ef4444", padding: 8 }} onClick={() => deleteAccount(a.id)} aria-label="حذف">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="settings-items-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <TextInput label="اسم البنك" value={draft.bank_name} onChange={(v) => setDraft({ ...draft, bank_name: v })} />
            <TextInput label="اسم المستفيد" value={draft.beneficiary_name ?? ""} onChange={(v) => setDraft({ ...draft, beneficiary_name: v })} />
            <TextInput label="رقم الحساب" value={draft.account_number ?? ""} onChange={(v) => setDraft({ ...draft, account_number: v })} />
            <TextInput label="IBAN" value={draft.iban ?? ""} onChange={(v) => setDraft({ ...draft, iban: v })} />
            <TextInput label="SWIFT Code" value={draft.swift_code ?? ""} onChange={(v) => setDraft({ ...draft, swift_code: v })} />
            <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              العملة
              <select className="input-field" style={{ marginTop: 6 }} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-gold" onClick={addAccount} disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ الحساب"}
            </button>
            <button className="btn btn-ghost" onClick={() => setAdding(false)}>
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
      {label}
      <input className="input-field" style={{ marginTop: 6 }} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
