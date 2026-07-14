import Icon from "@/app/components/ui/Icon";

// شريط تقدّم تنزيل موحّد لكل واجهات بوابة العميل (بطاقة الحلقة، صفحة تفاصيل
// الحلقة، مشغّل الفيديو) — يعرض نسبة الامتلاء بوضوح إلى جانب شريط مليء فعلياً
// (لا نص مضغوط داخل الزر كما كان سابقاً)، بتباين أعلى مع الخلفية الداكنة.
export default function DownloadProgressBar({ stage, percent }: { stage: string; percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <Icon name="archive" size={13} className="nav-icon" />
          {stage}
        </span>
        <span style={{ fontWeight: 800, color: "var(--gold)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{clamped}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 6, background: "rgba(255,255,255,0.09)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${clamped}%`,
            borderRadius: 6,
            background: "linear-gradient(90deg, var(--gold), #E8C067)",
            transition: "width 0.25s ease",
            boxShadow: clamped > 0 ? "0 0 8px rgba(var(--gold-rgb),0.55)" : "none",
          }}
        />
      </div>
    </div>
  );
}
