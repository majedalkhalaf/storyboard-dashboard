"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { NOTE_STATUSES } from "@/app/lib/constants";
import { relativeTime } from "@/app/components/projects/utils";
import type { NoteStatus, NoteTargetType } from "@/app/lib/types";

export interface NoteRow {
  id: string;
  project_id: string;
  episode_id: string | null;
  target_type: NoteTargetType;
  author_id: string;
  author_role: string | null;
  body: string;
  status: NoteStatus;
  created_at: string;
  author: { full_name: string | null } | null;
  project: { name: string } | null;
  episode: { title: string } | null;
}

function StatusChip({ status }: { status: NoteStatus }) {
  const info = NOTE_STATUSES.find((s) => s.value === status);
  return (
    <span className="chip" style={{ color: info?.color, borderColor: info?.color }}>
      {info?.label ?? status}
    </span>
  );
}

function replyCountLabel(count: number): string {
  if (count === 0) return "لا ردود";
  if (count === 1) return "رد واحد";
  if (count === 2) return "ردّان";
  return `${count} ردود`;
}

export default function NotesClient({
  initialNotes,
  replyCounts,
}: {
  initialNotes: NoteRow[];
  replyCounts: Record<string, number>;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<NoteStatus | "all">("all");

  const tabs: { key: NoteStatus | "all"; label: string }[] = [
    { key: "all", label: "الكل" },
    ...NOTE_STATUSES.map((s) => ({ key: s.value, label: s.label })),
  ];

  const filtered = useMemo(() => {
    return initialNotes.filter((n) => {
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!n.body.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [initialNotes, statusFilter, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
          الملاحظات
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          {initialNotes.length} ملاحظة عبر جميع المشاريع
        </p>
      </div>

      <div style={{ position: "relative" }}>
        <input
          className="input-field"
          placeholder="بحث في نص الملاحظات..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingInlineStart: 38 }}
        />
        <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
          <Icon name="search" size={16} />
        </span>
      </div>

      <div className="tabs-scroll" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className="btn-ghost"
            style={{
              padding: "10px 16px",
              borderRadius: 0,
              borderBottom: statusFilter === t.key ? "2px solid var(--gold)" : "2px solid transparent",
              color: statusFilter === t.key ? "var(--gold)" : "var(--text-secondary)",
              fontWeight: statusFilter === t.key ? 700 : 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="message" size={32} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد ملاحظات مطابقة</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((note) => {
            const count = replyCounts[note.id] ?? 0;
            const projectHref = note.episode_id
              ? `/projects/${note.project_id}/episodes/${note.episode_id}`
              : `/projects/${note.project_id}`;
            return (
              <div key={note.id} className="card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    color: "#090909",
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {(note.author?.full_name || "?").charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{note.author?.full_name || "مستخدم"}</span>
                      {note.author_role === "client" && (
                        <span className="chip" style={{ fontSize: 10, padding: "2px 8px" }}>
                          عميل
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(note.created_at)}</span>
                  </div>

                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      marginTop: 6,
                      color: "var(--text-primary)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {note.body}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                    <StatusChip status={note.status} />
                    <Link href={projectHref} style={{ color: "var(--gold)", fontSize: 12.5, fontWeight: 600 }}>
                      {note.project?.name ?? "—"}
                      {note.episode?.title ? ` · ${note.episode.title}` : ""}
                    </Link>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
                      <Icon name="message" size={12} />
                      {replyCountLabel(count)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
