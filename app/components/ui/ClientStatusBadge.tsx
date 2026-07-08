"use client";

import { useEffect, useState } from "react";
import { computeClientStatus } from "@/app/lib/client-status";

// شارة حالة اتصال العميل — تُعيد حساب النص كل 30 ثانية محلياً (بلا طلب
// شبكة إضافي) كي تبقى عبارات مثل "قبل 3 دقائق" محدَّثة حتى بلا حدث جديد.
export default function ClientStatusBadge({ lastSeenAt, compact = false }: { lastSeenAt: string | null; compact?: boolean }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const status = computeClientStatus(lastSeenAt);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: compact ? 11 : 12,
        fontWeight: 700,
        color: status.color,
        background: `${status.color}1a`,
        padding: compact ? "2px 8px" : "4px 10px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden>{status.dot}</span>
      {status.label}
    </span>
  );
}
