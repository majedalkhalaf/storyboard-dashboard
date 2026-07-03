"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { uploadFileWithProgress } from "@/app/lib/storage-upload";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/app/lib/constants";
import { todayIso } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";

interface VendorRow {
  id: string;
  name: string;
}

// نموذج إضافة مصروف مبسّط ومحصور بمشروع واحد ثابت — يخصم مباشرة من ربح هذا الحساب،
// بلا أي خطوة وسيطة (لا فاتورة ولا اعتماد مطلوب)، طبقاً للنموذج المطلوب صراحة.
export default function AddProjectExpenseButton({ companyId, projectId, vendors = [] }: { companyId: string; projectId: string; vendors?: VendorRow[] }) {
  const { userId } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].value);
  const [method, setMethod] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [vendorId, setVendorId] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const reset = () => {
    setTitle("");
    setAmount("");
    setCategory(EXPENSE_CATEGORIES[0].value);
    setMethod("");
    setExpenseDate(todayIso());
    setVendorId("");
    setAttachment(null);
    setError(null);
  };

  const save = async () => {
    if (!title.trim() || !amount) {
      setError("نوع المصروف والمبلغ مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();

    let attachmentUrl: string | null = null;
    if (attachment) {
      const path = `${companyId}/${projectId}/expenses/${Date.now()}-${attachment.name}`;
      const { error: uploadErr } = await uploadFileWithProgress(supabase, "project-files", path, attachment);
      if (uploadErr) {
        setSaving(false);
        setError(`تعذّر رفع المرفق: ${uploadErr}`);
        return;
      }
      const { data: signed } = await supabase.storage.from("project-files").createSignedUrl(path, 60 * 60 * 24 * 365);
      attachmentUrl = signed?.signedUrl ?? null;
    }

    const { error: err } = await supabase.from("expenses").insert({
      company_id: companyId,
      project_id: projectId,
      title: title.trim(),
      amount: Number(amount),
      category,
      payment_method: method || null,
      expense_date: expenseDate,
      created_by: userId,
      vendor_id: vendorId || null,
      attachment_url: attachmentUrl,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity(supabase, { companyId, projectId, action: "expense_added", details: { title: title.trim(), amount: Number(amount) } });
    setOpen(false);
    reset();
    router.refresh();
  };

  return (
    <>
      <button className="btn btn-gold" onClick={() => setOpen(true)}>
        <Icon name="plus" size={16} /> إضافة مصروف جديد
      </button>

      {open && (
        <div className="modal-overlay no-print" onClick={() => !saving && setOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>إضافة مصروف جديد</h3>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                نوع المصروف
                <input className="input-field" style={{ marginTop: 6 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: إيجار معدات إضاءة" />
              </label>

              <div style={{ display: "flex", gap: 12 }}>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  قيمة المصروف (ر.س)
                  <input className="input-field" style={{ marginTop: 6 }} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </label>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  التصنيف
                  <select className="input-field" style={{ marginTop: 6 }} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  طريقة الدفع
                  <select className="input-field" style={{ marginTop: 6 }} value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="">— غير محدد —</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  التاريخ
                  <input className="input-field" style={{ marginTop: 6 }} type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
                </label>
              </div>

              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                المورد (اختياري)
                <select className="input-field" style={{ marginTop: 6 }} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                  <option value="">— بدون مورد —</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                مرفق (اختياري)
                <input className="input-field" style={{ marginTop: 6 }} type="file" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
              </label>

              {error && <p style={{ color: "#EF4444", fontSize: 13 }}>{error}</p>}

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="btn btn-gold" onClick={save} disabled={saving} style={{ flex: 1 }}>
                  {saving ? "جارٍ الحفظ..." : "حفظ المصروف"}
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
