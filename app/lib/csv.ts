// أداة تصدير CSV بسيطة بدون أي مكتبات خارجية.
// تُحوّل مصفوفة كائنات إلى ملف CSV وتُشغّل تحميله في المتصفح.

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // لو احتوى الحقل على فاصلة أو علامة اقتباس أو سطر جديد نضعه بين علامتي اقتباس
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * توليد نص CSV من صفوف الكائنات. الأعمدة تُستنتج من مفاتيح أول صف
 * أو يمكن تمريرها صراحةً مع تسميات عربية عبر `columns`.
 */
export function toCsv(
  rows: Record<string, unknown>[],
  columns?: { key: string; label: string }[]
): string {
  if (rows.length === 0 && !columns) return "";

  const cols =
    columns ??
    Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }));

  const header = cols.map((c) => escapeCsvValue(c.label)).join(",");
  const body = rows
    .map((row) => cols.map((c) => escapeCsvValue(row[c.key])).join(","))
    .join("\r\n");

  return `${header}\r\n${body}`;
}

/**
 * توليد CSV وتشغيل تحميله كملف. يضيف BOM لضمان ظهور العربية بشكل صحيح في Excel.
 */
export function downloadCsv(
  filename: string,
  rows: Record<string, unknown>[],
  columns?: { key: string; label: string }[]
): void {
  const csv = toCsv(rows, columns);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
