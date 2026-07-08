export interface ClientStatusInfo {
  label: string;
  color: string;
  dot: string;
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// يُشتق من آخر نبضة (last_seen_at) في جلسات بوابة العميل — خمس درجات حسب
// طلب صريح: 🟢 متصل الآن، 🟡 نشط مؤخراً، 🟠 آخر نشاط اليوم، ⚪ خلال الأسبوع،
// 🔴 غير نشط منذ أسبوع فأكثر (أو لم يدخل قط).
export function computeClientStatus(lastSeenAt: string | null | undefined): ClientStatusInfo {
  if (!lastSeenAt) return { label: "لم يسجّل الدخول بعد", color: "#6B7280", dot: "⚪" };
  const then = new Date(lastSeenAt).getTime();
  if (Number.isNaN(then)) return { label: "غير معروف", color: "#6B7280", dot: "⚪" };
  const diff = Date.now() - then;

  if (diff <= 2 * MIN) return { label: "متصل الآن", color: "#22C55E", dot: "🟢" };
  if (diff <= 30 * MIN) return { label: `نشط قبل ${Math.max(1, Math.round(diff / MIN))} دقيقة`, color: "#EAB308", dot: "🟡" };
  if (diff <= DAY) return { label: `آخر نشاط قبل ${Math.max(1, Math.round(diff / HOUR))} ساعة`, color: "#F97316", dot: "🟠" };
  if (diff <= 7 * DAY) {
    const days = Math.round(diff / DAY);
    return { label: days <= 1 ? "آخر نشاط أمس" : `آخر نشاط قبل ${days} يوم`, color: "#9CA3AF", dot: "⚪" };
  }
  const weeks = Math.max(1, Math.round(diff / (7 * DAY)));
  return { label: `غير نشط منذ ${weeks} أسبوع`, color: "#EF4444", dot: "🔴" };
}
