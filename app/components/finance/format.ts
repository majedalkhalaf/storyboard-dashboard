// أدوات تنسيق مشتركة لأقسام المالية والفواتير والعقود والعروض.

export function fmtMoney(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ر.س`;
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB"); // dd/mm/yyyy — مقروء ومحايد
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
