"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import { logActivity } from "@/app/lib/activity";
import {
  addFinancialCategory,
  deleteFinancialCategory,
  swapFinancialCategoryOrder,
  updateFinancialCategory,
} from "@/app/lib/financial-categories-actions";
import { fmtMoney } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";
import Modal, { Field } from "@/app/components/settings/Modal";
import type { FinancialCategory } from "@/app/lib/types";

type CategoryType = "income" | "expense";

const TYPE_LABEL: Record<CategoryType, string> = { income: "إيرادات", expense: "مصروفات" };

interface FormState {
  id: string | null;
  name: string;
  type: CategoryType;
  color: string;
}

const emptyForm = (type: CategoryType): FormState => ({ id: null, name: "", type, color: "#6B7280" });

export default function CategoriesClient({
  companyId,
  initialCategories,
  stats,
}: {
  companyId: string;
  initialCategories: FinancialCategory[];
  stats: Record<string, { count: number; total: number }>;
}) {
  const { profile } = useSession();
  const admin = isInternalAdmin(profile.role);
  const supabase = createClient();

  const [categories, setCategories] = useState<FinancialCategory[]>(initialCategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm("expense"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const income = categories.filter((c) => c.type === "income").sort((a, b) => a.sort_order - b.sort_order);
  const expense = categories.filter((c) => c.type === "expense").sort((a, b) => a.sort_order - b.sort_order);

  const openNew = (type: CategoryType) => {
    setForm(emptyForm(type));
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (cat: FinancialCategory) => {
    setForm({ id: cat.id, name: cat.name, type: cat.type, color: cat.color });
    setError(null);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("اسم التصنيف مطلوب");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (form.id) {
        await updateFinancialCategory(supabase, form.id, { name: form.name.trim(), color: form.color, type: form.type });
        setCategories((prev) =>
          prev.map((c) => (c.id === form.id ? { ...c, name: form.name.trim(), color: form.color, type: form.type } : c))
        );
        await logActivity(supabase, { companyId, action: "financial_category_updated", details: { name: form.name.trim() } });
      } else {
        const row = await addFinancialCategory(supabase, companyId, categories, {
          name: form.name.trim(),
          type: form.type,
          color: form.color,
        });
        setCategories((prev) => [...prev, row]);
        await logActivity(supabase, { companyId, action: "financial_category_created", details: { name: row.name, type: row.type } });
      }
      setModalOpen(false);
    } catch {
      setError("تعذّر حفظ التصنيف");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (cat: FinancialCategory) => {
    if (!confirm(`حذف تصنيف "${cat.name}"؟ المصروفات المرتبطة به تبقى موجودة بدون تصنيف.`)) return;
    await deleteFinancialCategory(supabase, cat.id);
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    await logActivity(supabase, { companyId, action: "financial_category_deleted", details: { name: cat.name } });
  };

  const move = async (list: FinancialCategory[], index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;
    const current = list[index];
    const other = list[swapIndex];
    await swapFinancialCategoryOrder(supabase, current, other);
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === current.id) return { ...c, sort_order: other.sort_order };
        if (c.id === other.id) return { ...c, sort_order: current.sort_order };
        return c;
      })
    );
  };

  const renderSection = (type: CategoryType, list: FinancialCategory[]) => (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>{TYPE_LABEL[type]}</h2>
        {admin && (
          <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => openNew(type)}>
            <Icon name="plus" size={14} /> إضافة تصنيف
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا توجد تصنيفات {TYPE_LABEL[type]} بعد</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((cat, i) => {
            const s = stats[cat.id] ?? { count: 0, total: 0 };
            return (
              <div
                key={cat.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-hover)",
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{cat.name}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {s.count} مصروف · {fmtMoney(s.total)}
                </span>
                {admin && (
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button className="btn-ghost" style={{ padding: "4px 6px", borderRadius: 6 }} disabled={i === 0} onClick={() => move(list, i, "up")} title="نقل لأعلى">
                      <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
                        <Icon name="chevronDown" size={14} />
                      </span>
                    </button>
                    <button className="btn-ghost" style={{ padding: "4px 6px", borderRadius: 6 }} disabled={i === list.length - 1} onClick={() => move(list, i, "down")} title="نقل لأسفل">
                      <Icon name="chevronDown" size={14} />
                    </button>
                    <button className="btn-ghost" style={{ padding: "4px 6px", borderRadius: 6 }} onClick={() => openEdit(cat)} title="تعديل">
                      <Icon name="edit" size={14} />
                    </button>
                    <button className="btn-ghost" style={{ padding: "4px 6px", borderRadius: 6, color: "#EF4444" }} onClick={() => remove(cat)} title="حذف">
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
          التصنيفات المالية
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          تصنيفات الإيرادات والمصروفات المستخدمة في تبويب &quot;التصنيف المالي&quot; عند إضافة مصروف
        </p>
      </div>

      {renderSection("income", income)}
      {renderSection("expense", expense)}

      {modalOpen && (
        <Modal
          title={form.id ? "تعديل تصنيف" : "إضافة تصنيف"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-gold" onClick={save} disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>
                إلغاء
              </button>
            </>
          }
        >
          {error && (
            <div className="btn-danger" style={{ width: "100%", justifyContent: "center", marginBottom: 14, cursor: "default" }}>
              {error}
            </div>
          )}
          <Field label="الاسم">
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: عمولات مبيعات" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="النوع">
              <select
                className="input-field"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CategoryType })}
              >
                <option value="expense">مصروفات</option>
                <option value="income">إيرادات</option>
              </select>
            </Field>
            <Field label="اللون">
              <input
                type="color"
                className="input-field"
                style={{ padding: 4, height: 42 }}
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
