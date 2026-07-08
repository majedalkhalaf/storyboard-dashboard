"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { projectHashtag } from "@/app/components/client/utils";
import { playNotificationSound } from "@/app/lib/notification-sound";
import { splitNotificationMessage } from "@/app/lib/notification-format";
import type { AppNotification } from "@/app/lib/types";

interface ClientNotification extends AppNotification {
  project: { name: string } | { name: string }[] | null;
}

function notificationProjectName(n: ClientNotification): string | null {
  const p = Array.isArray(n.project) ? n.project[0] : n.project;
  return p?.name ?? null;
}

// نسخة خاصة ببوابة العميل: تقرأ إشعارات المستخدم الحالي وتفتح روابط /client/**
// بدل روابط لوحة الفريق الداخلية. تدعم التحديث الحيّ عبر Realtime. كل إشعار
// يعرض وسم اسم المشروع (#اسم_المشروع) حتى يعرف العميل متعدد المشاريع مباشرة
// إلى أي مشروع ينتمي التحديث.
export default function ClientNotificationsBell() {
  const { userId } = useSession();
  const [items, setItems] = useState<ClientNotification[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const unread = items.filter((n) => !n.is_read).length;

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*, project:projects(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      setItems((data ?? []) as ClientNotification[]);
      // صوت تنبيه واحد فور الدخول إن وُجدت إشعارات سابقة لم تُقرأ بعد — بخلاف صوت
      // الإشعار الحي الجديد أدناه الذي يبقى مستقلاً عن هذا.
      if ((data ?? []).some((n) => !n.is_read)) playNotificationSound();
    }
    load();

    const channel = supabase
      .channel(`client-notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        async (payload) => {
          const inserted = payload.new as AppNotification;
          let project: ClientNotification["project"] = null;
          if (inserted.project_id) {
            const { data } = await supabase.from("projects").select("name").eq("id", inserted.project_id).maybeSingle();
            if (data) project = data;
          }
          setItems((prev) => [{ ...inserted, project }, ...prev]);
          playNotificationSound();
        }
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

  async function openNotification(n: ClientNotification) {
    setOpen(false);
    if (!n.is_read) {
      const supabase = createClient();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    if (n.type === "behind_scenes_post" || n.type === "client_announcement") {
      router.push("/client");
      return;
    }
    if (n.type === "progress_update" && n.project_id) {
      router.push(`/client/projects/${n.project_id}?tab=progress`);
      return;
    }
    if (n.project_id) {
      const base = n.episode_id
        ? `/client/projects/${n.project_id}/episodes/${n.episode_id}`
        : `/client/projects/${n.project_id}`;
      router.push(n.note_id ? `${base}?note=${n.note_id}` : base);
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
              items.map((n) => {
                const projectName = notificationProjectName(n);
                const { context, body } = splitNotificationMessage(n.message);
                return (
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
                    {projectName && <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700, marginBottom: 3 }}>{projectHashtag(projectName)}</div>}
                    {n.title && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{n.title}</div>}
                    {context && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{context}</div>}
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{body}</div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
