"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import { getMetaTags, getMetaValue } from "@/app/lib/episode-meta";
import type { MetaFieldDef } from "@/app/lib/project-templates";
import type { EpisodeFullDetail } from "@/app/lib/episode-detail";

// تبويب عام قابل لإعادة الاستخدام عبر كل القوالب — يعرض أي مجموعة حقول يحددها
// template.metaFields (نص/textarea/tags/select/url)، ويحفظها في episodes.meta
// (jsonb حر بلا قيد) بنفس نمط الحفظ المؤجَّل (debounce) المستخدم في ScriptTab.tsx.
export default function MetaFieldsTab({
  episode,
  fields,
  onChanged,
}: {
  episode: EpisodeFullDetail;
  fields: MetaFieldDef[];
  onChanged: (patch: Partial<EpisodeFullDetail>) => void;
}) {
  const { profile } = useSession();
  const canEdit = isInternalAdmin(profile.role) || profile.role === "team_member";

  if (fields.length === 0) {
    return (
      <div className="card empty-state" style={{ padding: 24 }}>
        <Icon name="sparkles" size={28} className="text-muted" />
        <p style={{ marginTop: 10, fontSize: 13 }}>لا توجد حقول إضافية لهذا النوع من المشاريع.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
      {fields.map((field) => (
        <MetaFieldEditor key={`${episode.id}-${field.key}`} episode={episode} field={field} canEdit={canEdit} onChanged={onChanged} />
      ))}
    </div>
  );
}

function MetaFieldEditor({
  episode,
  field,
  canEdit,
  onChanged,
}: {
  episode: EpisodeFullDetail;
  field: MetaFieldDef;
  canEdit: boolean;
  onChanged: (patch: Partial<EpisodeFullDetail>) => void;
}) {
  const supabase = createClient();
  const isTags = field.type === "tags";
  const [value, setValue] = useState(() => (isTags ? getMetaTags(episode.meta, field.key).join(", ") : getMetaValue(episode.meta, field.key)));
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);

  async function persistNow(text: string) {
    const nextValue: unknown = isTags
      ? text
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : text || null;
    const nextMeta = { ...(episode.meta ?? {}), [field.key]: nextValue };
    setSaving(true);
    try {
      await supabase.from("episodes").update({ meta: nextMeta }).eq("id", episode.id);
      onChanged({ meta: nextMeta });
    } finally {
      setSaving(false);
    }
  }

  function handleChange(text: string) {
    setValue(text);
    if (!canEdit) return;
    pendingRef.current = text;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      pendingRef.current = null;
      persistNow(text);
    }, 900);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (pendingRef.current !== null) persistNow(pendingRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ينفَّذ فقط عند إلغاء تركيب هذا المحرر تحديداً
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          {field.icon && <Icon name={field.icon} size={13} className="text-muted" />}
          {field.label}
        </label>
        {saving && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>جارٍ الحفظ...</span>}
      </div>

      {field.type === "textarea" ? (
        <textarea
          className="input-field"
          rows={4}
          disabled={!canEdit}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder}
          style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }}
        />
      ) : field.type === "select" ? (
        <select className="input-field" disabled={!canEdit} value={value} onChange={(e) => handleChange(e.target.value)}>
          <option value="">— اختر —</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="input-field"
          type={field.type === "url" ? "url" : "text"}
          disabled={!canEdit}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.type === "tags" ? "افصل بينها بفاصلة" : field.placeholder}
        />
      )}
    </div>
  );
}
