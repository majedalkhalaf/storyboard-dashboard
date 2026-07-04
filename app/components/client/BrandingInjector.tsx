"use client";

import { useEffect } from "react";

// يحقن هوية شركة الإنتاج المالكة للمشروع كمتغيرات CSS داخل صفحات المشروع
// (العميل غير مرتبط بشركة ثابتة، فلا يمكن تطبيق الهوية على مستوى التخطيط
// العام). لون الأزرار (إن حُدِّد في إعدادات الشركة) يجب أن يطغى على اللون
// الأساسي تحديداً لأن كل الأزرار الحالية في الواجهة مبنية على ‎--gold‎ نفسه —
// وإلا فلا فرق مرئياً بينهما. لون التنبيهات يُحقن كمتغير ‎--alert‎ منفصل، لكن
// عناصر التنبيه/الخطأ في الواجهة حالياً تستخدم ألواناً ثابتة مباشرة في كل
// مكوّن (#EF4444 وغيره) لا هذا المتغير، فتأثيره حالياً جزئي فقط إلى أن يُستبدل
// ذلك التكرار بالمتغير في كل مكان — إفصاح صريح بدل الإدّعاء بتطبيق كامل.
export default function BrandingInjector({
  color,
  buttonColor,
  alertColor,
}: {
  color?: string | null;
  buttonColor?: string | null;
  alertColor?: string | null;
}) {
  useEffect(() => {
    const root = document.documentElement.style;
    const gold = buttonColor || color;
    if (gold) {
      root.setProperty("--gold", gold);
      root.setProperty("--gold-light", gold);
      root.setProperty("--gold-dark", gold);
    }
    if (alertColor) root.setProperty("--alert", alertColor);
    return () => {
      if (gold) {
        root.removeProperty("--gold");
        root.removeProperty("--gold-light");
        root.removeProperty("--gold-dark");
      }
      if (alertColor) root.removeProperty("--alert");
    };
  }, [color, buttonColor, alertColor]);

  return null;
}
