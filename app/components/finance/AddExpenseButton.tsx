"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import { EXPENSE_CATEGORIES } from "@/app/lib/constants";
import { todayIso } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";

interface ProjectRow {
  id: string;
  name: string;
}

export default function AddExpenseButton({
  companyId,
  projects,
}: {
  companyId: string;
  projects: ProjectRow[];
}) {
  const { profile, userId } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].value);
  const [projectId, setProjectId] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayIso());

  if (!isInternalAdmin(profile.role)) return null;

  const reset = () => {
    setTitle("");
    setAmount("");
    setCategory(EXPENSE_CATEGORIES[0].value);
    setProjectId("");
    setExpenseDate(todayIso());
    setError(null);
  };

  const save = async () => {
    if (!title.trim() || !amount) {
      setError("العنوان والمبلغ مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("expenses").insert({
      company_id: companyId,
      project_id: projectId || null,
      title: title.trim(),
      amount: Number(amount),
      category,
      expense_date: expenseDate,
      created_by: userId,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
  };

  return (
    <>
      <button className="btn btn-gold" onClick={() => setOpen(true)}>
        <Icon name="plus" size={16} /> إضافة مصروف
      </button>

      {open && (
        <div className="modal-overlay no-print" onClick={() => !saving && setOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>إضافة مصروف</h3>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                العنوان
                <input
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: إيجار معدات إضاءة"
                />
              </label>

              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                المبلغ (ر.س)
                <input
                  className="input-field"
                  style={{ marginTop: 6 }}
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </label>

              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                التصنيف
                <select
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                المشروع (اختياري)
                <select
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">— مصروف عام —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                التاريخ
                <input
                  className="input-field"
                  style={{ marginTop: 6 }}
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
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
