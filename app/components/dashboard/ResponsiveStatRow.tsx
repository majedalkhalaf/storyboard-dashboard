"use client";

import { useIsMobile } from "@/app/lib/useIsMobile";
import StatCard from "@/app/components/dashboard/StatCard";
import type { IconName } from "@/app/components/ui/Icon";

export interface StatCardDef {
  key: string;
  label: string;
  value: string | number;
  icon: IconName;
  color: string;
}

// صفّ بطاقات إحصائية يتكيّف مع الجوال دون أي تعديل على سطح المكتب: شبكة
// كاملة كسابقاً على الشاشات الكبيرة، وشريط أفقي مضغوط بأحجام أصغر على
// الجوال بدل شبكة كبيرة تستهلك مساحة رأسية كبيرة. يُستخدم من داخل مكوّنات
// خادم (Server Components) عبر تمرير تعريفات البطاقات كبيانات قابلة
// للتسلسل، بلا حاجة لتحويل الصفحة كاملة إلى "use client".
export default function ResponsiveStatRow({ cards, minColWidth = 170 }: { cards: StatCardDef[]; minColWidth?: number }) {
  const isMobile = useIsMobile();

  return (
    <div
      className={isMobile ? "mobile-feed-scroll" : undefined}
      style={
        isMobile
          ? { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }
          : { display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth}px, 1fr))`, gap: 14 }
      }
    >
      {cards.map((c) => (
        <StatCard key={c.key} compact={isMobile} label={c.label} value={c.value} icon={c.icon} color={c.color} />
      ))}
    </div>
  );
}
