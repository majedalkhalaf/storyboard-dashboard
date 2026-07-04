"use client";

import { useMemo, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import EditRequestComposer from "@/app/components/client/EditRequestComposer";
import { sanitizeRichText } from "@/app/components/client/RichTextEditor";
import { createClient } from "@/app/lib/supabase/client";
import { relativeTime } from "@/app/components/client/utils";
import { canClient } from "@/app/lib/permissions";
import { NOTE_STATUSES, NOTE_REQUEST_TYPES, NOTE_PRIORITIES } from "@/app/lib/constants";
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

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// "طلبات التعديل" (سابقاً "الملاحظات") — مركز متكامل لإدارة الطلبات: تركيبة
// الطلب (نوع، أولوية، محتوى منسّق، مرفقات، لحظة زمنية) عبر EditRequestComposer،
// وسجل كامل بحالة كل طلب والردود المتبادلة بين العميل وفريق العمل.
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
  const [prevInitialNotes, setPrevInitialNotes] = useState(initialNotes);
  const [composerOpen, setComposerOpen] = useState(false);

  // يُزامن مع initialNotes عند أي تحديث خارجي (مثال: طلب تعديل أُرسل من زر
  // بطاقة/بطل الحلقة بدل النافذة هنا، أو تحديث حي عبر Realtime يستدعي
  // router.refresh) — بلا هذا المزامنة تبقى القائمة عالقة على النسخة الأولى.
  // نمط "تعديل الحالة أثناء الانبناء" الموصى به من React بدل useEffect (يتجنّب
  // إعادة انبناء إضافية غير ضرورية).
  if (initialNotes !== prevInitialNotes) {
    setPrevInitialNotes(initialNotes);
    setNotes(initialNotes);
  }
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);

  const canUploadAttachments = canClient(permissions, "upload_attachments");

  const { roots, repliesByParent } = useMemo(() => {
    const roots = notes.filter((n) => !n.parent_note_id).sort((a, b) => b.created_at.localeCompare(a.created_at));
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

  async function insertReply(text: string, parentNoteId: string) {
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
      setReplyTo(null);
      setReplyBody("");
    }
  }

  function RequestBubble({ note, isReply }: { note: Note; isReply?: boolean }) {
    const mine = note.author_id === currentUserId;
    const authorLabel = mine ? currentUserName || "أنت" : note.author_role === "client" ? "العميل" : "فريق الإنتاج";
    const statusMeta = NOTE_STATUSES.find((s) => s.value === note.status);
    const typeMeta = note.request_type ? NOTE_REQUEST_TYPES.find((t) => t.value === note.request_type) : null;
    const priorityMeta = !isReply ? NOTE_PRIORITIES.find((p) => p.value === note.priority) : null;

    return (
      <div
        style={{
          background: mine ? "rgba(var(--gold-rgb),0.08)" : "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "12px 14px",
          marginInlineStart: isReply ? 24 : 0,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: mine ? "var(--gold)" : "var(--text-primary)" }}>{authorLabel}</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(note.created_at)}</span>
        </div>

        {!isReply && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {statusMeta && (
              <span className="chip" style={{ color: statusMeta.color, borderColor: statusMeta.color, fontSize: 11 }}>
                {statusMeta.label}
              </span>
            )}
            {typeMeta && (
              <span className="chip" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name={typeMeta.icon} size={11} />
                {typeMeta.label}
              </span>
            )}
            {priorityMeta && (
              <span className="chip" style={{ color: priorityMeta.color, borderColor: priorityMeta.color, fontSize: 11 }}>
                {priorityMeta.label}
              </span>
            )}
            {note.video_timestamp_seconds != null && (
              <span className="chip" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="clock" size={11} />
                {formatTimestamp(note.video_timestamp_seconds)}
              </span>
            )}
          </div>
        )}

        {note.body_html ? (
          <div
            style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(note.body_html) }}
          />
        ) : (
          <p style={{ fontSize: 14, color: "var(--text-primary)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{note.body}</p>
        )}

        {note.attachments.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            {note.attachments.map((a, i) => (
              <a
                key={`${a.url}-${i}`}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, background: "var(--bg-hover)", padding: "6px 10px", borderRadius: 8, textDecoration: "none", color: "inherit" }}
              >
                <Icon name="attachment" size={14} className="nav-icon" />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                <Icon name="export" size={13} className="text-muted" />
              </a>
            ))}
          </div>
        )}

        {!isReply && permissions.reply_notes && (
          <div style={{ marginTop: 8 }}>
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
                  <button className="btn btn-gold" disabled={busy} onClick={() => insertReply(replyBody, note.id)} style={{ fontSize: 13 }}>
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
        <button className="btn btn-gold" onClick={() => setComposerOpen(true)} style={{ alignSelf: "flex-start" }}>
          <Icon name="edit" size={16} />
          طلب تعديل جديد
        </button>
      )}

      {composerOpen && (
        <EditRequestComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          companyId={companyId}
          projectId={projectId}
          episodeId={episodeId}
          targetType={targetType}
          targetId={targetId}
          currentUserId={currentUserId}
          canUploadAttachments={canUploadAttachments}
          onCreated={(note) => setNotes((prev) => [...prev, note])}
        />
      )}

      {roots.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}>
          <Icon name="edit" size={30} className="nav-icon" />
          <p style={{ marginTop: 8, fontSize: 14 }}>لا توجد طلبات تعديل بعد.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {roots.map((root) => (
            <div key={root.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <RequestBubble note={root} />
              {(repliesByParent[root.id] ?? []).map((reply) => (
                <RequestBubble key={reply.id} note={reply} isReply />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
