"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import type { PresentationTexts } from "@/app/lib/types";

const SIMPLE_FIELDS: { key: keyof PresentationTexts; label: string; rows?: number }[] = [
  { key: "welcome_message", label: "رسالة ترحيبية", rows: 3 },
  { key: "project_message", label: "رسالة المشروع", rows: 3 },
  { key: "company_bio", label: "نبذة عن الشركة", rows: 4 },
  { key: "company_values", label: "قيم الشركة", rows: 3 },
  { key: "company_vision", label: "رؤية الشركة", rows: 3 },
  { key: "ceo_message", label: "كلمة المدير التنفيذي", rows: 3 },
  { key: "why_problem", label: "المشكلة", rows: 2 },
  { key: "why_opportunity", label: "الفرصة", rows: 2 },
  { key: "why_value", label: "الفائدة", rows: 2 },
  { key: "audience", label: "الجمهور المستهدف", rows: 3 },
  { key: "creative_idea", label: "الفكرة الإبداعية", rows: 3 },
  { key: "shooting_style", label: "أسلوب التصوير", rows: 2 },
  { key: "terms", label: "الشروط والأحكام", rows: 4 },
  { key: "thanks_message", label: "رسالة صفحة الشكر", rows: 2 },
];

export default function TextsPanel({ texts, onChange }: { texts: PresentationTexts; onChange: (t: PresentationTexts) => void }) {
  const [local, setLocal] = useState<PresentationTexts>(texts);

  function saveField<K extends keyof PresentationTexts>(key: K, value: PresentationTexts[K]) {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(next);
  }

  const objectives = local.objectives ?? [];
  const faq = local.faq ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
        كل النصوص هنا قابلة للتعديل بالكامل، وتُحفظ خاصة بهذا المشروع. النصوص العامة (نبذة الشركة/الرؤية/القيم) تُملأ
        تلقائياً من إعدادات الشركة الافتراضية عند إنشاء أول عرض، ويمكن تخصيصها هنا لكل مشروع على حدة.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {SIMPLE_FIELDS.map((f) => (
          <div key={f.key}>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{f.label}</label>
            <textarea
              className="input-field"
              rows={f.rows ?? 3}
              value={(local[f.key] as string) ?? ""}
              onChange={(e) => setLocal((prev) => ({ ...prev, [f.key]: e.target.value }))}
              onBlur={(e) => saveField(f.key, e.target.value as never)}
              style={{ resize: "vertical", fontSize: 13 }}
            />
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 700 }}>أهداف المشروع</label>
          <button className="btn-outline btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => saveField("objectives", [...objectives, ""])}>
            <Icon name="plus" size={13} /> هدف جديد
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {objectives.map((obj, i) => (
            <div key={i} style={{ display: "flex", gap: 6 }}>
              <input
                className="input-field"
                value={obj}
                onChange={(e) => {
                  const next = [...objectives];
                  next[i] = e.target.value;
                  setLocal((prev) => ({ ...prev, objectives: next }));
                }}
                onBlur={() => saveField("objectives", objectives)}
                style={{ fontSize: 13 }}
              />
              <button className="btn-ghost" style={{ padding: 8, borderRadius: 8, color: "#ef4444" }} onClick={() => saveField("objectives", objectives.filter((_, idx) => idx !== i))}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
          {objectives.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>لا توجد أهداف مضافة بعد.</p>}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 700 }}>الأسئلة الشائعة</label>
          <button className="btn-outline btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => saveField("faq", [...faq, { question: "", answer: "" }])}>
            <Icon name="plus" size={13} /> سؤال جديد
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {faq.map((item, i) => (
            <div key={i} className="card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="input-field"
                  placeholder="السؤال"
                  value={item.question}
                  onChange={(e) => {
                    const next = [...faq];
                    next[i] = { ...next[i], question: e.target.value };
                    setLocal((prev) => ({ ...prev, faq: next }));
                  }}
                  onBlur={() => saveField("faq", faq)}
                  style={{ fontSize: 13, fontWeight: 700 }}
                />
                <button className="btn-ghost" style={{ padding: 8, borderRadius: 8, color: "#ef4444" }} onClick={() => saveField("faq", faq.filter((_, idx) => idx !== i))}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
              <textarea
                className="input-field"
                placeholder="الإجابة"
                rows={2}
                value={item.answer}
                onChange={(e) => {
                  const next = [...faq];
                  next[i] = { ...next[i], answer: e.target.value };
                  setLocal((prev) => ({ ...prev, faq: next }));
                }}
                onBlur={() => saveField("faq", faq)}
                style={{ fontSize: 13, resize: "vertical" }}
              />
            </div>
          ))}
          {faq.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>لا توجد أسئلة مضافة بعد.</p>}
        </div>
      </div>
    </div>
  );
}
