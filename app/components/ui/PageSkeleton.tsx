// هيكل تحميل عام لصفحات لوحة الفريق الداخلية — يظهر فوراً أثناء جلب البيانات
// بدل شاشة فارغة، بنفس أسلوب app/components/client/skeletons.tsx في بوابة
// العميل. صف بطاقات إحصائية اختياري أعلى الصفحة + عدد من صفوف/بطاقات المحتوى.
export function PageSkeleton({ statCount = 0, rows = 6 }: { statCount?: number; rows?: number }) {
  return (
    <div className="animate-fade-in">
      {statCount > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
          {Array.from({ length: statCount }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  );
}

export function GridPageSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 220, borderRadius: 14 }} />
      ))}
    </div>
  );
}
