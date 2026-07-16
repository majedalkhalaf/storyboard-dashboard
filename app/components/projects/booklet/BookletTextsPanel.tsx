"use client";

import { useState } from "react";
import type { BookletTexts } from "@/app/lib/types";

const SIMPLE_FIELDS: { key: keyof BookletTexts; label: string; rows?: number }[] = [
  { key: "handover_message", label: "رسالة التسليم", rows: 3 },
  { key: "achievements_summary", label: "ملخص الإنجازات", rows: 3 },
  { key: "closing_message", label: "الرسالة الختامية", rows: 2 },
  { key: "company_bio", label: "نبذة عن الشركة", rows: 4 },
  { key: "company_values", label: "قيم الشركة", rows: 3 },
  { key: "company_vision", label: "رؤية الشركة", rows: 3 },
  { key: "ceo_message", label: "كلمة المدير التنفيذي", rows: 3 },
];

export default function BookletTextsPanel({ texts, onChange }: { texts: BookletTexts; onChange: (t: BookletTexts) => void }) {
  const [local, setLocal] = useState<BookletTexts>(texts);

  function saveField<K extends keyof BookletTexts>(key: K, value: BookletTexts[K]) {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
        النصوص الرجعية (رسالة التسليم/ملخص الإنجازات/الختامية) تُملأ تلقائياً من إحصائيات المشروع الفعلية عند إنشاء أول
        كتيّب، ونصوص الشركة العامة تُملأ من إعدادات الشركة الافتراضية — كلاهما قابل للتعديل الكامل هنا.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {SIMPLE_FIELDS.map((f) => (
          <div key={f.key}>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{f.label}</label>
            <textarea
              className="input-field"
              rows={f.rows ?? 3}
              value={local[f.key] ?? ""}
              onChange={(e) => setLocal((prev) => ({ ...prev, [f.key]: e.target.value }))}
              onBlur={(e) => saveField(f.key, e.target.value)}
              style={{ resize: "vertical", fontSize: 13 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
