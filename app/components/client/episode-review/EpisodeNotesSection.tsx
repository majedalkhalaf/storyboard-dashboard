"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import NotesThread from "@/app/components/client/NotesThread";
import { createClient } from "@/app/lib/supabase/client";
import type { ClientPermissions, Note } from "@/app/lib/types";

const OPEN_STATUSES = new Set(["new", "in_review", "in_progress"]);

// يجلب ملاحظات الحلقة من المتصفح بعد الرسم الأول (Lazy) بدل حجب الصفحة كاملةً
// بانتظارها من الخادم، ويشترك في تحديثات هذا الجدول تحديداً لهذه الحلقة فقط —
// أي تغيير (ملاحظة جديدة/رد/تغيير حالة) يُحدِّث القائمة المحلية مباشرة بلا أي
// إعادة تحميل لباقي الصفحة.
export default function EpisodeNotesSection({
  companyId,
  projectId,
  episodeId,
  currentUserId,
  currentUserName,
  permissions,
  highlightNoteId,
}: {
  companyId: string;
  projectId: string;
  episodeId: string;
  currentUserId: string;
  currentUserName: string | null;
  permissions: ClientPermissions;
  highlightNoteId?: string | null;
}) {
  const [notes, setNotes] = useState<Note[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const { data } = await supabase.from("notes").select("*").eq("episode_id", episodeId).order("created_at", { ascending: true });
      if (!cancelled) setNotes((data ?? []) as Note[]);
    }
    load();

    const channel = supabase
      .channel(`client-episode-notes:${episodeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `episode_id=eq.${episodeId}` }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [episodeId]);

  const openCount = notes ? notes.filter((n) => !n.parent_note_id && OPEN_STATUSES.has(n.status)).length : 0;

  return (
    <div id="episode-notes-section" className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="edit" size={16} className="nav-icon" /> الملاحظات والمراجعة
        </h2>
        {notes && (
          <span className="chip" style={{ fontSize: 11 }}>
            {openCount} مفتوحة
          </span>
        )}
      </div>

      {!notes ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="skeleton" style={{ height: 56, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 56, borderRadius: 10 }} />
        </div>
      ) : (
        <NotesThread
          companyId={companyId}
          projectId={projectId}
          episodeId={episodeId}
          targetType="episode"
          targetId={episodeId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          permissions={permissions}
          initialNotes={notes}
          highlightNoteId={highlightNoteId}
        />
      )}
    </div>
  );
}
