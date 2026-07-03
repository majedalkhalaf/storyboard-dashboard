"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { fmtMoney, fmtDate, todayIso } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";
import Modal, { Field } from "@/app/components/settings/Modal";
import type { BankAccount, BankTransaction, BankTransactionType } from "@/app/lib/types";

export interface AccountWithBalance extends BankAccount {
  balance: number;
  transactions: BankTransaction[];
}

const TYPE_LABEL: Record<BankTransactionType, string> = {
  deposit: "إيداع",
  withdrawal: "سحب",
  transfer_in: "تحويل وارد",
  transfer_out: "تحويل صادر",
};

const TYPE_COLOR: Record<BankTransactionType, string> = {
  deposit: "#1DB954",
  withdrawal: "#EF4444",
  transfer_in: "#1DB954",
  transfer_out: "#EF4444",
};

function maskAccountNumber(num: string | null): string {
  if (!num) return "—";
  const clean = num.replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
}

interface AccountForm {
  id: string | null;
  name: string;
  bank_name: string;
  account_number: string;
  iban: string;
  currency: string;
  opening_balance: string;
  notes: string;
}

const emptyAccountForm: AccountForm = {
  id: null,
  name: "",
  bank_name: "",
  account_number: "",
  iban: "",
  currency: "SAR",
  opening_balance: "0",
  notes: "",
};

interface TxForm {
  type: BankTransactionType;
  amount: string;
  transaction_date: string;
  reference: string;
  description: string;
}

const emptyTxForm = (): TxForm => ({
  type: "deposit",
  amount: "",
  transaction_date: todayIso(),
  reference: "",
  description: "",
});

