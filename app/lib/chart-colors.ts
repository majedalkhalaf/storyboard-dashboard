// لوحة ألوان تصنيفية للرسوم البيانية المالية — تم التحقق منها عبر أداة فحص الألوان
// (dataviz/scripts/validate_palette.js) على سطح الخلفية الداكن الفعلي لهذا النظام
// (#111111): كل الشرائح ضمن نطاق الإضاءة الصحيح، تفصل CVD جيدة بينها، وتباين واضح.
// ألوان الحالة (نجاح/تحذير/خطر) محجوزة تماماً ولا تُستخدم هنا كي لا تلتبس بمعنى
// "حالة" حين تظهر في سياق تصنيفي (توزيع مصروفات مثلاً).
export const CHART_CATEGORICAL_DARK = ["#3987e5", "#199e70", "#b8801f", "#6B7280"] as const;
export const CHART_CATEGORICAL_LIGHT = ["#2a78d6", "#1baf7a", "#9B6C23", "#94938c"] as const;

/** يُرجع لوناً تصنيفياً بالترتيب الثابت (لا يُعاد تدويره عشوائياً) — آخر شريحة محجوزة لـ"أخرى" */
export function categoricalColor(index: number, theme: "dark" | "light" = "dark"): string {
  const palette = theme === "dark" ? CHART_CATEGORICAL_DARK : CHART_CATEGORICAL_LIGHT;
  return palette[Math.min(index, palette.length - 1)];
}

// حالة مالية للمشروع (مشتقة، غير مخزَّنة) — ألوان الحالة الثابتة في النظام
export type FinancialHealth = "good" | "watch" | "overdue" | "completed";

export const FINANCIAL_HEALTH_META: Record<FinancialHealth, { label: string; color: string }> = {
  good: { label: "جيد", color: "#1DB954" },
  watch: { label: "تحت المتابعة", color: "#F59E0B" },
  overdue: { label: "متأخر", color: "#EF4444" },
  completed: { label: "مكتمل", color: "#3987e5" },
};

/** يشتق الحالة المالية لمشروع من نسبة تحصيله وحالته وتاريخ تسليمه — لا قيمة مخزَّنة، محسوبة دائماً لحظياً */
export function computeFinancialHealth(params: {
  collectionRate: number;
  hasOverdueInvoice: boolean;
  projectStatus: string;
}): FinancialHealth {
  if (params.projectStatus === "completed" || params.projectStatus === "delivered") return "completed";
  if (params.hasOverdueInvoice) return "overdue";
  if (params.collectionRate < 60) return "watch";
  return "good";
}
