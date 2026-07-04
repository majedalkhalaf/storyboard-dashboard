"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { CLIENT_PERMISSION_LABELS } from "@/app/lib/constants";
import { CLIENT_PERMISSION_GROUPS, permissionCountOf, permissionTotalCount } from "@/app/lib/client-invite-catalog";
import type { ClientPermissions, CompanyPermissionTemplate } from "@/app/lib/types";

// محرر صلاحيات العميل الموحّد — يُستخدم داخل نافذة الدعوة الجديدة ومحرر
// صلاحيات العميل الحالي في تبويب "العملاء" سواء بسواء، بدل وجود نموذجين
// مختلفين لنفس المفهوم. مقسّم لبطاقات قابلة للطي حسب الموضوع، مع بحث فوري،
// وأزرار تحديد/إلغاء الكل، وحفظ/تطبيق نماذج محفوظة على مستوى الشركة.
export default function ClientPermissionsEditor({
  companyId,
  permissions,
  onChange,
}: {
  companyId: string;
  permissions: ClientPermissions;
  onChange: (next: ClientPermissions) => void;
}) {
  const [query, setQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<CompanyPermissionTemplate[] | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("company_permission_templates")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTemplates((data as CompanyPermissionTemplate[] | null) ?? []));
  }, [companyId]);

  const q = query.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    if (!q) return CLIENT_PERMISSION_GROUPS;
    return CLIENT_PERMISSION_GROUPS.map((g) => ({ ...g, keys: g.keys.filter((k) => CLIENT_PERMISSION_LABELS[k].toLowerCase().includes(q)) })).filter(
      (g) => g.keys.length > 0
    );
  }, [q]);

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function togglePerm(key: keyof ClientPermissions) {
    onChange({ ...permissions, [key]: !permissions[key] });
  }

  function selectAll() {
    const next = { ...permissions };
    for (const g of CLIENT_PERMISSION_GROUPS) for (const k of g.keys) next[k] = true;
    onChange(next);
  }

  function deselectAll() {
    const next = { ...permissions };
    for (const g of CLIENT_PERMISSION_GROUPS) for (const k of g.keys) next[k] = false;
    onChange(next);
  }

  async function saveAsTemplate() {
    const name = prompt("اسم النموذج (مثال: عميل شركات، عميل فردي...)");
    if (!name || !name.trim()) return;
    setSavingTemplate(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("company_permission_templates")
      .insert({ company_id: companyId, name: name.trim(), permissions, created_by: user?.id })
      .select("*")
      .single();
    setSavingTemplate(false);
    if (!error && data) setTemplates((prev) => [data as CompanyPermissionTemplate, ...(prev ?? [])]);
  }

  async function deleteTemplate(id: string) {
    if (!confirm("حذف هذا النموذج نهائياً؟")) return;
    const supabase = createClient();
    await supabase.from("company_permission_templates").delete().eq("id", id);
    setTemplates((prev) => (prev ?? []).filter((t) => t.id !== id));
  }

  const total = permissionTotalCount();
  const granted = permissionCountOf(permissions);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
          {granted} من {total} صلاحية مفعّلة
        </span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline" style={{ fontSize: 11.5, padding: "5px 10px" }} onClick={selectAll}>
            تحديد الكل
          </button>
          <button type="button" className="btn btn-outline" style={{ fontSize: 11.5, padding: "5px 10px" }} onClick={deselectAll}>
            إلغاء الكل
          </button>
          <button type="button" className="btn btn-outline" style={{ fontSize: 11.5, padding: "5px 10px" }} onClick={saveAsTemplate} disabled={savingTemplate}>
            <Icon name="copy" size={12} /> {savingTemplate ? "جارٍ الحفظ..." : "حفظ كنموذج"}
          </button>
        </div>
      </div>

      {templates && templates.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {templates.map((t) => (
            <span
              key={t.id}
              className="chip"
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
              onClick={() => onChange(t.permissions)}
              title="تطبيق هذا النموذج"
            >
              <Icon name="sliders" size={11} /> {t.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTemplate(t.id);
                }}
                style={{ display: "flex", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}
              >
                <Icon name="close" size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <input className="input-field" placeholder="بحث عن صلاحية..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingInlineStart: 32, fontSize: 12.5 }} />
        <span style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
          <Icon name="search" size={13} />
        </span>
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {visibleGroups.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", padding: 14, textAlign: "center" }}>لا توجد صلاحيات مطابقة</p>
        ) : (
          visibleGroups.map((group, i) => {
            const count = group.keys.filter((k) => permissions[k]).length;
            const collapsed = Boolean(collapsedGroups[group.key]) && !q;
            return (
              <div key={group.key} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "var(--bg-secondary)",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, color: "var(--text-secondary)" }}>
                    <Icon name={group.icon} size={14} /> {group.label} · {count}/{group.keys.length}
                  </span>
                  <Icon name="chevronDown" size={14} className={collapsed ? "" : "rotate-180"} />
                </button>
                {!collapsed && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "10px 14px" }}>
                    {group.keys.map((key) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-secondary)", cursor: "pointer", padding: "3px 0" }}>
                        <input type="checkbox" checked={permissions[key]} onChange={() => togglePerm(key)} style={{ accentColor: "var(--gold)" }} />
                        {CLIENT_PERMISSION_LABELS[key]}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
