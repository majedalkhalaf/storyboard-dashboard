"use client";

import { useEffect } from "react";
import { useSession } from "@/app/providers/SessionProvider";

// يحقن ألوان هوية الشركة كمتغيرات CSS فتنعكس تلقائياً على كل الواجهة
// (الأزرار، الحدود، شريط التقدم...) بدون الحاجة لتعديل كل مكوّن يدوياً.
export default function BrandingProvider() {
  const { company } = useSession();

  useEffect(() => {
    const root = document.documentElement.style;
    if (company?.primary_color) {
      root.setProperty("--gold", company.primary_color);
      root.setProperty("--gold-light", company.primary_color);
      root.setProperty("--gold-dark", company.primary_color);
    }
    return () => {
      root.removeProperty("--gold");
      root.removeProperty("--gold-light");
      root.removeProperty("--gold-dark");
    };
  }, [company?.primary_color]);

  return null;
}
