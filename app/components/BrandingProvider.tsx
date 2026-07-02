"use client";

import { useEffect } from "react";
import { useSession } from "@/app/providers/SessionProvider";
import { hexToRgb, lighten, darken } from "@/app/lib/color-utils";

// يحقن ألوان هوية الشركة كمتغيرات CSS فتنعكس تلقائياً على كل الواجهة
// (الأزرار، الحدود، شريط التقدم...) بدون الحاجة لتعديل كل مكوّن يدوياً.
export default function BrandingProvider() {
  const { company } = useSession();

  useEffect(() => {
    const root = document.documentElement.style;
    if (company?.primary_color) {
      const { r, g, b } = hexToRgb(company.primary_color);
      root.setProperty("--gold", company.primary_color);
      root.setProperty("--gold-light", lighten(company.primary_color, 0.25));
      root.setProperty("--gold-dark", darken(company.primary_color, 0.3));
      root.setProperty("--gold-rgb", `${r}, ${g}, ${b}`);
    }
    return () => {
      root.removeProperty("--gold");
      root.removeProperty("--gold-light");
      root.removeProperty("--gold-dark");
      root.removeProperty("--gold-rgb");
    };
  }, [company?.primary_color]);

  return null;
}
