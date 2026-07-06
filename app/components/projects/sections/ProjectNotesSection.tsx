"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { NOTE_STATUSES } from "@/app/lib/constants";
import { useScrollHighlight } from "@/app/lib/use-scroll-highlight";
import { relativeTime } from "../utils";
import type { Note } from "@/app/lib/types";

interface ProjectNoteRow extends Note {
  author_name: string | null;
}

// ملاحظات على مستوى المشروع فقط (episode_id = null) — ملاحظات الحلقات معروضة
// بالفعل داخل تبويب "الملاحظات" الخاص بكل حلقة، فلا داعي لتكرارها هنا.
export default function ProjectNotesSection({ projectId, highlightNoteId }: { projectId: string; highlightNoteId?: string | null }) {
  const highlightedId = useScrollHighlight(highlightNoteId, "note");
  const [notes, setNotes] = useState<ProjectNoteRow[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notes")
      .select("*, author:profiles!author_id(full_name)")
      .eq("project_id", projectId)
      .is("episode_id", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
        const rows = ((data ?? []) as Record<string, unknown>[]).map((n) => ({
          ...(n as unknown as Note),
          author_name: one<{ full_name: string | null }>(n.author as never)?.full_name ?? null,
        }));
        setNotes(rows);
      });
  }, [projectId]);

  if (!notes) {
    return <div className="skeleton" style={{ height: 90, borderRadius: 10 }} />;
  }

  if (notes.length === 0) {
    return <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا توجد ملاحظات على مستوى المشروع</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {notes.map((n) => {
        const info = NOTE_STATUSES.find((s) => s.value === n.status);
        return (
          <div
            key={n.id}
            id={`note-${n.id}`}
            style={{
              display: "flex",
              gap: 10,
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
              transition: "box-shadow .3s",
              boxShadow: highlightedId === n.id ? "inset 0 0 0 2px var(--gold)" : undefined,
              borderRadius: highlightedId === n.id ? 8 : undefined,
            }}
          >
            <span style={{ marginTop: 2 }}>
              <Icon name="message" size={15} className="text-muted" />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{n.author_name ?? "مستخدم"}</span>
                <span className="chip" style={{ fontSize: 10, color: info?.color, borderColor: info?.color, flexShrink: 0 }}>
                  {info?.label ?? n.status}
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 3, whiteSpace: "pre-wrap" }}>{n.body}</p>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 3 }}>{relativeTime(n.created_at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
