interface ServiceUsage {
  label: string;
  count: number;
}

export default function TopServicesBars({ services }: { services: ServiceUsage[] }) {
  const max = Math.max(1, ...services.map((s) => s.count));

  if (services.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا توجد خدمات مضافة بعد</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {services.map((s) => {
        const pct = Math.round((s.count / max) * 100);
        return (
          <div key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span>{s.label}</span>
              <span style={{ fontWeight: 700 }}>{pct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
