"use client";

import { useMemo, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { relativeTime } from "@/app/components/client/utils";
import type { ClientPermissions, Note, NoteTargetType } from "@/app/lib/types";

interface NotesThreadProps {
  companyId: string;
  projectId: string;
  episodeId: string | null;
  targetType: NoteTargetType;
  targetId: string;
  currentUserId: string;
  currentUserName: string | null;
  permissions: ClientPermissions;
  initialNotes: Note[];
}

export default function NotesThread({
  companyId,
  projectId,
  episodeId,
  targetType,
  targetId,
  currentUserId,
  currentUserName,
  permissions,
  initialNotes,
}: NotesThreadProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);

  const { roots, repliesByParent } = useMemo(() => {
    const roots = notes.filter((n) => !n.parent_note_id).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const repliesByParent: Record<string, Note[]> = {};
    for (const n of notes) {
      if (n.parent_note_id) {
        (repliesByParent[n.parent_note_id] ??= []).push(n);
      }
    }
    for (const key of Object.keys(repliesByParent)) {
      repliesByParent[key].sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
    return { roots, repliesByParent };
  }, [notes]);

  async function insertNote(text: string, parentNoteId: string | null) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .insert({
        company_id: companyId,
        project_id: projectId,
        episode_id: episodeId,
        target_type: targetType,
        target_id: targetId,
        parent_note_id: parentNoteId,
        author_id: currentUserId,
        author_role: "client",
        body: trimmed,
        status: "new",
        mentions: [],
        attachments: [],
      })
      .select("*")
      .single();
    setBusy(false);
    if (!error && data) {
      setNotes((prev) => [...prev, data as Note]);
      if (parentNoteId) {
        setReplyTo(null);
        setReplyBody("");
      } else {
        setBody("");
      }
    }
  }

  function NoteBubble({ note, isReply }: { note: Note; isReply?: boolean }) {
    const mine = note.author_id === currentUserId;
    const authorLabel = mine ? currentUserName || "أنت" : note.author_role === "client" ? "العميل" : "فريق الإنتاج";
    return (
      <div
        style={{
          background: mine ? "rgba(201,168,76,0.08)" : "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "10px 14px",
          marginInlineStart: isReply ? 24 : 0,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: mine ? "var(--gold)" : "var(--text-primary)" }}>{authorLabel}</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(note.created_at)}</span>
        </div>
        <p style={{ fontSize: 14, color: "var(--text-primary)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{note.body}</p>

        {!isReply && permissions.reply_notes && (
          <div style={{ marginTop: 6 }}>
            {replyTo === note.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <textarea
                  className="input-field"
                  rows={2}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="اكتب ردّك..."
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-gold" disabled={busy} onClick={() => insertNote(replyBody, note.id)} style={{ fontSize: 13 }}>
                    <Icon name="send" size={15} />
                    إرسال
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setReplyTo(null); setReplyBody(""); }} style={{ fontSize: 13 }}>
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ghost" onClick={() => { setReplyTo(note.id); setReplyBody(""); }} style={{ fontSize: 12, padding: "4px 8px" }}>
                <Icon name="message" size={13} />
                ردّ
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {permissions.add_notes && (
        <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            className="input-field"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="شاركنا ملاحظتك أو استفسارك..."
          />
          <div>
            <button className="btn btn-gold" disabled={busy || !body.trim()} onClick={() => insertNote(body, null)}>
              <Icon name="send" size={16} />
              إرسال الملاحظة
            </button>
          </div>
        </div>
      )}

      {roots.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}>
          <Icon name="message" size={30} className="nav-icon" />
          <p style={{ marginTop: 8, fontSize: 14 }}>لا توجد ملاحظات بعد.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {roots.map((root) => (
            <div key={root.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <NoteBubble note={root} />
              {(repliesByParent[root.id] ?? []).map((reply) => (
                <NoteBubble key={reply.id} note={reply} isReply />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
