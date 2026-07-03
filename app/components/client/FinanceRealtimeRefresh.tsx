"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

// يعيد جلب صفحة "الحسابات" فوراً عند أي إضافة/تعديل على فواتير أو دفعات —
// بلا فلتر project_id لأن Realtime في Supabase لا يدعم "in" على عدة مشاريع
// دفعة واحدة؛ يكفي أن يكون التحديث "جرساً" يُعيد الجلب عبر الخادم، والخادم
// نفسه يطبّق RLS/صلاحيات العميل الحقيقية عند إعادة الجلب.
export default function FinanceRealtimeRefresh() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("client-finance")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router مستقر عبر عمر المكوّن
  }, []);

  return null;
}
