"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import Tabs, { type TabDef } from "@/app/components/ui/Tabs";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { isInternalAdmin } from "@/app/lib/permissions";
import type { Note } from "@/app/lib/types";
import type { EpisodeFullDetail, NoteWithAuthor, ScriptVersionWithAuthor } from "@/app/lib/episode-detail";
import { relativeTime } from "../utils";

type ScriptField = "script" | "scenario";

const FIELD_LABEL: Record<ScriptField, string> = { script: "السكربت", scenario: "السيناريو" };

const FIELD_TABS: TabDef<ScriptField>[] = [
  { key: "script", label: "السكربت", icon: "fileCheck" },
  { key: "scenario", label: "السيناريو", icon: "episodes" },
];

export default function ScriptTab({
  episode,
  onChanged,
}: {
  episode: EpisodeFullDetail;
  onChanged: (patch: Partial<EpisodeFullDetail>) => void;
}) {
  const { profile } = useSession();
  const canEdit = isInternalAdmin(profile.role) || profile.role === "team_member";
  const [activeField, setActiveField] = useState<ScriptField>("script");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Tabs
        tabs={FIELD_TABS.map((t) => ({ ...t, badge: episode.scriptVersions.filter((v) => v.field === t.key).length || undefined }))}
        active={activeField}
        onChange={setActiveField}
      />

      {/* الحقلان يبقيان دائماً في الشجرة (يُخفى غير النشط فقط) حتى لا يُفقد أي حفظ تلقائي معلّق عند تبديل التبويب الفرعي */}
      <div style={{ display: activeField === "script" ? "flex" : "none", flexDirection: "column", gap: 16 }}>
        <ScriptFieldEditor key={`${episode.id}-script`} episode={episode} field="script" canEdit={canEdit} onChanged={onChanged} />
      </div>
      <div style={{ display: activeField === "scenario" ? "flex" : "none", flexDirection: "column", gap: 16 }}>
        <ScriptFieldEditor key={`${episode.id}-scenario`} episode={episode} field="scenario" canEdit={canEdit} onChanged={onChanged} />
      </div>
    </div>
  );
}

type SaveStatus = "idle" | "saving" | "saved";

