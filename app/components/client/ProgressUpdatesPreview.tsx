"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import ProgressUpdateCard, { type ClientProgressUpdate } from "@/app/components/client/ProgressUpdateCard";
import { createClient } from "@/app/lib/supabase/client";

// يستمع لأي تحديث "عمل جارٍ" جديد مشترك عبر كل مشاريع العميل ويعيد جلب بيانات
// الصفحة الرئيسية — نفس نمط useBehindScenesRealtime (بلا فلترة على مستوى
// القناة لأن Realtime لا يدعم فلترة project_id ضمن قائمة).
function useProgressUpdatesRealtime() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("client-progress-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "progress_updates" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router مستقر عبر عمر المكوّن
  }, []);
}

export default function ProgressUpdatesPreview({ updates }: { updates: ClientProgressUpdate[] }) {
  useProgressUpdatesRealtime();
  if (updates.length === 0) return null;

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="barChart" size={17} className="nav-icon" />
          العمل الجاري
        </h2>
        <Link href="/client/progress" className="btn btn-outline" style={{ fontSize: 12.5 }}>
          عرض جميع الأعمال الجارية
        </Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {updates.map((u) => (
          <ProgressUpdateCard key={u.id} update={u} showProjectHashtag />
        ))}
      </div>
    </div>
  );
}
