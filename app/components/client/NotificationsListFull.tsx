"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { relativeTime } from "@/app/components/client/utils";
import type { AppNotification } from "@/app/lib/types";

const PAGE_SIZE = 20;

// نسخة الصفحة الكاملة من قائمة الإشعارات (بخلاف الجرس المختصر) — تدعم التحميل
// التدريجي والتحديث الحي عبر Realtime وتعليم إشعار واحد/الكل كمقروء.
export default function NotificationsListFull({ userId }: { userId: string }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);
      const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(PAGE_SIZE);
      setItems(data ?? []);
      setHasMore((data ?? []).length === PAGE_SIZE);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`client-notifications-page:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) =>
        setItems((prev) => [payload.new as AppNotification, ...prev])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadMore() {
    if (loadingMore || !hasMore || items.length === 0) return;
    setLoadingMore(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .lt("created_at", items[items.length - 1].created_at)
      .limit(PAGE_SIZE);
    setItems((prev) => [...prev, ...(data ?? [])]);
    setHasMore((data ?? []).length === PAGE_SIZE);
    setLoadingMore(false);
  }

  async function markAllRead() {
    const supabase = createClient();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  }

  async function openNotification(n: AppNotification) {
    if (!n.is_read) {
      const supabase = createClient();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    if (n.project_id) {
      router.push(n.episode_id ? `/client/projects/${n.project_id}/episodes/${n.episode_id}` : `/client/projects/${n.project_id}`);
    }
  }

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>كل الإشعارات {unread > 0 ? `(${unread} غير مقروءة)` : ""}</span>
        {unread > 0 && (
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={markAllRead}>
            تعليم الكل كمقروء
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty-state" style={{ padding: 30 }}>
          جارٍ التحميل...
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}>
          <Icon name="bell" size={30} className="nav-icon" />
          <p style={{ marginTop: 10 }}>لا توجد إشعارات بعد</p>
        </div>
      ) : (
        <>
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => openNotification(n)}
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
                textAlign: "right",
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                background: n.is_read ? "transparent" : "rgba(var(--gold-rgb),0.06)",
                border: "none",
                cursor: "pointer",
                color: "var(--text-primary)",
              }}
            >
              <span style={{ color: "var(--gold)", background: "rgba(var(--gold-rgb),0.12)", borderRadius: 8, padding: 7, display: "inline-flex", flexShrink: 0, height: "fit-content" }}>
                <Icon name="bell" size={14} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                {n.title && <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{n.title}</div>}
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{n.message}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{relativeTime(n.created_at)}</div>
              </div>
              {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", flexShrink: 0, marginTop: 6 }} />}
            </button>
          ))}
          {hasMore && (
            <div style={{ padding: 14, textAlign: "center" }}>
              <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "جارٍ التحميل..." : "تحميل المزيد"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
