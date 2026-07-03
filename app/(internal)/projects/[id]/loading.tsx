// هيكل تحميل صفحة تفاصيل المشروع الداخلية — أثقل صفحة في التطبيق (رأس + إحصائيات
// + معرض حلقات)، وأكثرها ذُكِرت في شكوى بطء "الدخول إلى المشروع".
export default function Loading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ height: 140, borderRadius: 16, marginBottom: 20 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 240, borderRadius: 14 }} />
        ))}
      </div>
    </div>
  );
}
