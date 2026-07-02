"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { PROJECT_TYPES } from "@/app/lib/constants";
import type { ClientRecord } from "@/app/lib/types";
import ServicesPicker, { type PickedService } from "./ServicesPicker";

interface Props {
  clients: Pick<ClientRecord, "id" | "name" | "email" | "phone">[];
  onClose: () => void;
}

type ClientMode = "existing" | "new";

export default function ProjectFormModal({ clients, onClose }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { userId, company } = useSession();
  const companyId = company!.id;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // step 1
  const [type, setType] = useState<string>("");
  const [customType, setCustomType] = useState("");

  // step 2
  const [name, setName] = useState("");
  const [clientMode, setClientMode] = useState<ClientMode>(clients.length ? "existing" : "new");
  const [clientId, setClientId] = useState<string>("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [shootingDate, setShootingDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [storageLink, setStorageLink] = useState("");
  const [notes, setNotes] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // step 3
  const [services, setServices] = useState<PickedService[]>([]);

  function pickCover(file: File | null) {
    setCoverFile(file);
    if (file) setCoverPreview(URL.createObjectURL(file));
    else setCoverPreview(null);
  }

  const canNext1 = type !== "" && (type !== "other" || customType.trim() !== "");
  const canNext2 =
    name.trim() !== "" &&
    (clientMode === "existing" ? clientId !== "" : newClientName.trim() !== "");

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      // 1) عميل: إمّا موجود أو ننشئه
      let finalClientId: string | null = null;
      if (clientMode === "existing") {
        finalClientId = clientId || null;
      } else if (newClientName.trim()) {
        const { data: created, error: cErr } = await supabase
          .from("clients")
          .insert({
            company_id: companyId,
            name: newClientName.trim(),
            email: newClientEmail.trim() || null,
            phone: newClientPhone.trim() || null,
            created_by: userId,
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        finalClientId = created.id;
      }

      // 2) صورة الغلاف (اختياري)
      let coverUrl: string | null = null;
      if (coverFile) {
        const path = `${companyId}/covers/${crypto.randomUUID()}-${coverFile.name}`;
        const { error: upErr } = await supabase.storage.from("public-assets").upload(path, coverFile, { upsert: false });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("public-assets").getPublicUrl(path);
          coverUrl = pub.publicUrl;
        }
      }

      // 3) إنشاء المشروع
      const { data: project, error: pErr } = await supabase
        .from("projects")
        .insert({
          company_id: companyId,
          client_id: finalClientId,
          created_by: userId,
          name: name.trim(),
          type,
          custom_type: type === "other" ? customType.trim() : null,
          status: "planning",
          cover_image_url: coverUrl,
          shooting_date: shootingDate || null,
          delivery_date: deliveryDate || null,
          budget: budget ? Number(budget) : null,
          location: location.trim() || null,
          storage_link: storageLink.trim() || null,
          notes: notes.trim() || null,
        })
        .select("id")
        .single();
      if (pErr) throw pErr;

      // 4) خدمات المشروع
      if (services.length) {
        const rows = services.map((s) => ({
          project_id: project.id,
          company_id: companyId,
          category: s.category,
          service_key: s.service_key,
          label: s.label,
          is_custom: s.is_custom,
        }));
        await supabase.from("project_services").insert(rows);
      }

      // 5) سجل النشاط
      await logActivity(supabase, {
        companyId,
        projectId: project.id,
        action: "project_created",
        details: { name: name.trim(), type },
      });

      router.push(`/projects/${project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر إنشاء المشروع");
      setSaving(false);
    }
  }

  const steps = ["نوع المشروع", "التفاصيل", "الخدمات"];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>مشروع جديد</h2>
          <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          {steps.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  className="progress-bar"
                  style={{ background: active || done ? "var(--gold)" : "var(--border)", height: 3 }}
                />
                <span style={{ fontSize: 11, color: active ? "var(--gold)" : "var(--text-muted)", fontWeight: active ? 700 : 500 }}>
                  {n}. {label}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="btn-danger" style={{ display: "block", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {PROJECT_TYPES.map((t) => {
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    className="card"
                    onClick={() => setType(t.value)}
                    style={{
                      padding: "18px 12px",
                      cursor: "pointer",
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 600,
                      borderColor: active ? "var(--gold)" : "var(--border)",
                      background: active ? "rgba(201,168,76,0.1)" : "var(--bg-card)",
                      color: active ? "var(--gold)" : "var(--text-primary)",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            {type === "other" && (
              <input
                className="input-field"
                placeholder="اكتب نوع المشروع..."
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                style={{ marginTop: 12 }}
              />
            )}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="اسم المشروع *">
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: حملة إعلانية — الصيف" />
            </Field>

            <Field label="العميل *">
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {clients.length > 0 && (
                  <button
                    type="button"
                    className={clientMode === "existing" ? "btn btn-gold" : "btn btn-outline"}
                    onClick={() => setClientMode("existing")}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    عميل موجود
                  </button>
                )}
                <button
                  type="button"
                  className={clientMode === "new" ? "btn btn-gold" : "btn btn-outline"}
                  onClick={() => setClientMode("new")}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  عميل جديد
                </button>
              </div>
              {clientMode === "existing" ? (
                <select className="input-field" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">— اختر عميلاً —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input className="input-field" placeholder="اسم العميل *" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="input-field" placeholder="البريد الإلكتروني" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} />
                    <input className="input-field" placeholder="الهاتف" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
                  </div>
                </div>
              )}
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="تاريخ التصوير">
                <input type="date" className="input-field" value={shootingDate} onChange={(e) => setShootingDate(e.target.value)} />
              </Field>
              <Field label="تاريخ التسليم">
                <input type="date" className="input-field" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="الميزانية (ر.س)">
                <input type="number" className="input-field" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" />
              </Field>
              <Field label="الموقع">
                <input className="input-field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="المدينة / الموقع" />
              </Field>
            </div>

            <Field label="رابط التخزين">
              <input className="input-field" value={storageLink} onChange={(e) => setStorageLink(e.target.value)} placeholder="https://" />
            </Field>

            <Field label="ملاحظات">
              <textarea className="input-field" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: "vertical" }} />
            </Field>

            <Field label="صورة الغلاف">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {coverPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="غلاف" style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 8 }} />
                )}
                <label className="btn btn-outline" style={{ cursor: "pointer" }}>
                  <Icon name="upload" size={14} /> اختر صورة
                  <input type="file" accept="image/*" hidden onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
                </label>
                {coverFile && (
                  <button type="button" className="btn-ghost" style={{ padding: 6 }} onClick={() => pickCover(null)}>
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
            </Field>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && <ServicesPicker value={services} onChange={setServices} />}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 22 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            disabled={saving}
          >
            {step === 1 ? "إلغاء" : "السابق"}
          </button>

          {step < 3 ? (
            <button
              type="button"
              className="btn btn-gold"
              disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
              style={{ opacity: (step === 1 && !canNext1) || (step === 2 && !canNext2) ? 0.5 : 1 }}
              onClick={() => setStep(step + 1)}
            >
              التالي <Icon name="arrowLeft" size={16} />
            </button>
          ) : (
            <button type="button" className="btn btn-gold" disabled={saving} onClick={handleCreate}>
              {saving ? "جارٍ الإنشاء..." : "إنشاء المشروع"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
