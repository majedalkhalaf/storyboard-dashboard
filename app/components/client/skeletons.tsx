// عناصر هيكلية (Skeleton) مشتركة لصفحات بوابة العميل — تُستخدم داخل ملفات
// loading.tsx (حدود Suspense التلقائية لكل مسار في Next.js) بحيث تظهر فوراً
// عند التنقل بدل شاشة فارغة، وتُستبدل تلقائياً بالمحتوى الحقيقي بمجرد جهوزه.

export function TitleSkeleton() {
  return <div className="skeleton" style={{ height: 26, width: 220, borderRadius: 8, marginBottom: 16 }} />;
}

export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(170px, 1fr))`, gap: 14, marginBottom: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 92, borderRadius: 14 }} />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6, height = 260 }: { count?: number; height?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, borderRadius: 14 }} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5, height = 64 }: { count?: number; height?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, borderRadius: 12 }} />
      ))}
    </div>
  );
}

export function ClientPageSkeleton({ statCount = 0, cards = 6 }: { statCount?: number; cards?: number }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <TitleSkeleton />
      {statCount > 0 && <StatRowSkeleton count={statCount} />}
      <CardGridSkeleton count={cards} />
    </div>
  );
}

export function ProjectHeroSkeleton() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div className="skeleton" style={{ height: 32, width: 140, borderRadius: 8, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 220, borderRadius: 16, marginBottom: 18 }} />
      <StatRowSkeleton count={4} />
      <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr", gap: 20 }}>
        <div className="skeleton" style={{ height: 420, borderRadius: 14 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="skeleton" style={{ height: 160, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 160, borderRadius: 14 }} />
        </div>
      </div>
    </div>
  );
}

export function EpisodeHeroSkeleton() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div className="skeleton" style={{ height: 32, width: 140, borderRadius: 8, marginBottom: 12 }} />
      <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="skeleton" style={{ height: 260, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 360, borderRadius: 14 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
        </div>
      </div>
    </div>
  );
}
