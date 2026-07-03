"use client";

import { useMemo, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { NOTE_STATUSES } from "@/app/lib/constants";
import type { NoteStatus } from "@/app/lib/types";
import type { NoteWithAuthor, TeamMemberOption } from "@/app/lib/episode-detail";
import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";
import { relativeTime } from "../utils";

// نفس أسلوب ملاحظات الحلقة على طراز Frame.io (episode-tabs/NotesTab.tsx) لكن مقيّدة بهذا المشهد
// (notes.scene_id) بدل الحلقة كاملة — target_type: "storyboard".
function isImageAttachment(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|heic)$/i.test(name);
}

export default function SceneNotesSection({
  scene,
  projectId,
  teamMembers,
  onChanged,
}: {
  scene: StoryboardSceneFullDetail;
  projectId: string;
  teamMembers: TeamMemberOption[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const { userId, company, profile } = useSession();
  const companyId = company!.id;

  const notesById = useMemo(() => new Map(scene.notes.map((n) => [n.id, n])), [scene.notes]);
  const topLevel = useMemo(() => scene.notes.filter((n) => !n.parent_note_id), [scene.notes]);

  function rootIdOf(note: NoteWithAuthor): string {
    let current = note;
    const seen = new Set<string>();
    while (current.parent_note_id && !seen.has(current.id)) {
      seen.add(current.id);
      const parent = notesById.get(current.parent_note_id);
      if (!parent) break;
      current = parent;
    }
    return current.id;
  }

  function repliesOf(rootId: string): NoteWithAuthor[] {
    return scene.notes
      .filter((n) => n.id !== rootId && n.parent_note_id && rootIdOf(n) === rootId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // ── مركّب ملاحظة جديدة ──
  const [newBody, setNewBody] = useState("");
  const [newMentionIds, setNewMentionIds] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<{ name: string; url: string }[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  // ── رد على ملاحظة ──
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);

  function toggleMention(id: string) {
    setNewMentionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleFileAttach(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const path = `${companyId}/${projectId}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("project-files").upload(path, file, { upsert: false });
        if (upErr) continue;
        // المجلّد خاص (bucket خاص) — لا يوجد رابط عام دائم، لذا نستخدم رابطاً موقّتاً طويل الأمد (30 يوماً)
        const { data } = await supabase.storage.from("project-files").createSignedUrl(path, 60 * 60 * 24 * 30);
        if (data?.signedUrl) setNewAttachments((prev) => [...prev, { name: file.name, url: data.signedUrl }]);
      }
    } finally {
      setUploading(false);
    }
  }

  function addLinkAttachment() {
    const url = newLinkUrl.trim();
    if (!url) return;
    setNewAttachments((prev) => [...prev, { name: url, url }]);
    setNewLinkUrl("");
  }

  function removeAttachment(idx: number) {
    setNewAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submitNote() {
    if (!newBody.trim() || posting) return;
    setPosting(true);
    try {
      await supabase.from("notes").insert({
        company_id: companyId,
        project_id: projectId,
        episode_id: scene.episode_id,
        scene_id: scene.id,
        target_type: "storyboard",
        author_id: userId,
        author_role: profile.role,
        body: newBody.trim(),
        status: "new",
        mentions: newMentionIds,
        attachments: newAttachments,
      });
      await logActivity(supabase, { companyId, projectId, episodeId: scene.episode_id, action: "note_added", details: { scene_id: scene.id } });
      setNewBody("");
      setNewMentionIds([]);
      setNewAttachments([]);
      setShowMentionPicker(false);
      onChanged();
    } finally {
      setPosting(false);
    }
  }

  async function submitReply(parentNote: NoteWithAuthor) {
    if (!replyBody.trim() || replyPosting) return;
    setReplyPosting(true);
    try {
      await supabase.from("notes").insert({
        company_id: companyId,
        project_id: projectId,
        episode_id: scene.episode_id,
        scene_id: scene.id,
        target_type: parentNote.target_type,
        parent_note_id: parentNote.id,
        author_id: userId,
        author_role: profile.role,
        body: replyBody.trim(),
        status: "new",
      });
      await logActivity(supabase, { companyId, projectId, episodeId: scene.episode_id, action: "note_added", details: { scene_id: scene.id } });
      setReplyBody("");
      setReplyOpenId(null);
      onChanged();
    } finally {
      setReplyPosting(false);
    }
  }

  async function toggleStatus(note: NoteWithAuthor) {
    const nextStatus: NoteStatus = note.status === "done" ? "new" : "done";
    await supabase.from("notes").update({ status: nextStatus }).eq("id", note.id);
    onChanged();
  }

  function NoteBlock({ note, isReply }: { note: NoteWithAuthor; isReply?: boolean }) {
    const status = NOTE_STATUSES.find((s) => s.value === note.status);
    const resolved = note.status === "done";
    return (
      <div className="card" style={{ padding: 14, marginInlineStart: isReply ? 28 : 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{note.author_name || "مستخدم"}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(note.created_at)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {status && (
              <span className="chip" style={{ color: status.color, borderColor: status.color }}>
                {status.label}
              </span>
            )}
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: "4px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
              onClick={() => toggleStatus(note)}
            >
              <Icon name={resolved ? "circle" : "checkCircle"} size={12} /> {resolved ? "إعادة فتح" : "إنهاء"}
            </button>
          </div>
        </div>

        <p style={{ fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{note.body}</p>

        {note.mentions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {note.mentions.map((id) => {
              const m = teamMembers.find((t) => t.id === id);
              return (
                <span key={id} className="chip chip-gold" style={{ fontSize: 11 }}>
                  @{m?.full_name || "مستخدم"}
                </span>
              );
            })}
          </div>
        )}

        {note.attachments.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {note.attachments.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noreferrer" className="chip" style={{ gap: 4 }}>
                <Icon name={isImageAttachment(a.name) ? "image" : "attachment"} size={12} />
                {a.name.length > 28 ? `${a.name.slice(0, 28)}…` : a.name}
              </a>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {!isReply && (
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: "4px 8px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
              onClick={() => setReplyOpenId(replyOpenId === note.id ? null : note.id)}
            >
              <Icon name="message" size={13} /> رد
            </button>
          )}
        </div>

        {!isReply && replyOpenId === note.id && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              className="input-field"
              placeholder="اكتب رداً..."
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitReply(note)}
              autoFocus
            />
            <button className="btn btn-gold" disabled={replyPosting || !replyBody.trim()} onClick={() => submitReply(note)} style={{ flexShrink: 0 }}>
              <Icon name="send" size={15} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 800 }}>الملاحظات</h3>

      <div className="card" style={{ padding: 14 }}>
        <textarea
          className="input-field"
          rows={3}
          placeholder="أضف ملاحظة جديدة على هذا المشهد..."
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          style={{ resize: "vertical" }}
        />

        {newAttachments.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {newAttachments.map((a, i) => (
              <span key={i} className="chip" style={{ gap: 4 }}>
                <Icon name={isImageAttachment(a.name) ? "image" : "attachment"} size={12} />
                {a.name.length > 22 ? `${a.name.slice(0, 22)}…` : a.name}
                <button type="button" onClick={() => removeAttachment(i)} style={{ display: "inline-flex", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                  <Icon name="close" size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label className="btn btn-outline" style={{ cursor: uploading ? "wait" : "pointer", padding: "6px 12px", fontSize: 12 }}>
            <Icon name="upload" size={13} /> {uploading ? "جارٍ الرفع..." : "إرفاق ملف"}
            <input type="file" hidden disabled={uploading} onChange={(e) => handleFileAttach(e.target.files)} />
          </label>
          <input
            className="input-field"
            style={{ flex: 1, minWidth: 160 }}
            placeholder="أو أضف رابطاً..."
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLinkAttachment()}
          />
          <button type="button" className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={addLinkAttachment}>
            <Icon name="link" size={13} /> إضافة رابط
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: "6px 12px", fontSize: 12 }}
            onClick={() => setShowMentionPicker((v) => !v)}
          >
            <Icon name="user" size={13} /> إشارة إلى{newMentionIds.length > 0 ? ` (${newMentionIds.length})` : ""}
          </button>
        </div>

        {showMentionPicker && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {teamMembers.length === 0 ? (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>لا يوجد أعضاء فريق للإشارة إليهم</span>
            ) : (
              teamMembers.map((m) => {
                const active = newMentionIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={active ? "chip chip-gold" : "chip"}
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleMention(m.id)}
                  >
                    @{m.full_name || "بدون اسم"}
                  </button>
                );
              })
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button className="btn btn-gold" disabled={posting || !newBody.trim()} onClick={submitNote}>
            <Icon name="send" size={15} /> إضافة ملاحظة
          </button>
        </div>
      </div>

      {topLevel.length === 0 ? (
        <div className="empty-state">
          <Icon name="message" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد ملاحظات بعد لهذا المشهد</p>
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
