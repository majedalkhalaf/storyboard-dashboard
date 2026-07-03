"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { NOTE_STATUSES } from "@/app/lib/constants";
import { fetchClientNotes, type ClientNoteRow } from "@/app/lib/client-profile";
import { relativeTime } from "@/app/components/projects/utils";
import type { NoteTargetType } from "@/app/lib/types";

const TARGET_TYPE_LABELS: Record<NoteTargetType, string> = {
  project: "ملاحظة على المشروع",
  episode: "ملاحظة على حلقة",
  video: "ملاحظة على فيديو",
  image: "ملاحظة على صورة",
  file: "ملاحظة على ملف",
  script: "ملاحظة على السكربت",
  scenario: "ملاحظة على السيناريو",
  storyboard: "ملاحظة على Storyboard",
};

export default function NotesTab({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<ClientNoteRow[] | null>(null);

  useEffect(() => {
    fetchClientNotes(clientId).then(setNotes);
  }, [clientId]);

  if (notes === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ height: 90, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 90, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 90, borderRadius: 10 }} />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="message" size={30} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد ملاحظات لهذا العميل بعد</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {notes.map((n) => {
        const status = NOTE_STATUSES.find((s) => s.value === n.status);
        return (
          <div key={n.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{n.author_name || "مستخدم"}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(n.created_at)}</span>
                <span className="chip chip-gold" style={{ fontSize: 11 }}>
                  {n.project_name}
                </span>
              </div>
              {status && (
                <span className="chip" style={{ color: status.color, borderColor: status.color }}>
                  {status.label}
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{TARGET_TYPE_LABELS[n.target_type] ?? n.target_type}</p>
            <p style={{ fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{n.body}</p>
          </div>
        );
      })}
    </div>
  );
}
