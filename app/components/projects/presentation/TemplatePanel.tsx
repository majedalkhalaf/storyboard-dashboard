"use client";

import Icon from "@/app/components/ui/Icon";
import { PRESENTATION_THEME_LIST, buildBrandTheme } from "@/app/lib/presentation-themes";
import type { PresentationData } from "@/app/lib/presentation-sections";
import type { PresentationTemplate } from "@/app/lib/types";

export default function TemplatePanel({
  value,
  onChange,
  data,
}: {
  value: PresentationTemplate;
  onChange: (t: PresentationTemplate) => void;
  data: PresentationData;
}) {
  // قالب "هوية الشركة" يُحسَب فعلياً من ألوان الشركة الحقيقية بدل الاعتماد على
  // المدخل الثابت الافتراضي في PRESENTATION_THEME_LIST — كي تعكس بطاقة المعاينة
  // نفسها الألوان الفعلية المُعدَّة في إعدادات الشركة.
  const brandTheme = buildBrandTheme(data);
  const themeList = [brandTheme, ...PRESENTATION_THEME_LIST.filter((t) => t.key !== "brand")];

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        اختر القالب البصري — يُطبَّق فوراً على المعاينة والتصدير، ويمكنك تغييره في أي وقت لاحقاً. قالب
        &ldquo;هوية الشركة&rdquo; يطابق ألوان شركتك المُعدَّة في الإعدادات تلقائياً وبدقة كاملة.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {themeList.map((theme) => {
          const active = value === theme.key;
          return (
            <button
              key={theme.key}
              onClick={() => onChange(theme.key)}
              style={{
                border: `2px solid ${active ? "var(--gold)" : "var(--border)"}`,
                borderRadius: 14,
                overflow: "hidden",
                cursor: "pointer",
                background: "none",
                padding: 0,
                textAlign: "right",
              }}
            >
              <div style={{ height: 90, background: theme.bg, position: "relative", padding: 12, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ width: 26, height: 4, borderRadius: 2, background: theme.accent }} />
                <div>
                  <div style={{ width: "70%", height: 6, borderRadius: 3, background: theme.text, opacity: 0.9, marginBottom: 4 }} />
                  <div style={{ width: "45%", height: 4, borderRadius: 2, background: theme.muted }} />
                </div>
                {active && (
                  <span style={{ position: "absolute", top: 8, left: 8, color: theme.accent }}>
                    <Icon name="checkCircle" size={16} filled />
                  </span>
                )}
              </div>
              <div style={{ padding: "8px 10px", background: "var(--bg-card)" }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{theme.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
