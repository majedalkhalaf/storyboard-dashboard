"use client";

import { useEffect } from "react";

// يحقن اللون الأساسي لشركة الإنتاج المالكة للمشروع كمتغير CSS ‎--gold‎
// فتتلوّن الأزرار والحدود وأشرطة التقدم بهوية تلك الشركة داخل صفحات المشروع.
// نستخدمه على صفحات /client/projects/** فقط (العميل غير مرتبط بشركة ثابتة).
export default function BrandingInjector({ color }: { color?: string | null }) {
  useEffect(() => {
    if (!color) return;
    const root = document.documentElement.style;
    root.setProperty("--gold", color);
    root.setProperty("--gold-light", color);
    root.setProperty("--gold-dark", color);
    return () => {
      root.removeProperty("--gold");
      root.removeProperty("--gold-light");
      root.removeProperty("--gold-dark");
    };
  }, [color]);

  return null;
}
