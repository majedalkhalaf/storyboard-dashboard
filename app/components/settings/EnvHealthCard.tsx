"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";

interface EnvCheckItem {
  key: string;
  label: string;
  ok: boolean;
  fixHint: string;
}

// بطاقة تشخيصية (قراءة فقط) لمتغيرات البيئة الحرجة — تعرض للمدير ما هو مضبوط
// فعلياً وما هو ناقص بدل ترك أخطاء غامضة تظهر لاحقاً عند إرسال دعوة أو بريد.
export default function EnvHealthCard() {
  const [items, setItems] = useState<EnvCheckItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/system/env-health");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "تعذّر فحص متغيرات البيئة");
        if (!cancelled) setItems(json.items ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "تعذّر فحص متغيرات البيئة");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h3 style={{ fontWeight: 700 }}>فحص متغيرات البيئة الحرجة</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          تشخيص سريع لما هو مضبوط فعلياً على الخادم المستضيف — قراءة فقط، لا يمكن لهذه الصفحة كتابة أي متغير بيئة تلقائياً
        </p>
      </div>

      {error && (
        <div className="btn-danger" style={{ width: "100%", justifyContent: "center", cursor: "default" }}>
          {error}
        </div>
      )}

      {items === null && !error ? (
        <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(items ?? []).map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: 10,
              }}
            >
              <span style={{ color: item.ok ? "var(--success)" : "#EF4444", display: "inline-flex", flexShrink: 0, marginTop: 1 }}>
                <Icon name={item.ok ? "checkCircle" : "alert"} size={18} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{item.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, fontFamily: "monospace" }}>{item.key}</div>
                {!item.ok && (
                  <div style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{item.fixHint}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
