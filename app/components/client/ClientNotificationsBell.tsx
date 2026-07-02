"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import type { AppNotification } from "@/app/lib/types";

// نسخة خاصة ببوابة العميل: تقرأ إشعارات المستخدم الحالي وتفتح روابط /client/**
// بدل روابط لوحة الفريق الداخلية. تدعم التحديث الحيّ عبر Realtime.
export default function ClientNotificationsBell() {
  const { userId } = useSession();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const unread = items.filter((n) => !n.is_read).length;

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      setItems(data ?? []);
    }
    load();

    const channel = supabase
      .channel(`client-notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new as AppNotification, ...prev])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markAllRead() {
    const supabase = createClient();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  }

  async function openNotification(n: AppNotification) {
    setOpen(false);
    if (!n.is_read) {
      const supabase = createClient();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    if (n.project_id) {
      router.push(
        n.episode_id
          ? `/client/projects/${n.project_id}/episodes/${n.episode_id}`
          : `/client/projects/${n.project_id}`
      );
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button className="btn btn-ghost" onClick={() => setOpen((v) => !v)} style={{ position: "relative" }} aria-label="الإشعارات">
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              left: 2,
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div
            className="card animate-fade-in"
            style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: 320, maxWidth: "90vw", maxHeight: 420, overflowY: "auto", zIndex: 100, padding: 0 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>الإشعارات</span>
              {unread > 0 && (
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={markAllRead}>
                  تعليم الكل كمقروء
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                لا توجد إشعارات بعد
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "right",
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border)",
                    background: n.is_read ? "transparent" : "rgba(var(--gold-rgb),0.06)",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                  }}
                >
                  {n.title && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{n.title}</div>}
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{n.message}</div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
