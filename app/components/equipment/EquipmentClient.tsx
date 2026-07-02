"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import Modal, { Field } from "@/app/components/settings/Modal";
import { createClient } from "@/app/lib/supabase/client";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUSES,
  equipmentCategoryLabel,
  equipmentStatusInfo,
} from "@/app/lib/equipment-constants";
import type { Equipment, EquipmentStatus } from "@/app/lib/types";

type FormState = {
  id: string | null;
  name: string;
  category: string;
  quantity: number;
  status: EquipmentStatus;
  notes: string;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  category: EQUIPMENT_CATEGORIES[0].value,
  quantity: 1,
  status: "available",
  notes: "",
};

export default function EquipmentClient({
  initialItems,
  companyId,
}: {
  initialItems: Equipment[];
  companyId: string;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<Equipment[]>(initialItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");

  const openNew = () => {
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: Equipment) => {
    setForm({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      status: item.status,
      notes: item.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("اسم المعدة مطلوب");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      company_id: companyId,
      name: form.name.trim(),
      category: form.category,
      quantity: Number(form.quantity) || 0,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    if (form.id) {
      const { data, error: err } = await supabase
        .from("equipment")
        .update(payload)
        .eq("id", form.id)
        .select("*")
        .single();
      if (err) {
        setError("تعذّر حفظ التعديلات");
        setSaving(false);
        return;
      }
      setItems((prev) => prev.map((it) => (it.id === form.id ? (data as Equipment) : it)));
    } else {
      const { data, error: err } = await supabase.from("equipment").insert(payload).select("*").single();
      if (err) {
        setError("تعذّر إضافة المعدة");
        setSaving(false);
        return;
      }
      setItems((prev) => [data as Equipment, ...prev]);
    }
    setSaving(false);
    setModalOpen(false);
  };

  const remove = async (item: Equipment) => {
    if (!confirm(`حذف "${item.name}"؟`)) return;
    const { error: err } = await supabase.from("equipment").delete().eq("id", item.id);
    if (err) return;
    setItems((prev) => prev.filter((it) => it.id !== item.id));
  };

  const visible = filterCat === "all" ? items : items.filter((it) => it.category === filterCat);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>المعدات</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>إدارة مخزون معدات الشركة</p>
        </div>
        <button className="btn btn-gold" onClick={openNew}>
          <Icon name="plus" size={16} /> إضافة معدة
        </button>
      </div>

      <div className="filter-pills-scroll" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={`chip ${filterCat === "all" ? "chip-gold" : ""}`} style={{ cursor: "pointer" }} onClick={() => setFilterCat("all")}>
          الكل ({items.length})
        </button>
        {EQUIPMENT_CATEGORIES.map((c) => {
          const count = items.filter((it) => it.category === c.value).length;
          if (count === 0) return null;
          return (
            <button key={c.value} className={`chip ${filterCat === c.value ? "chip-gold" : ""}`} style={{ cursor: "pointer" }} onClick={() => setFilterCat(c.value)}>
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state card">
          <Icon name="equipment" size={32} className="text-muted" />
          <p style={{ marginTop: 12 }}>لا توجد معدات بعد</p>
          <button className="btn btn-gold" style={{ marginTop: 14 }} onClick={openNew}>
            <Icon name="plus" size={16} /> إضافة أول معدة
          </button>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الفئة</th>
                <th>الكمية</th>
                <th>الحالة</th>
                <th>ملاحظات</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const st = equipmentStatusInfo(item.status);
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700 }}>{item.name}</td>
                    <td>{equipmentCategoryLabel(item.category)}</td>
                    <td>{item.quantity}</td>
                    <td>
                      <span className="chip" style={{ color: st.color, borderColor: st.color }}>{st.label}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)", maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.notes || "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn-ghost" onClick={() => openEdit(item)} style={{ padding: 6, cursor: "pointer", background: "none", border: "none", color: "var(--text-secondary)" }}>
                          <Icon name="edit" size={16} />
                        </button>
                        <button className="btn-ghost" onClick={() => remove(item)} style={{ padding: 6, cursor: "pointer", background: "none", border: "none", color: "#ef4444" }}>
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={form.id ? "تعديل معدة" : "إضافة معدة"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-gold" onClick={save} disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>إلغاء</button>
            </>
          }
        >
          {error && <div className="btn-danger" style={{ width: "100%", justifyContent: "center", marginBottom: 14, cursor: "default" }}>{error}</div>}
          <Field label="الاسم">
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: Sony FX3" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="الفئة">
              <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EQUIPMENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="الكمية">
              <input type="number" min={0} className="input-field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="الحالة">
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EquipmentStatus })}>
              {EQUIPMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="ملاحظات">
            <textarea className="input-field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ resize: "vertical" }} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
