"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import type { ClientRecord, ProjectTemplate } from "@/app/lib/types";

export default function CreateFromTemplateModal({
  templates,
  clients,
  onClose,
}: {
  templates: ProjectTemplate[];
  clients: Pick<ClientRecord, "id" | "name">[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { userId, company } = useSession();
  const companyId = company!.id;

  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = templates.find((t) => t.id === templateId) ?? null;

  async function handleCreate() {
    if (!template || !name.trim()) {
      setError("اختر قالباً واكتب اسم المشروع");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    try {
      const { data: project, error: pErr } = await supabase
        .from("projects")
        .insert({
          company_id: companyId,
          client_id: clientId || null,
          created_by: userId,
          name: name.trim(),
          type: template.project_type,
          status: "planning",
        })
        .select("id")
        .single();
      if (pErr) throw pErr;

      if (template.services.length) {
        await supabase.from("project_services").insert(
          template.services.map((s) => ({
            project_id: project.id,
            company_id: companyId,
            category: s.category,
            service_key: s.service_key,
            label: s.label,
            is_custom: false,
          }))
        );
      }

      await logActivity(supabase, {
        companyId,
        projectId: project.id,
        action: "project_created",
        details: { name: name.trim(), from_template: template.name },
      });

      router.push(`/projects/${project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر إنشاء المشروع من القالب");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>إنشاء من قالب</h2>
          <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {error && (
          <div className="btn-danger" style={{ display: "block", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        {templates.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            لا توجد قوالب بعد. أنشئ قالباً أولاً من صفحة القوالب.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              القالب
              <select className="input-field" style={{ marginTop: 6 }} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">— اختر قالباً —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>

            {template && (
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {template.services.length} خدمة ستُضاف تلقائياً للمشروع.
              </p>
            )}

            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              اسم المشروع
              <input className="input-field" style={{ marginTop: 6 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: حملة الصيف 2026" />
            </label>

            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              العميل (اختياري)
              <select className="input-field" style={{ marginTop: 6 }} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">— بدون عميل —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>إلغاء</button>
          {templates.length > 0 && (
            <button className="btn btn-gold" onClick={handleCreate} disabled={saving || !template || !name.trim()}>
              {saving ? "جارٍ الإنشاء..." : "إنشاء المشروع"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
