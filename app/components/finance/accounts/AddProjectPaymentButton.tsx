"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { logActivity } from "@/app/lib/activity";
import { uploadFileWithProgress } from "@/app/lib/storage-upload";
import { PAYMENT_METHODS } from "@/app/lib/constants";
import { todayIso } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";

// نموذج إضافة دفعة (إيراد) مبسّط ومحصور بمشروع واحد ثابت — لا حقل اختيار مشروع هنا
// عمداً، بخلاف /payments العامة التي تخدم كل المشاريع.
export default function AddProjectPaymentButton({ companyId, projectId }: { companyId: string; projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(PAYMENT_METHODS[0].value);
  const [refNumber, setRefNumber] = useState("");
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const reset = () => {
    setAmount("");
    setMethod(PAYMENT_METHODS[0].value);
    setRefNumber("");
    setDate(todayIso());
    setNotes("");
    setAttachment(null);
    setError(null);
  };

  const save = async () => {
    if (!amount) {
      setError("المبلغ مطلوب");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();

    let receiptUrl: string | null = null;
    if (attachment) {
      const path = `${companyId}/${projectId}/payments/${Date.now()}-${attachment.name}`;
      const { error: uploadErr } = await uploadFileWithProgress(supabase, "project-files", path, attachment);
      if (uploadErr) {
        setSaving(false);
        setError(`تعذّر رفع المرفق: ${uploadErr}`);
        return;
      }
      // رابط موقّع صالح لسنة — الحاوية (project-files) خاصة تماماً ولا تدعم روابط
      // عامة دائمة؛ يلزم إعادة توليد الرابط لاحقاً إن انتهت صلاحيته بعد هذه المدة.
      const { data: signed } = await supabase.storage.from("project-files").createSignedUrl(path, 60 * 60 * 24 * 365);
      receiptUrl = signed?.signedUrl ?? null;
    }

    const { error: err } = await supabase.from("payments").insert({
      company_id: companyId,
      project_id: projectId,
      amount: Number(amount),
      method,
      status: "paid",
      paid_date: date,
      reference_number: refNumber || null,
      notes: notes || null,
      receipt_url: receiptUrl,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity(supabase, { companyId, projectId, action: "payment_added", details: { amount: Number(amount), status: "paid" } });
    setOpen(false);
    reset();
    router.refresh();
  };

  return (
    <>
      <button className="btn btn-gold" onClick={() => setOpen(true)}>
        <Icon name="plus" size={16} /> إضافة دفعة جديدة
      </button>

      {open && (
        <div className="modal-overlay no-print" onClick={() => !saving && setOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>إضافة دفعة جديدة</h3>
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
                  التاريخ
                  <input className="input-field" style={{ marginTop: 6 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
                مرفق (اختياري)
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
                  {saving ? "جارٍ الحفظ..." : "حفظ الدفعة"}
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
