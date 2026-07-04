"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { relativeTime, projectHashtag } from "@/app/components/client/utils";
import { playNotificationSound } from "@/app/lib/notification-sound";
import type { AppNotification } from "@/app/lib/types";

const PAGE_SIZE = 30;

interface ClientNotification extends AppNotification {
  project: { name: string } | { name: string }[] | null;
}

function notificationProjectName(n: ClientNotification): string | null {
  const p = Array.isArray(n.project) ? n.project[0] : n.project;
  return p?.name ?? null;
}

// نسخة الصفحة الكاملة من قائمة الإشعارات — تدعم التحميل التدريجي، التحديث
// الحي عبر Realtime، تعليم إشعار واحد/الكل كمقروء، والتصفية/البحث حسب
// المشروع (كل إشعار يعرض وسم اسم مشروعه) لتسهيل المتابعة متعددة المشاريع.
export default function NotificationsListFull({ userId, projects }: { userId: string; projects: { id: string; name: string }[] }) {
  const [items, setItems] = useState<ClientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [projectFilter, setProjectFilter] = useState("all");
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("notifications")
        .select("*, project:projects(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      setItems((data ?? []) as ClientNotification[]);
      setHasMore((data ?? []).length === PAGE_SIZE);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`client-notifications-page:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, async (payload) => {
        const inserted = payload.new as AppNotification;
        let project: ClientNotification["project"] = null;
        if (inserted.project_id) {
          const { data } = await supabase.from("projects").select("name").eq("id", inserted.project_id).maybeSingle();
          if (data) project = data;
        }
        setItems((prev) => [{ ...inserted, project }, ...prev]);
        playNotificationSound();
      })
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
      .select("*, project:projects(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .lt("created_at", items[items.length - 1].created_at)
      .limit(PAGE_SIZE);
    setItems((prev) => [...prev, ...((data ?? []) as ClientNotification[])]);
    setHasMore((data ?? []).length === PAGE_SIZE);
    setLoadingMore(false);
  }

  async function markAllRead() {
    const supabase = createClient();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  }

  async function openNotification(n: ClientNotification) {
    if (!n.is_read) {
      const supabase = createClient();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    if (n.type === "behind_scenes_post") {
      router.push("/client");
      return;
    }
    if (n.type === "progress_update" && n.project_id) {
      router.push(`/client/projects/${n.project_id}?tab=progress`);
      return;
    }
    if (n.project_id) {
      router.push(n.episode_id ? `/client/projects/${n.project_id}/episodes/${n.episode_id}` : `/client/projects/${n.project_id}`);
    }
  }

  const filtered = items.filter((n) => {
    if (projectFilter !== "all" && n.project_id !== projectFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const projectName = (notificationProjectName(n) || "").toLowerCase();
    return (n.title || "").toLowerCase().includes(q) || n.message.toLowerCase().includes(q) || projectName.includes(q);
  });

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {projects.length > 1 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <input className="input-field" placeholder="بحث عن مشروع أو نص الإشعار..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingInlineStart: 34 }} />
            <span style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
              <Icon name="search" size={15} />
            </span>
          </div>
          <select className="input-field" style={{ width: "auto" }} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">كل المشاريع</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <Icon name="bell" size={30} className="nav-icon" />
            <p style={{ marginTop: 10 }}>{items.length === 0 ? "لا توجد إشعارات بعد" : "لا توجد إشعارات مطابقة"}</p>
          </div>
        ) : (
          <>
            {filtered.map((n) => {
              const projectName = notificationProjectName(n);
              return (
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
                    {projectName && <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700, marginBottom: 3 }}>{projectHashtag(projectName)}</div>}
                    {n.title && <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{n.title}</div>}
                    <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{relativeTime(n.created_at)}</div>
                  </div>
                  {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", flexShrink: 0, marginTop: 6 }} />}
                </button>
              );
            })}
            {hasMore && projectFilter === "all" && !query && (
              <div style={{ padding: 14, textAlign: "center" }}>
                <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "جارٍ التحميل..." : "تحميل المزيد"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
