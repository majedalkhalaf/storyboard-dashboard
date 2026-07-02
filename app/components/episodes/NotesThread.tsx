"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { NOTE_STATUSES } from "@/app/lib/constants";
import type { Note, NoteStatus } from "@/app/lib/types";
import { relativeTime } from "@/app/components/projects/utils";

interface NoteRow extends Note {
  author_name: string | null;
}

export default function NotesThread({ projectId, episodeId }: { projectId: string; episodeId: string }) {
  const supabase = createClient();
  const { userId, company, profile } = useSession();
  const companyId = company!.id;

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("episode_id", episodeId)
      .eq("target_type", "episode")
      .order("created_at", { ascending: true });
    const rows = (data as Note[]) ?? [];
    const authorIds = Array.from(new Set(rows.map((n) => n.author_id)));
    const names: Record<string, string> = {};
    if (authorIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
      for (const p of profs ?? []) names[p.id] = p.full_name ?? "";
    }
    setNotes(rows.map((n) => ({ ...n, author_name: names[n.author_id] || null })));
    setLoading(false);
  }, [supabase, episodeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل أولي عند التركيب، النمط القياسي لجلب البيانات
    load();
  }, [load]);

  async function post(text: string, parentId: string | null) {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await supabase.from("notes").insert({
        company_id: companyId,
        project_id: projectId,
        episode_id: episodeId,
        target_type: "episode",
        parent_note_id: parentId,
        author_id: userId,
        author_role: profile.role,
        body: text.trim(),
        status: "new",
      });
      await logActivity(supabase, { companyId, projectId, episodeId, action: "note_added", details: {} });
      if (parentId) {
        setReplyBody("");
        setReplyTo(null);
      } else {
        setBody("");
      }
      await load();
    } finally {
      setPosting(false);
    }
  }

  async function changeStatus(note: NoteRow, status: NoteStatus) {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, status } : n)));
    await supabase.from("notes").update({ status }).eq("id", note.id);
  }

  async function remove(note: NoteRow) {
    if (!confirm("حذف الملاحظة؟")) return;
    await supabase.from("notes").delete().eq("id", note.id);
    await load();
  }

  const topLevel = notes.filter((n) => !n.parent_note_id);
  const repliesOf = (id: string) => notes.filter((n) => n.parent_note_id === id);

  function NoteBlock({ note, isReply }: { note: NoteRow; isReply?: boolean }) {
    const status = NOTE_STATUSES.find((s) => s.value === note.status);
    const own = note.author_id === userId;
    return (
      <div className="card" style={{ padding: 14, marginInlineStart: isReply ? 28 : 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{note.author_name || "مستخدم"}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(note.created_at)}</span>
          </div>
          {status &&
            (own ? (
              <select
                value={note.status}
                onChange={(e) => changeStatus(note, e.target.value as NoteStatus)}
                className="input-field"
                style={{ width: "auto", padding: "3px 8px", fontSize: 11, color: status.color, fontWeight: 700 }}
              >
                {NOTE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="chip" style={{ color: status.color, borderColor: status.color }}>
                {status.label}
              </span>
            ))}
        </div>
        <p style={{ fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{note.body}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {!isReply && (
            <button
              className="btn-ghost"
              style={{ padding: "4px 8px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
              onClick={() => setReplyTo(replyTo === note.id ? null : note.id)}
            >
              <Icon name="message" size={13} /> رد
            </button>
          )}
          {own && (
            <button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 12, color: "#ef4444" }} onClick={() => remove(note)}>
              <Icon name="trash" size={13} /> حذف
            </button>
          )}
        </div>

        {replyTo === note.id && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              className="input-field"
              placeholder="اكتب رداً..."
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && post(replyBody, note.id)}
              autoFocus
            />
            <button className="btn btn-gold" disabled={posting} onClick={() => post(replyBody, note.id)} style={{ flexShrink: 0 }}>
              <Icon name="send" size={15} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* new note */}
      <div className="card" style={{ padding: 14 }}>
        <textarea
          className="input-field"
          rows={3}
          placeholder="أضف ملاحظة جديدة..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ resize: "vertical" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button className="btn btn-gold" disabled={posting || !body.trim()} onClick={() => post(body, null)}>
            <Icon name="send" size={15} /> إضافة ملاحظة
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">جارٍ التحميل...</div>
      ) : topLevel.length === 0 ? (
        <div className="empty-state card">
          <Icon name="message" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد ملاحظات بعد</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {topLevel.map((note) => (
            <div key={note.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <NoteBlock note={note} />
              {repliesOf(note.id).map((r) => (
                <NoteBlock key={r.id} note={r} isReply />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
