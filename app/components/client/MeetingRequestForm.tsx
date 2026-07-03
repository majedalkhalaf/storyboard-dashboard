"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";

interface RequestableProject {
  id: string;
  company_id: string;
  name: string;
}

// نموذج "طلب اجتماع" — لا يوجد جدول اجتماعات/جدولة فعلي بعد، فالطلب يُسجَّل
// كملاحظة حقيقية بمستوى المشروع (target_type='meeting') يراها فريق العمل مباشرة
// في قائمة ملاحظات العميل الداخلية، بدل اختراع بيانات جدولة وهمية.
export default function MeetingRequestForm({ projects, userId, onSent }: { projects: RequestableProject[]; userId: string; onSent?: () => void }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    const project = projects.find((p) => p.id === projectId);
    if (!trimmed || !project) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("notes").insert({
      company_id: project.company_id,
      project_id: project.id,
      episode_id: null,
      target_type: "meeting",
      target_id: project.id,
      parent_note_id: null,
      author_id: userId,
      author_role: "client",
      body: trimmed,
      status: "new",
      mentions: [],
      attachments: [],
    });
    setBusy(false);
    if (insertError) {
      setError("تعذّر إرسال الطلب، حاول مرة أخرى.");
      return;
    }
    setBody("");
    setSent(true);
    onSent?.();
    setTimeout(() => setSent(false), 4000);
  }

  if (projects.length === 0) return null;

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: 18 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>طلب اجتماع</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {projects.length > 1 && (
          <select className="input-field" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <textarea
          className="input-field"
          rows={3}
          placeholder="اذكر الموضوع والوقت المناسب لك..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
            <Icon name="alert" size={14} /> {error}
          </div>
        )}
        {sent && (
          <div style={{ color: "var(--success)", fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
            <Icon name="checkCircle" size={14} /> تم إرسال طلبك، سيتواصل معك فريق العمل لتحديد الموعد.
          </div>
        )}
        <button type="submit" className="btn btn-gold" disabled={busy || !body.trim()} style={{ justifyContent: "center" }}>
          <Icon name="send" size={15} /> {busy ? "جارٍ الإرسال..." : "إرسال الطلب"}
        </button>
      </div>
    </form>
  );
}