function ScriptFieldEditor({
  episode,
  field,
  canEdit,
  onChanged,
}: {
  episode: EpisodeFullDetail;
  field: ScriptField;
  canEdit: boolean;
  onChanged: (patch: Partial<EpisodeFullDetail>) => void;
}) {
  const supabase = createClient();
  const { userId, company, profile } = useSession();
  const companyId = company!.id;

  // المفتاح `${episode.id}-${field}` في المكوّن الأب يعيد تركيب هذا المكوّن عند تبديل الحلقة،
  // لذا القيمة الأولية هنا صحيحة دوماً ولا حاجة لمزامنتها يدوياً لاحقاً.
  const [value, setValue] = useState(() => (field === "script" ? episode.script : episode.scenario) ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savingVersion, setSavingVersion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);

  async function persistNow(text: string) {
    await supabase
      .from("episodes")
      .update({ [field]: text || null })
      .eq("id", episode.id);
    onChanged({ [field]: text || null } as Partial<EpisodeFullDetail>);
  }

  function handleChange(text: string) {
    setValue(text);
    if (!canEdit) return;
    pendingRef.current = text;
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      pendingRef.current = null;
      persistNow(text).then(() => setStatus("saved"));
    }, 1200);
  }

  useEffect(() => {
    return () => {
      // نحفظ أي تغيير معلّق (لم يمرّ عليه 1.2 ثانية بعد) فور تبديل الحقل/الحلقة حتى لا يُفقد بسبب الـ debounce
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (pendingRef.current !== null) persistNow(pendingRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ينفَّذ فقط عند إلغاء تركيب هذا المحرر تحديداً (عندما يتغيّر المفتاح episode.id/field في الأب)
  }, []);

  async function saveVersion() {
    if (!canEdit || !value.trim()) return;
    setSavingVersion(true);
    try {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        pendingRef.current = null;
      }
      setStatus("saving");
      await persistNow(value);
      setStatus("saved");

      const { data } = await supabase
        .from("episode_script_versions")
        .insert({ company_id: companyId, episode_id: episode.id, field, content: value, created_by: userId })
        .select()
        .single();
      if (data) {
        const newVersion: ScriptVersionWithAuthor = {
          id: data.id,
          company_id: data.company_id,
          episode_id: data.episode_id,
          field: data.field,
          content: data.content,
          created_by: data.created_by,
          created_at: data.created_at,
          author_name: profile.full_name,
        };
        onChanged({ scriptVersions: [newVersion, ...episode.scriptVersions] });
      }
      await logActivity(supabase, {
        companyId,
        projectId: episode.project_id,
        episodeId: episode.id,
        action: "episode_script_version_saved",
        details: { field },
      });
    } finally {
      setSavingVersion(false);
    }
  }

  async function restoreVersion(version: ScriptVersionWithAuthor) {
    if (!canEdit) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      pendingRef.current = null;
    }
    setValue(version.content);
    setStatus("saving");
    await persistNow(version.content);
    setStatus("saved");
  }

  const versions = episode.scriptVersions.filter((v) => v.field === field);
  const comments = episode.notes.filter((n) => n.target_type === field);

  return (
    <>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{FIELD_LABEL[field]}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SaveStatusBadge status={status} />
            {canEdit && (
              <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }} disabled={savingVersion || !value.trim()} onClick={saveVersion}>
                <Icon name="badgeCheck" size={13} /> {savingVersion ? "جارٍ الحفظ..." : "حفظ نسخة"}
              </button>
            )}
          </div>
        </div>
        <textarea
          className="input-field"
          rows={14}
          disabled={!canEdit}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={canEdit ? `اكتب ${FIELD_LABEL[field]} هنا...` : "لا يوجد نص بعد."}
          style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.8, fontSize: 14 }}
        />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>سجل النسخ</h3>
        {versions.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>لا توجد نسخ محفوظة بعد. استخدم زر &quot;حفظ نسخة&quot; لحفظ لقطة من {FIELD_LABEL[field]}.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {versions.map((v) => (
              <div
                key={v.id}
                className="card"
                style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{v.author_name || "مستخدم"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(v.created_at)}</div>
                </div>
                {canEdit && (
                  <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => restoreVersion(v)}>
                    <Icon name="arrowLeft" size={12} /> استرجاع هذه النسخة
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ScriptComments episode={episode} field={field} canEdit={canEdit} comments={comments} onChanged={onChanged} />
    </>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <span style={{ fontSize: 11, color: status === "saving" ? "var(--text-muted)" : "var(--gold)", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Icon name={status === "saving" ? "clock" : "check"} size={12} />
      {status === "saving" ? "جارٍ الحفظ..." : "تم الحفظ"}
    </span>
  );
}

function ScriptComments({
  episode,
  field,
  canEdit,
  comments,
  onChanged,
}: {
  episode: EpisodeFullDetail;
  field: ScriptField;
  canEdit: boolean;
  comments: NoteWithAuthor[];
  onChanged: (patch: Partial<EpisodeFullDetail>) => void;
}) {
  const supabase = createClient();
  const { userId, company, profile } = useSession();
  const companyId = company!.id;
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function post() {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const { data } = await supabase
        .from("notes")
        .insert({
          company_id: companyId,
          project_id: episode.project_id,
          episode_id: episode.id,
          target_type: field,
          author_id: userId,
          author_role: profile.role,
          body: body.trim(),
          status: "new",
        })
        .select()
        .single();
      if (data) {
        const newNote: NoteWithAuthor = { ...(data as Note), author_name: profile.full_name, author_job_title: profile.job_title ?? null };
        onChanged({ notes: [newNote, ...episode.notes] });
      }
      setBody("");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>ملاحظات على {FIELD_LABEL[field]}</h3>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
        ملاحظات عامة على {FIELD_LABEL[field]} ككل (غير مرتبطة بموضع نص محدد داخله).
      </p>

      {canEdit && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            className="input-field"
            placeholder={`أضف ملاحظة على ${FIELD_LABEL[field]}...`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && post()}
          />
          <button className="btn btn-gold" disabled={posting || !body.trim()} onClick={post} style={{ flexShrink: 0 }}>
            <Icon name="send" size={15} />
          </button>
        </div>
      )}

      {comments.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>لا توجد ملاحظات بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {comments.map((n) => (
            <div key={n.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{n.author_name || "مستخدم"}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(n.created_at)}</span>
              </div>
              <p style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
