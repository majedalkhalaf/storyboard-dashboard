"use client";

import { useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { PROJECT_TYPES, ITEM_NOUN_OPTIONS, type ItemNounKey } from "@/app/lib/constants";
import { safeStorageKey } from "@/app/lib/storage-path";
import type { ClientRecord, Project, ProjectServiceItem } from "@/app/lib/types";
import ClientsTab, { type ProjectClientRow } from "./ClientsTab";
import ServicesPicker, { type PickedService } from "./ServicesPicker";

type DrawerTab = "info" | "clients";

export default function ProjectSettingsDrawer({
  project,
  services,
  projectClients,
  companyClients,
  initialTab,
  onClose,
  onProjectChanged,
  onClientsChanged,
  onSaved,
}: {
  project: Project;
  services: ProjectServiceItem[];
  projectClients: ProjectClientRow[];
  companyClients: Pick<ClientRecord, "id" | "name" | "email" | "phone">[];
  initialTab: DrawerTab;
  onClose: () => void;
  onProjectChanged: (patch: Partial<Project>) => void;
  onClientsChanged: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const { company } = useSession();
  const companyId = company!.id;
  const [tab, setTab] = useState<DrawerTab>(initialTab);

  const [clientId, setClientId] = useState(project.client_id ?? "");
  const [type, setType] = useState(project.type ?? "");
  const [customType, setCustomType] = useState(project.custom_type ?? "");
  const [itemNounKey, setItemNounKey] = useState<ItemNounKey>((project.item_noun_key as ItemNounKey) ?? "episodes");
  const [customSingular, setCustomSingular] = useState(project.item_noun_custom_singular ?? "");
  const [customPlural, setCustomPlural] = useState(project.item_noun_custom_plural ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [shootingDate, setShootingDate] = useState(project.shooting_date ?? "");
  const [deliveryDate, setDeliveryDate] = useState(project.delivery_date ?? "");
  const [budget, setBudget] = useState(project.budget != null ? String(project.budget) : "");
  const [location, setLocation] = useState(project.location ?? "");
  const [storageLink, setStorageLink] = useState(project.storage_link ?? "");
  const [notes, setNotes] = useState(project.notes ?? "");
  const [pickedServices, setPickedServices] = useState<PickedService[]>(
    services.map((s) => ({ category: s.category, service_key: s.service_key, label: s.label, is_custom: s.is_custom }))
  );

  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadCover(file: File | null) {
    if (!file) return;
    setCoverError(null);
    if (file.size > 20 * 1024 * 1024) {
      setCoverError("حجم الصورة كبير جداً (الحد الأقصى 20 ميجابايت)");
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }
    setCoverUploading(true);
    try {
      const path = `${companyId}/covers/${safeStorageKey(file.name)}`;
      const { error: upErr } = await supabase.storage.from("public-assets").upload(path, file, { upsert: false });
      if (upErr) {
        setCoverError(upErr.message || "تعذّر رفع الصورة");
        return;
      }
      const url = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
      await supabase.from("projects").update({ cover_image_url: url }).eq("id", project.id);
      onProjectChanged({ cover_image_url: url });
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function removeCover() {
    await supabase.from("projects").update({ cover_image_url: null }).eq("id", project.id);
    onProjectChanged({ cover_image_url: null });
  }

  async function saveInfo() {
    setSaving(true);
    setError(null);
    try {
      const patch = {
        client_id: clientId || null,
        type: type || null,
        custom_type: type === "other" ? customType.trim() || null : null,
        item_noun_key: itemNounKey,
        item_noun_custom_singular: itemNounKey === "custom" ? customSingular.trim() || null : null,
        item_noun_custom_plural: itemNounKey === "custom" ? customPlural.trim() || null : null,
        description: description.trim() || null,
        shooting_date: shootingDate || null,
        delivery_date: deliveryDate || null,
        budget: budget ? Number(budget) : null,
        location: location.trim() || null,
        storage_link: storageLink.trim() || null,
        notes: notes.trim() || null,
      };
      const { error: pErr } = await supabase.from("projects").update(patch).eq("id", project.id);
      if (pErr) throw pErr;
      onProjectChanged(patch);

      // مطابقة خدمات المشروع (project_services) مع ما اختاره المستخدم الآن: حذف ما أُزيل، وإضافة ما استُجدّ فقط
      const keyOf = (s: { category: string; service_key: string }) => `${s.category}::${s.service_key}`;
      const originalKeys = new Set(services.map(keyOf));
      const pickedKeys = new Set(pickedServices.map(keyOf));

      const toRemove = services.filter((s) => !pickedKeys.has(keyOf(s)));
      const toAdd = pickedServices.filter((s) => !originalKeys.has(keyOf(s)));

      if (toRemove.length) {
        await supabase.from("project_services").delete().in("id", toRemove.map((s) => s.id));
      }
      if (toAdd.length) {
        await supabase.from("project_services").insert(
          toAdd.map((s) => ({
            project_id: project.id,
            company_id: companyId,
            category: s.category,
            service_key: s.service_key,
            label: s.label,
            is_custom: s.is_custom,
          }))
        );
      }

      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر حفظ التغييرات");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 640, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>إعدادات المشروع</h2>
          <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 18 }}>
          {(
            [
              { key: "info", label: "معلومات عامة" },
              { key: "clients", label: `العملاء (${projectClients.length})` },
            ] as { key: DrawerTab; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              className="btn-ghost"
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 14px",
                borderRadius: 0,
                borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
                color: tab === t.key ? "var(--gold)" : "var(--text-secondary)",
                fontWeight: tab === t.key ? 700 : 500,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div className="btn-danger" style={{ display: "block", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>صورة الغلاف</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 120,
                    height: 76,
                    borderRadius: 10,
                    flexShrink: 0,
                    border: "1px solid var(--border)",
                    background: project.cover_image_url
                      ? `center/cover no-repeat url(${project.cover_image_url})`
                      : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {!project.cover_image_url && <Icon name="image" size={20} className="text-muted" />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="btn btn-outline" style={{ cursor: coverUploading ? "wait" : "pointer", width: "fit-content" }}>
                    <Icon name="upload" size={14} /> {coverUploading ? "جارٍ الرفع..." : project.cover_image_url ? "تغيير الصورة" : "إضافة صورة"}
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={coverUploading}
                      onChange={(e) => uploadCover(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {project.cover_image_url && (
                    <button className="btn btn-ghost" style={{ width: "fit-content", padding: "6px 10px", fontSize: 12, color: "#ef4444" }} onClick={removeCover}>
                      <Icon name="trash" size={13} /> إزالة الصورة
                    </button>
                  )}
                  {coverError && <p style={{ fontSize: 12, color: "#ef4444" }}>{coverError}</p>}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>العميل</label>
                <select className="input-field" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">بدون عميل</option>
                  {companyClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>نوع المشروع</label>
                <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">—</option>
                  {PROJECT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                  <option value="other">أخرى</option>
                </select>
              </div>
            </div>
            {type === "other" && (
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>وصف النوع المخصص</label>
                <input className="input-field" value={customType} onChange={(e) => setCustomType(e.target.value)} />
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>تسمية عناصر المشروع (حلقات/فيديوهات/عناصر/تسمية مخصّصة)</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: itemNounKey === "custom" ? 8 : 0 }}>
                {ITEM_NOUN_OPTIONS.map((c) => {
                  const active = itemNounKey === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setItemNounKey(c.value)}
                      className="chip"
                      style={{
                        cursor: "pointer",
                        color: active ? "var(--gold)" : "var(--text-secondary)",
                        borderColor: active ? "var(--gold)" : "var(--border)",
                        background: active ? "rgba(var(--gold-rgb),0.1)" : "var(--bg-hover)",
                        padding: "6px 14px",
                        fontSize: 13,
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              {itemNounKey === "custom" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input-field" placeholder="المفرد (مثال: بودكاست)" value={customSingular} onChange={(e) => setCustomSingular(e.target.value)} />
                  <input className="input-field" placeholder="الجمع (مثال: حلقات البودكاست)" value={customPlural} onChange={(e) => setCustomPlural(e.target.value)} />
                </div>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>وصف مختصر للمشروع</label>
              <textarea className="input-field" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>تاريخ التصوير</label>
                <input type="date" className="input-field" value={shootingDate} onChange={(e) => setShootingDate(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>تاريخ التسليم</label>
                <input type="date" className="input-field" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>الميزانية</label>
                <input type="number" className="input-field" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>الموقع</label>
                <input className="input-field" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>رابط التخزين</label>
              <input className="input-field" value={storageLink} onChange={(e) => setStorageLink(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>ملاحظات المشروع</label>
              <textarea className="input-field" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: "vertical" }} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>الخدمات المتفق عليها</label>
              <ServicesPicker value={pickedServices} onChange={setPickedServices} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <button className="btn btn-gold" onClick={saveInfo} disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </button>
            </div>
          </div>
        )}

        {tab === "clients" && <ClientsTab projectId={project.id} initialClients={projectClients} onRefresh={onClientsChanged} />}
      </div>
    </div>
  );
}