export default function BankAccountsClient({
  companyId,
  initialAccounts,
}: {
  companyId: string;
  initialAccounts: AccountWithBalance[];
}) {
  const { userId } = useSession();
  const supabase = createClient();

  const [accounts, setAccounts] = useState<AccountWithBalance[]>(initialAccounts);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountForm>(emptyAccountForm);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [txAccountId, setTxAccountId] = useState<string | null>(null);
  const [txForm, setTxForm] = useState<TxForm>(emptyTxForm());
  const [savingTx, setSavingTx] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const totalBalance = useMemo(() => accounts.reduce((s, a) => s + a.balance, 0), [accounts]);

  const openNewAccount = () => {
    setAccountForm(emptyAccountForm);
    setAccountError(null);
    setAccountModalOpen(true);
  };

  const saveAccount = async () => {
    if (!accountForm.name.trim()) {
      setAccountError("اسم الحساب مطلوب");
      return;
    }
    setSavingAccount(true);
    setAccountError(null);
    const payload = {
      company_id: companyId,
      name: accountForm.name.trim(),
      bank_name: accountForm.bank_name.trim() || null,
      account_number: accountForm.account_number.trim() || null,
      iban: accountForm.iban.trim() || null,
      currency: accountForm.currency.trim() || "SAR",
      opening_balance: Number(accountForm.opening_balance) || 0,
      notes: accountForm.notes.trim() || null,
    };
    const { data, error } = await supabase.from("bank_accounts").insert(payload).select("*").single();
    setSavingAccount(false);
    if (error || !data) {
      setAccountError("تعذّر إضافة الحساب البنكي");
      return;
    }
    setAccounts((prev) => [{ ...(data as BankAccount), balance: payload.opening_balance, transactions: [] }, ...prev]);
    await logActivity(supabase, { companyId, action: "bank_account_created", details: { name: payload.name } });
    setAccountModalOpen(false);
  };

  const removeAccount = async (account: AccountWithBalance) => {
    if (!confirm(`حذف الحساب البنكي "${account.name}"؟ سيتم حذف كل حركاته أيضاً.`)) return;
    const { error } = await supabase.from("bank_accounts").delete().eq("id", account.id);
    if (error) return;
    setAccounts((prev) => prev.filter((a) => a.id !== account.id));
    await logActivity(supabase, { companyId, action: "bank_account_deleted", details: { name: account.name } });
  };

  const openNewTx = (accountId: string) => {
    setTxForm(emptyTxForm());
    setTxError(null);
    setTxAccountId(accountId);
  };

  const saveTx = async () => {
    if (!txAccountId || !txForm.amount || Number(txForm.amount) <= 0) {
      setTxError("المبلغ مطلوب ويجب أن يكون أكبر من صفر");
      return;
    }
    setSavingTx(true);
    setTxError(null);
    const payload = {
      company_id: companyId,
      bank_account_id: txAccountId,
      type: txForm.type,
      amount: Number(txForm.amount),
      transaction_date: txForm.transaction_date,
      reference: txForm.reference.trim() || null,
      description: txForm.description.trim() || null,
      created_by: userId,
    };
    const { data, error } = await supabase.from("bank_transactions").insert(payload).select("*").single();
    setSavingTx(false);
    if (error || !data) {
      setTxError("تعذّر إضافة الحركة");
      return;
    }
    const tx = data as BankTransaction;
    const signed = tx.type === "deposit" || tx.type === "transfer_in" ? tx.amount : -tx.amount;
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === txAccountId
          ? { ...a, balance: a.balance + signed, transactions: [tx, ...a.transactions] }
          : a
      )
    );
    await logActivity(supabase, { companyId, action: "bank_transaction_created", details: { type: tx.type, amount: tx.amount } });
    setTxAccountId(null);
  };

  const removeTx = async (accountId: string, tx: BankTransaction) => {
    if (!confirm("حذف هذه الحركة؟")) return;
    const { error } = await supabase.from("bank_transactions").delete().eq("id", tx.id);
    if (error) return;
    const signed = tx.type === "deposit" || tx.type === "transfer_in" ? tx.amount : -tx.amount;
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId
          ? { ...a, balance: a.balance - signed, transactions: a.transactions.filter((t) => t.id !== tx.id) }
          : a
      )
    );
  };

  // التسوية هنا يدوية بحتة: المستخدم يقارن الحركة بكشف حسابه البنكي الفعلي بنفسه ويضع علامة عليها،
  // ولا يوجد أي اتصال حقيقي بالبنك أو مطابقة تلقائية للحركات.
  const toggleReconciled = async (accountId: string, tx: BankTransaction) => {
    const next = !tx.reconciled;
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId
          ? { ...a, transactions: a.transactions.map((t) => (t.id === tx.id ? { ...t, reconciled: next } : t)) }
          : a
      )
    );
    await supabase.from("bank_transactions").update({ reconciled: next }).eq("id", tx.id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            الحسابات البنكية
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {accounts.length} حساب — سجل حركات يدوي، وليس اتصالاً مباشراً بأي بنك
          </p>
        </div>
        <button className="btn btn-gold" onClick={openNewAccount}>
          <Icon name="plus" size={16} /> إضافة حساب بنكي
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <div className="stat-card">
            <span style={{ color: "var(--gold)", display: "inline-flex" }}>
              <Icon name="storage" size={20} />
            </span>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>{fmtMoney(totalBalance)}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              إجمالي الأرصدة ({accounts.length} حساب — بدون تحويل عملات إن اختلفت)
            </div>
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="empty-state card">
          <Icon name="storage" size={32} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد حسابات بنكية بعد</p>
          <button className="btn btn-gold" style={{ marginTop: 14 }} onClick={openNewAccount}>
            <Icon name="plus" size={16} /> إضافة أول حساب
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {accounts.map((account) => {
            const expanded = expandedId === account.id;
            return (
              <div key={account.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{account.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{account.bank_name || "—"}</div>
                  </div>
                  <button className="btn-ghost" style={{ padding: 6 }} onClick={() => removeAccount(account)} title="حذف الحساب">
                    <Icon name="trash" size={16} className="text-muted" />
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>رقم الحساب</span>
                    <div style={{ fontFamily: "monospace" }}>{maskAccountNumber(account.account_number)}</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>الآيبان</span>
                    <div style={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {account.iban || "—"}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>العملة</span>
                    <div>{account.currency}</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>الرصيد الافتتاحي</span>
                    <div>{fmtMoney(account.opening_balance)}</div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--bg-hover)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>الرصيد الحالي</span>
                  <span style={{ fontSize: 17, fontWeight: 800, color: account.balance >= 0 ? "#1DB954" : "#EF4444" }}>
                    {fmtMoney(account.balance)}
                  </span>
                </div>

                {account.notes && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{account.notes}</p>}

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1, fontSize: 12, padding: "7px 10px" }} onClick={() => setExpandedId(expanded ? null : account.id)}>
                    {expanded ? "إخفاء الحركات" : `عرض الحركات (${account.transactions.length})`}
                  </button>
                  <button className="btn btn-outline" style={{ fontSize: 12, padding: "7px 10px" }} onClick={() => openNewTx(account.id)}>
                    <Icon name="plus" size={14} /> حركة
                  </button>
                </div>

                {expanded && (
                  <div className="table-scroll" style={{ overflow: "auto", marginTop: 4 }}>
                    {account.transactions.length === 0 ? (
                      <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>
                        لا توجد حركات على هذا الحساب بعد
                      </p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>التاريخ</th>
                            <th>النوع</th>
                            <th>المبلغ</th>
                            <th>المرجع</th>
                            <th>الوصف</th>
                            <th>مرتبط بـ</th>
                            <th>تسوية</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {account.transactions.map((t) => (
                            <tr key={t.id}>
                              <td>{fmtDate(t.transaction_date)}</td>
                              <td>
                                <span className="chip" style={{ color: TYPE_COLOR[t.type], borderColor: TYPE_COLOR[t.type] }}>
                                  {TYPE_LABEL[t.type]}
                                </span>
                              </td>
                              <td style={{ color: TYPE_COLOR[t.type], fontWeight: 700 }}>{fmtMoney(t.amount)}</td>
                              <td>{t.reference || "—"}</td>
                              <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {t.description || "—"}
                              </td>
                              <td>
                                {t.related_payment_id ? (
                                  <Link href="/payments" className="chip" style={{ textDecoration: "none" }}>
                                    دفعة <Icon name="arrowLeft" size={11} />
                                  </Link>
                                ) : t.related_expense_id ? (
                                  <Link href="/expenses" className="chip" style={{ textDecoration: "none" }}>
                                    مصروف <Icon name="arrowLeft" size={11} />
                                  </Link>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={t.reconciled}
                                  onChange={() => toggleReconciled(account.id, t)}
                                  title="مطابقة يدوية مع كشف الحساب البنكي الفعلي"
                                />
                              </td>
                              <td>
                                <button className="btn-ghost" style={{ padding: 4 }} onClick={() => removeTx(account.id, t)}>
                                  <Icon name="trash" size={13} className="text-muted" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {accountModalOpen && (
        <Modal
          title="إضافة حساب بنكي"
          onClose={() => setAccountModalOpen(false)}
          footer={
            <>
              <button className="btn btn-gold" onClick={saveAccount} disabled={savingAccount}>
                {savingAccount ? "جارٍ الحفظ..." : "حفظ"}
              </button>
              <button className="btn btn-outline" onClick={() => setAccountModalOpen(false)}>
                إلغاء
              </button>
            </>
          }
        >
          {accountError && (
            <div className="btn-danger" style={{ width: "100%", justifyContent: "center", marginBottom: 14, cursor: "default" }}>
              {accountError}
            </div>
          )}
          <Field label="اسم الحساب (اختياري تمييزه)">
            <input className="input-field" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="مثال: الحساب التشغيلي الرئيسي" />
          </Field>
          <Field label="اسم البنك">
            <input className="input-field" value={accountForm.bank_name} onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })} placeholder="مثال: البنك الأهلي" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="رقم الحساب">
              <input className="input-field" value={accountForm.account_number} onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })} />
            </Field>
            <Field label="الآيبان">
              <input className="input-field" value={accountForm.iban} onChange={(e) => setAccountForm({ ...accountForm, iban: e.target.value })} placeholder="SA..." />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="العملة">
              <input className="input-field" value={accountForm.currency} onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })} />
            </Field>
            <Field label="الرصيد الافتتاحي">
              <input type="number" min="0" className="input-field" value={accountForm.opening_balance} onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })} />
            </Field>
          </div>
          <Field label="ملاحظات">
            <textarea className="input-field" rows={2} value={accountForm.notes} onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })} style={{ resize: "vertical" }} />
          </Field>
        </Modal>
      )}

      {txAccountId && (
        <Modal
          title="إضافة حركة بنكية"
          onClose={() => setTxAccountId(null)}
          footer={
            <>
              <button className="btn btn-gold" onClick={saveTx} disabled={savingTx}>
                {savingTx ? "جارٍ الحفظ..." : "حفظ الحركة"}
              </button>
              <button className="btn btn-outline" onClick={() => setTxAccountId(null)}>
                إلغاء
              </button>
            </>
          }
        >
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
            هذا قيد دفتر يدوي تسجّله بنفسك مطابقاً لحركة حقيقية في حسابك — وليس اتصالاً تلقائياً بأي بنك.
          </p>
          {txError && (
            <div className="btn-danger" style={{ width: "100%", justifyContent: "center", marginBottom: 14, cursor: "default" }}>
              {txError}
            </div>
          )}
          <Field label="نوع الحركة">
            <select className="input-field" value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value as BankTransactionType })}>
              <option value="deposit">إيداع</option>
              <option value="withdrawal">سحب</option>
              <option value="transfer_in">تحويل وارد</option>
              <option value="transfer_out">تحويل صادر</option>
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="المبلغ">
              <input type="number" min="0" className="input-field" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} placeholder="0" />
            </Field>
            <Field label="التاريخ">
              <input type="date" className="input-field" value={txForm.transaction_date} onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })} />
            </Field>
          </div>
          <Field label="المرجع (اختياري)">
            <input className="input-field" value={txForm.reference} onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })} placeholder="رقم مرجعي من كشف الحساب" />
          </Field>
          <Field label="الوصف (اختياري)">
            <textarea className="input-field" rows={2} value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} style={{ resize: "vertical" }} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
