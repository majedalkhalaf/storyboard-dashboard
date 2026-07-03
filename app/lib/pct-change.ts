// دالة صغيرة بلا أي اعتمادية خادمية (لا تستورد supabase/server) — مستقلة عمداً حتى
// تبقى قابلة للاستيراد من مكوّنات "use client" (مثل FinanceKpiCard) دون سحب next/headers
// إلى حزمة المتصفح.
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
