"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";

// مكوّن عرض/رد مشترك على تعليقات الفيديو — يُستخدم في مشغّل الفيديو الداخلي
// (VideoTab.tsx) وبوابة العميل (ClientVideoPlayer.tsx) بنفس الشكل تماماً، بطلب
// صريح لتحويل تعليقات الفيديو من قائمة تعليقات منفصلة إلى محادثة متكاملة بين
// العميل وفريق العمل (أسلوب فقاعات واتساب): كل تعليق أساسي على الفيديو هو بداية
// "خيط" محادثة، وردوده تُبنى تحته بفقاعات، رسائل المستخدم الحالي على يمين
// الصفحة (لون ذهبي) وباقي الرسائل على يسارها (لون محايد) — بلا أي تغيير على
// نموذج قاعدة البيانات، الردود ببساطة صفوف notes جديدة بـ parent_note_id يشير
// لتعليق الفيديو الأساسي (نفس آلية الردود على الملاحظات العادية في NotesTab).
export interface VideoCommentLike {
  id: string;
  parent_note_id: string | null;
  author_id: string;
  author_role: string | null;
  body: string;
  created_at: string;
  video_timestamp_seconds: number | null;
}

export default function VideoCommentThread<T extends VideoCommentLike>({
  comments,
  currentUserId,
  activeRootId,
  onSelectRoot,
  onReply,
  authorLabel,
  formatDuration,
  relativeTime,
  canReply = true,
}: {
  comments: T[];
  currentUserId: string;
  activeRootId?: string | null;
  /** يُستدعى عند الضغط على فقاعة التعليق الأساسي — للانتقال للحظة الفيديو المقابلة. */
  onSelectRoot?: (comment: T) => void;
  onReply: (rootId: string, body: string) => Promise<void>;
  authorLabel: (comment: T) => string;
  formatDuration: (seconds: number | null) => string;
  relativeTime: (iso: string) => string;
  canReply?: boolean;
}) {
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  const roots = comments
    .filter((c) => !c.parent_note_id)
    .slice()
    .sort((a, b) => (a.video_timestamp_seconds ?? 0) - (b.video_timestamp_seconds ?? 0));

  function repliesOf(rootId: string): T[] {
    return comments
      .filter((c) => c.parent_note_id === rootId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async function submitReply(rootId: string) {
    const body = replyText.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      await onReply(rootId, body);
      setReplyText("");
      setReplyOpenId(null);
    } finally {
      setPosting(false);
    }
  }

  function Bubble({ comment, showTimestamp }: { comment: T; showTimestamp?: boolean }) {
    const own = comment.author_id === currentUserId;
    return (
      <div style={{ display: "flex", justifyContent: own ? "flex-start" : "flex-end", marginBottom: 6 }}>
        <div
          style={{
            maxWidth: "82%",
            background: own ? "var(--gold)" : "var(--bg-hover)",
            color: own ? "#0A0A0B" : "var(--text-primary)",
            borderRadius: 12,
            padding: "7px 11px",
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.75, marginBottom: 2, display: "flex", gap: 6 }}>
            <span>{authorLabel(comment)}</span>
            {showTimestamp && comment.video_timestamp_seconds != null && <span>· {formatDuration(comment.video_timestamp_seconds)}</span>}
          </div>
          <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{comment.body}</div>
          <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3 }}>{relativeTime(comment.created_at)}</div>
        </div>
      </div>
    );
  }

  if (roots.length === 0) {
    return <p style={{ fontSize: 12, color: "var(--text-muted)" }}>لا توجد تعليقات على الفيديو بعد</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {roots.map((root) => {
        const replies = repliesOf(root.id);
        const isReplyOpen = replyOpenId === root.id;
        return (
          <div
            key={root.id}
            className="card"
            style={{
              padding: 10,
              cursor: onSelectRoot ? "pointer" : undefined,
              borderColor: activeRootId === root.id ? "var(--gold)" : undefined,
              boxShadow: activeRootId === root.id ? "0 0 0 1px var(--gold)" : undefined,
            }}
            onClick={() => onSelectRoot?.(root)}
          >
            <Bubble comment={root} showTimestamp />
            {replies.map((r) => (
              <Bubble key={r.id} comment={r} />
            ))}

            {canReply && (
              <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 4 }}>
                {isReplyOpen ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      className="input-field"
                      style={{ fontSize: 12.5, padding: "6px 10px" }}
                      placeholder="اكتب رداً..."
                      value={replyText}
                      autoFocus
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitReply(root.id)}
                    />
                    <button
                      className="btn btn-gold"
                      style={{ padding: "6px 10px", flexShrink: 0 }}
                      disabled={posting || !replyText.trim()}
                      onClick={() => submitReply(root.id)}
                    >
                      <Icon name="send" size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "3px 6px", fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-muted)" }}
                    onClick={() => {
                      setReplyOpenId(root.id);
                      setReplyText("");
                    }}
                  >
                    <Icon name="message" size={12} /> رد{replies.length > 0 ? ` (${replies.length})` : ""}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
