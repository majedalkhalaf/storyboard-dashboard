"use client";

import { useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import ModalPortal from "@/app/components/ui/ModalPortal";
import RichTextEditor from "@/app/components/client/RichTextEditor";
import { createClient } from "@/app/lib/supabase/client";
import { NOTE_REQUEST_TYPES, NOTE_PRIORITIES } from "@/app/lib/constants";
import type { Note, NotePriority, NoteRequestType, NoteTargetType } from "@/app/lib/types";

interface Attachment {
  name: string;
  url: string;
  type?: string;
}

// نافذة "طلب تعديل" — الوظيفة الأهم في بوابة العميل. غنية بالخصائص عمداً بدل
// مربع نص بسيط: نوع الطلب، أولويته، محرر نص منسّق، مرفقات بالسحب والإفلات،
// وربط اختياري بلحظة زمنية داخل الفيديو (إدخال يدوي دقيقة:ثانية).
export default function EditRequestComposer({
  open,
  onClose,
  companyId,
  projectId,
  episodeId,
  targetType,
  targetId,
  currentUserId,
  canUploadAttachments,
  initialTimestampSeconds,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string;
  projectId: string;
  episodeId: string | null;
  targetType: NoteTargetType;
  targetId: string;
  currentUserId: string;
  canUploadAttachments: boolean;
  /** لتعبئة حقل "لحظة زمنية في الفيديو" تلقائياً عند فتح الطلب أثناء مشاهدة الفيديو مباشرة. */
  initialTimestampSeconds?: number;
  onCreated: (note: Note) => void;
}) {
  const [requestType, setRequestType] = useState<NoteRequestType | null>(null);
  const [priority, setPriority] = useState<NotePriority>("medium");
  const [bodyHtml, setBodyHtml] = useState("");
  const [timestamp, setTimestamp] = useState(() =>
    initialTimestampSeconds != null
      ? `${Math.floor(initialTimestampSeconds / 60)}:${String(Math.floor(initialTimestampSeconds % 60)).padStart(2, "0")}`
      : ""
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const plainText = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  function parseTimestamp(text: string): number | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{1,3}):([0-5]?\d)$/);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  const timestampValid = timestamp.trim() === "" || parseTimestamp(timestamp) !== null;

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    for (const file of files) {
      setUploadingCount((c) => c + 1);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("projectId", projectId);
        const res = await fetch("/api/client-portal/note-attachments", { method: "POST", body: fd });
        const json = (await res.json()) as Attachment & { error?: string };
        if (res.ok) {
          setAttachments((prev) => [...prev, { name: json.name, url: json.url, type: json.type }]);
        } else {
          setError(json.error || "تعذّر رفع أحد المرفقات");
        }
      } catch {
        setError("تعذّر رفع أحد المرفقات");
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }
  }

  function removeAttachment(url: string) {
    setAttachments((prev) => prev.filter((a) => a.url !== url));
  }

  async function submit() {
    if (!plainText) {
      setError("يرجى كتابة تفاصيل طلب التعديل.");
      return;
    }
    if (!timestampValid) {
      setError("صيغة اللحظة الزمنية غير صحيحة، استخدم دقيقة:ثانية مثل 01:23.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("notes")
      .insert({
        company_id: companyId,
        project_id: projectId,
        episode_id: episodeId,
        target_type: targetType,
        target_id: targetId,
        parent_note_id: null,
        author_id: currentUserId,
        author_role: "client",
        body: plainText,
        body_html: bodyHtml,
        status: "new",
        request_type: requestType,
        priority,
        mentions: [],
        attachments,
        video_timestamp_seconds: parseTimestamp(timestamp),
      })
      .select("*")
      .single();
    setBusy(false);
    if (insertError || !data) {
      setError("تعذّر إرسال طلب التعديل، حاول مرة أخرى.");
      return;
    }
    onCreated(data as Note);
    setRequestType(null);
    setPriority("medium");
    setBodyHtml("");
    setTimestamp("");
    setAttachments([]);
    onClose();
  }

  return (
    <ModalPortal>
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal-content" style={{ maxWidth: 620, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Icon name="edit" size={22} className="nav-icon" />
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>طلب تعديل جديد</h3>
        </div>

        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>نوع الطلب</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {NOTE_REQUEST_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setRequestType(t.value)}
              className="chip"
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: requestType === t.value ? "rgba(var(--gold-rgb),0.15)" : undefined,
                borderColor: requestType === t.value ? "var(--gold)" : undefined,
                color: requestType === t.value ? "var(--gold)" : undefined,
                fontWeight: requestType === t.value ? 700 : 500,
              }}
            >
              <Icon name={t.icon} size={13} />
              {t.label}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>الأولوية</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {NOTE_PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className="chip"
              style={{
                cursor: "pointer",
                flex: 1,
                justifyContent: "center",
                background: priority === p.value ? `${p.color}22` : undefined,
                borderColor: priority === p.value ? p.color : undefined,
                color: priority === p.value ? p.color : undefined,
                fontWeight: priority === p.value ? 700 : 500,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>تفاصيل الطلب</label>
        <div style={{ marginBottom: 16 }}>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="اشرح بالتفصيل ما التعديل المطلوب..." />
        </div>

        {episodeId && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>
              لحظة زمنية في الفيديو <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(اختياري — دقيقة:ثانية)</span>
            </label>
            <input
              className="input-field"
              style={{ maxWidth: 140 }}
              placeholder="01:23"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
            />
          </div>
        )}

        {canUploadAttachments && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>المرفقات (اختياري)</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? "var(--gold)" : "var(--border)"}`,
                borderRadius: 10,
                padding: 18,
                textAlign: "center",
                cursor: "pointer",
                background: dragActive ? "rgba(var(--gold-rgb),0.06)" : "var(--bg-secondary)",
              }}
            >
              <Icon name="fileUp" size={22} className="nav-icon" />
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>
                اسحب وأفلت الصور أو الفيديوهات أو الملفات الصوتية أو المستندات هنا، أو اضغط للاختيار
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => e.target.files && uploadFiles(e.target.files)}
              />
            </div>

            {uploadingCount > 0 && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>جارٍ رفع {uploadingCount} ملف...</p>}

            {attachments.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {attachments.map((a) => (
                  <div key={a.url} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, background: "var(--bg-secondary)", padding: "6px 10px", borderRadius: 8 }}>
                    <Icon name="attachment" size={14} className="nav-icon" />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                    <button type="button" className="btn btn-ghost" style={{ padding: "2px 6px" }} onClick={() => removeAttachment(a.url)}>
                      <Icon name="close" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <Icon name="alert" size={15} />
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={busy || uploadingCount > 0}>
            <Icon name="send" size={16} />
            {busy ? "جارٍ الإرسال..." : "إرسال طلب التعديل"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
