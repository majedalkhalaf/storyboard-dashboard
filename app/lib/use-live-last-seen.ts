"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

// يشترك في تحديثات client_sessions اللحظية (النبضة الدورية) لمجموعة من
// تسجيلات دخول العميل (client_user_id) المرتبطة بعميل واحد في CRM الفريق —
// يُستخدم لتحديث شارة "متصل الآن" فوراً بلا تحديث للصفحة.
export function useLiveLastSeen(companyId: string, clientUserIds: string[], initial: string | null): string | null {
  const [lastSeenAt, setLastSeenAt] = useState(initial);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- مزامنة القيمة الأولية القادمة من السيرفر عند تغيّرها بين عمليات الجلب، لا حلقة تصيير
    setLastSeenAt(initial);
  }, [initial]);

  useEffect(() => {
    if (clientUserIds.length === 0) return;
    const idSet = new Set(clientUserIds);
    const supabase = createClient();
    const channel = supabase
      .channel(`client-sessions-live:${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_sessions", filter: `company_id=eq.${companyId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { client_user_id?: string; last_seen_at?: string } | null;
          if (!row?.client_user_id || !idSet.has(row.client_user_id) || !row.last_seen_at) return;
          setLastSeenAt((prev) => (!prev || row.last_seen_at! > prev ? row.last_seen_at! : prev));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clientUserIds مقارنة بمحتواها عبر join أدناه لتفادي إعادة الاشتراك عند كل إعادة رندر
  }, [companyId, clientUserIds.join(",")]);

  return lastSeenAt;
}
