"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { relativeTime } from "@/app/components/projects/utils";
import type { AppNotification } from "@/app/lib/types";

export default function NotificationsClient({
  userId,
  initialNotifications,
  pageSize,
}: {
  userId: string;
  initialNotifications: AppNotification[];
  pageSize: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>(initialNotifications);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialNotifications.length === pageSize);
  const [markingAll, setMarkingAll] = useState(false);

  const unread = items.filter((n) => !n.is_read).length;

  async function markAllRead() {
    setMarkingAll(true);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    setMarkingAll(false);
  }

  async function openNotification(n: AppNotification) {
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    if (n.project_id) {
      const base = n.episode_id ? `/projects/${n.project_id}/episodes/${n.episode_id}` : `/projects/${n.project_id}`;
      router.push(n.note_id ? `${base}?note=${n.note_id}` : base);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(items.length, items.length + pageSize - 1);
    const page = data ?? [];
    setItems((prev) => [...prev, ...page]);
    setHasMore(page.length === pageSize);
    setLoadingMore(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            الإشعارات
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {unread > 0 ? `${unread} إشعار غير مقروء` : "لا توجد إشعارات غير مقروءة"}
          </p>
        </div>
        {unread > 0 && (
          <button className="btn btn-outline" onClick={markAllRead} disabled={markingAll}>
            <Icon name="checkCircle" size={16} /> تحديد الكل كمقروء
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state card">
          <Icon name="bell" size={32} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد إشعارات</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => openNotification(n)}
              className="card"
              style={{
                display: "flex",
                width: "100%",
                gap: 12,
                alignItems: "flex-start",
                padding: 14,
                textAlign: "right",
                cursor: "pointer",
                fontFamily: "inherit",
                borderInlineStart: n.is_read ? "3px solid transparent" : "3px solid var(--gold)",
                background: n.is_read ? "var(--bg-card)" : "rgba(var(--gold-rgb), 0.06)",
              }}
            >
              <span
                style={{
                  color: "var(--gold)",
                  background: "rgba(var(--gold-rgb), 0.1)",
                  padding: 8,
                  borderRadius: 8,
                  flexShrink: 0,
                  display: "inline-flex",
                }}
              >
                <Icon name="bell" size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)" }}>{n.title ?? "إشعار"}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{relativeTime(n.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{n.message}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "جارٍ التحميل..." : "تحميل المزيد"}
          </button>
        </div>
      )}
    </div>
  );
}
