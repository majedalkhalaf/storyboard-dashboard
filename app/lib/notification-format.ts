// إشعارات الملاحظات/الردود مُخزَّنة بصيغة "سياق مختصر\nنص الملاحظة" — هذه
// الدالة تفصل السطر الأول (سياق ثانوي كالحلقة) عن نص الملاحظة الفعلي، حتى
// تُبرِزه الواجهة بخط أوضح/لون مختلف بدل عرض كل شيء بنفس الوزن البصري.
export function splitNotificationMessage(message: string): { context: string | null; body: string } {
  const idx = message.indexOf("\n");
  if (idx === -1) return { context: null, body: message };
  return { context: message.slice(0, idx) || null, body: message.slice(idx + 1) };
}
