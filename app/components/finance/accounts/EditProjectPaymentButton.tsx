"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { logActivity } from "@/app/lib/activity";
import { uploadFileWithProgress } from "@/app/lib/storage-upload";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/app/lib/constants";
import Icon from "@/app/components/ui/Icon";
import type { ProjectAccountPayment } from "@/app/lib/project-account";

// تعديل دفعة موجودة بعد إضافتها — نفس حقول نموذج الإضافة، مع إمكانية تصحيح
// الحالة والتواريخ ورقم المرجع، واستبدال المرفق إن رُفع ملف جديد (يبقى المرفق
// الحالي كما هو إن لم يُختر ملف بديل).
export default function EditProjectPaymentButton({ companyId, projectId, payment }: { companyId: string; projectId: string; payment: ProjectAccountPayment }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState(String(payment.amount));
  const [method, setMethod] = useState(payment.method ?? PAYMENT_METHODS[0].value);
  const [status, setStatus] = useState(payment.status);
  const [refNumber, setRefNumber] = useState(payment.reference_number ?? "");
  const [dueDate, setDueDate] = useState(payment.due_date ?? "");
  const [paidDate, setPaidDate] = useState(payment.paid_date ?? "");
  const [notes, setNotes] = useState(payment.notes ?? "");
  const [attachment, setAttachment] = useState<File | null>(null);

  const save = async () => {
    if (!amount) {
      setError("المبلغ مطلوب");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();

    let receiptUrl = payment.receipt_url;
    if (attachment) {
      const path = `${companyId}/${projectId}/payments/${Date.now()}-${attachment.name}`;
      const { error: uploadErr } = await uploadFileWithProgress(supabase, "project-files", path, attachment);
      if (uploadErr) {
        setSaving(false);
        setError(`تعذّر رفع المرفق: ${uploadErr}`);
        return;
      }
      const { data: signed } = await supabase.storage.from("project-files").createSignedUrl(path, 60 * 60 * 24 * 365);
      receiptUrl = signed?.signedUrl ?? receiptUrl;
    }

    const { error: err } = await supabase
      .from("payments")
      .update({
        amount: Number(amount),
        method,
        status,
        due_date: dueDate || null,
        paid_date: paidDate || null,
        reference_number: refNumber || null,
        notes: notes || null,
        receipt_url: receiptUrl,
      })
      .eq("id", payment.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity(supabase, { companyId, projectId, action: "payment_updated", details: { amount: Number(amount), status } });
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} title="تعديل الدفعة" onClick={() => setOpen(true)}>
        <Icon name="edit" size={14} />
      </button>

      {open && (
        <div className="modal-overlay no-print" onClick={() => !saving && setOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>تعديل الدفعة</h3>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                قيمة الدفعة (ر.س)
                <input className="input-field" style={{ marginTop: 6 }} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>

              <div style={{ display: "flex", gap: 12 }}>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  طريقة الدفع
                  <select className="input-field" style={{ marginTop: 6 }} value={method} onChange={(e) => setMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  الحالة
                  <select className="input-field" style={{ marginTop: 6 }} value={status} onChange={(e) => setStatus(e.target.value as ProjectAccountPayment["status"])}>
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  تاريخ الاستحقاق
                  <input className="input-field" style={{ marginTop: 6 }} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </label>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  تاريخ الدفع
                  <input className="input-field" style={{ marginTop: 6 }} type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
                </label>
              </div>

              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                رقم المرجع (اختياري)
                <input className="input-field" style={{ marginTop: 6 }} value={refNumber} onChange={(e) => setRefNumber(e.target.value)} />
              </label>

              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                ملاحظات (اختياري)
                <textarea className="input-field" style={{ marginTop: 6, minHeight: 60 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>

              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                استبدال المرفق (اختياري) {payment.receipt_url && !attachment && <span style={{ color: "var(--text-muted)" }}>— يوجد مرفق حالياً</span>}
                <input
                  className="input-field"
                  style={{ marginTop: 6 }}
                  type="file"
                  onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                />
              </label>

              {error && <p style={{ color: "#EF4444", fontSize: 13 }}>{error}</p>}

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="btn btn-gold" onClick={save} disabled={saving} style={{ flex: 1 }}>
                  {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </button>
                <button className="btn btn-outline" onClick={() => setOpen(false)} disabled={saving}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
