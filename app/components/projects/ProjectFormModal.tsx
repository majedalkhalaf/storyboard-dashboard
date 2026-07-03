"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { PROJECT_TYPES, DEFAULT_EPISODE_STAGES } from "@/app/lib/constants";
import { inferCategory, humanFileSize } from "@/app/components/projects/utils";
import type { ClientRecord } from "@/app/lib/types";
import ServicesPicker, { type PickedService } from "./ServicesPicker";

interface Props {
  clients: Pick<ClientRecord, "id" | "name" | "email" | "phone">[];
  onClose: () => void;
}

type ClientMode = "existing" | "new";
type ContentKind = "episodes" | "videos" | "images" | "items";

const TYPE_META: Record<string, { icon: IconName; description: string }> = {
  podcast: { icon: "mic", description: "إنتاج محتوى صوتي مرئي" },
  commercial_ad: { icon: "megaphone", description: "فيديو إعلاني للمنتجات والخدمات" },
  product_photography: { icon: "equipment", description: "تصوير منتجات احترافي" },
  real_estate: { icon: "home", description: "تصوير داخلي وخارجي للعقارات" },
  youtube_video: { icon: "youtube", description: "محتوى يوتيوب احترافي" },
  reels: { icon: "sparkles", description: "مقاطع قصيرة لمنصات التواصل" },
  event_coverage: { icon: "calendarView", description: "تغطية وتصوير الفعاليات" },
  corporate_video: { icon: "company", description: "فيديو تعريفي للشركات" },
  documentary: { icon: "episodes", description: "أفلام وثائقية وتقارير" },
  brand_identity: { icon: "palette", description: "تصميم هوية بصرية متكاملة" },
  motion_graphics: { icon: "wand", description: "رسوم متحركة وموشن جرافيك" },
  other: { icon: "plus", description: "نوع مشروع مخصص" },
};

const CONTENT_KIND_OPTIONS: { key: ContentKind; label: string; countLabel: string; titlePrefix: string }[] = [
  { key: "episodes", label: "حلقات", countLabel: "عدد الحلقات", titlePrefix: "الحلقة" },
  { key: "videos", label: "فيديوهات", countLabel: "عدد الفيديوهات", titlePrefix: "الفيديو" },
  { key: "images", label: "صور", countLabel: "عدد الصور", titlePrefix: "الصورة" },
  { key: "items", label: "عناصر", countLabel: "عدد العناصر", titlePrefix: "العنصر" },
];

const STEP_LABELS = ["نوع المشروع", "المعلومات الأساسية", "الخدمات", "المراجعة والإنشاء"];

export default function ProjectFormModal({ clients, onClose }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { userId, company } = useSession();
  const companyId = company!.id;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

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
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [initialFiles, setInitialFiles] = useState<File[]>([]);
  const [contentKind, setContentKind] = useState<ContentKind | "">("");
  const [contentCount, setContentCount] = useState(0);

  // step 3
  const [services, setServices] = useState<PickedService[]>([]);

  function pickCover(file: File | null) {
    if (file && file.size > 20 * 1024 * 1024) {
      setError("حجم صورة الغلاف كبير جداً (الحد الأقصى 20 ميجابايت)");
      return;
    }
    setError(null);
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  }

  function addInitialFiles(fileList: FileList | null) {
    if (!fileList) return;
    setInitialFiles((prev) => [...prev, ...Array.from(fileList)]);
  }

  function removeInitialFile(index: number) {
    setInitialFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const typeLabel = type === "other" ? customType.trim() || "أخرى" : PROJECT_TYPES.find((t) => t.value === type)?.label ?? "";
  const canNext1 = type !== "" && (type !== "other" || customType.trim() !== "");
  const canNext2 = name.trim() !== "" && (clientMode === "existing" ? clientId !== "" : newClientName.trim() !== "");
  const canSaveDraft = name.trim() !== "";

  function goNext() {
    setTouched(true);
    if (step === 1 && !canNext1) return;
    if (step === 2 && !canNext2) return;
    setTouched(false);
    setStep((s) => Math.min(4, s + 1));
  }

  function goBack() {
    setTouched(false);
    if (step === 1) {
      onClose();
    } else {
      setStep((s) => s - 1);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      if (step < 4) {
        e.preventDefault();
        goNext();
      }
    }
  }

  async function persistProject(): Promise<string> {
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
      if (upErr) throw new Error(`تعذّر رفع صورة الغلاف: ${upErr.message}`);
      coverUrl = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
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
        location: location.trim() || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();
    if (pErr) throw pErr;
    const projectId = project.id as string;

    // 4) خدمات المشروع
    if (services.length) {
      await supabase.from("project_services").insert(
        services.map((s) => ({
          project_id: projectId,
          company_id: companyId,
          category: s.category,
          service_key: s.service_key,
          label: s.label,
          is_custom: s.is_custom,
        }))
      );
    }

    // 5) إنشاء الحلقات/الفيديوهات/الصور/العناصر تلقائياً حسب نوع المحتوى المختار
    if (contentKind && contentCount > 0) {
      const meta = CONTENT_KIND_OPTIONS.find((c) => c.key === contentKind)!;
      for (let i = 0; i < contentCount; i++) {
        const { data: episode, error: eErr } = await supabase
          .from("episodes")
          .insert({
            project_id: projectId,
            company_id: companyId,
            number: i + 1,
            title: `${meta.titlePrefix} ${i + 1}`,
            type: contentKind,
            status: "not_started",
            sort_order: i,
            created_by: userId,
          })
          .select("id")
          .single();
        if (eErr || !episode) continue;
        const stageRows = DEFAULT_EPISODE_STAGES.map((s, si) => ({
          episode_id: episode.id,
          company_id: companyId,
          key: s.key,
          label: s.label,
          status: "pending" as const,
          progress: 0,
          sort_order: si,
        }));
        await supabase.from("episode_stages").insert(stageRows);
      }
    }

    // 6) رفع الملفات الأولية (اختياري) — بعد إنشاء المشروع لأن files تحتاج project_id
    for (const file of initialFiles) {
      const path = `${companyId}/${projectId}/${crypto.randomUUID()}-${file.name}`;
      const { error: fUpErr } = await supabase.storage.from("project-files").upload(path, file, { upsert: false });
      if (fUpErr) continue;
      await supabase.from("files").insert({
        company_id: companyId,
        project_id: projectId,
        episode_id: null,
        uploaded_by: userId,
        name: file.name,
        storage_path: path,
        file_type: file.type || null,
        category: inferCategory(file.type, file.name),
        size_bytes: file.size,
        client_visible: true,
      });
    }

    // 7) سجل النشاط
    await logActivity(supabase, {
      companyId,
      projectId,
      action: "project_created",
      details: { name: name.trim(), type },
    });

    return projectId;
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const projectId = await persistProject();
      router.push(`/projects/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر إنشاء المشروع");
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    if (!canSaveDraft) return;
    setSavingDraft(true);
    setError(null);
    try {
      const projectId = await persistProject();
      router.push(`/projects/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر حفظ المسودة");
      setSavingDraft(false);
    }
  }

  const busy = saving || savingDraft;

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal-content" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>مشروع جديد</h2>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>إنشاء مشروع إنتاج جديد بإعدادات احترافية</p>
          </div>
          <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose} disabled={busy}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", gap: 8, margin: "18px 0 22px" }}>
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="progress-bar" style={{ background: active || done ? "var(--gold)" : "var(--border)", height: 3 }} />
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

        {/* Step 1: نوع المشروع */}
        {step === 1 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
              {PROJECT_TYPES.map((t) => {
                const active = type === t.value;
                const meta = TYPE_META[t.value];
                return (
                  <button
                    key={t.value}
                    type="button"
                    className="card"
                    onClick={() => setType(t.value)}
                    style={{
                      padding: 16,
                      cursor: "pointer",
                      textAlign: "right",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      borderColor: active ? "var(--gold)" : "var(--border)",
                      background: active ? "rgba(var(--gold-rgb),0.08)" : "var(--bg-card)",
                    }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: active ? "var(--gold)" : "rgba(var(--gold-rgb),0.12)",
                        color: active ? "#090909" : "var(--gold)",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={meta?.icon ?? "projects"} size={17} />
                    </span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: active ? "var(--gold)" : "var(--text-primary)" }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{meta?.description}</div>
                    </div>
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
                autoFocus
              />
            )}
            {touched && !canNext1 && (
              <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 10 }}>اختر نوع المشروع للمتابعة</p>
            )}
          </div>
        )}

        {/* Step 2: المعلومات الأساسية */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="اسم المشروع *" error={touched && name.trim() === "" ? "اسم المشروع مطلوب" : undefined}>
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: حملة إعلانية — الصيف" autoFocus />
            </Field>

            <Field label="العميل">
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {clients.length > 0 && (
                  <button type="button" className={clientMode === "existing" ? "btn btn-gold" : "btn btn-outline"} onClick={() => setClientMode("existing")} style={{ flex: 1, justifyContent: "center" }}>
                    عميل موجود
                  </button>
                )}
                <button type="button" className={clientMode === "new" ? "btn btn-gold" : "btn btn-outline"} onClick={() => setClientMode("new")} style={{ flex: 1, justifyContent: "center" }}>
                  <Icon name="plus" size={14} /> إنشاء عميل جديد
                </button>
              </div>
              {clientMode === "existing" ? (
                <select className="input-field" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">— اختر عميلاً —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
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
              {touched && !canNext2 && (
                <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>حدد عميلاً أو أدخل اسم عميل جديد</p>
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

            <Field label="موقع التنفيذ">
              <input className="input-field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="المدينة / الموقع" />
            </Field>

            <Field label="نوع المحتوى">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: contentKind ? 10 : 0 }}>
                {CONTENT_KIND_OPTIONS.map((c) => {
                  const active = contentKind === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => {
                        setContentKind(active ? "" : c.key);
                        if (!active && contentCount === 0) setContentCount(1);
                      }}
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
              {contentKind && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                    {CONTENT_KIND_OPTIONS.find((c) => c.key === contentKind)?.countLabel}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    <button type="button" className="btn btn-outline" style={{ padding: "6px 10px" }} onClick={() => setContentCount((n) => Math.max(0, n - 1))}>
                      <Icon name="minus" size={14} />
                    </button>
                    <span style={{ width: 44, textAlign: "center", fontWeight: 700, fontSize: 15 }}>{contentCount}</span>
                    <button type="button" className="btn btn-outline" style={{ padding: "6px 10px" }} onClick={() => setContentCount((n) => Math.min(99, n + 1))}>
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>يمكنك تعديل العدد لاحقاً من داخل المشروع</span>
                </div>
              )}
            </Field>

            <Field label="وصف مختصر للمشروع">
              <textarea className="input-field" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} placeholder="نبذة سريعة عن المشروع وأهدافه..." />
            </Field>

            <Field label="صورة المشروع">
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

            <Field label="رفع ملفات أولية">
              <label className="btn btn-outline" style={{ cursor: "pointer", width: "fit-content" }}>
                <Icon name="upload" size={14} /> اختر ملفات
                <input type="file" multiple hidden onChange={(e) => addInitialFiles(e.target.files)} />
              </label>
              {initialFiles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {initialFiles.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, background: "var(--bg-hover)", padding: "6px 10px", borderRadius: 6 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ color: "var(--text-muted)" }}>{humanFileSize(f.size)}</span>
                        <button type="button" onClick={() => removeInitialFile(i)} className="btn-ghost" style={{ padding: 2 }}>
                          <Icon name="close" size={12} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Field>

            <Field label="ملاحظات عامة">
              <textarea className="input-field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: "vertical" }} />
            </Field>
          </div>
        )}

        {/* Step 3: الخدمات */}
        {step === 3 && <ServicesPicker value={services} onChange={setServices} />}

        {/* Step 4: المراجعة والإنشاء */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>ملخص المشروع</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                <SummaryRow label="نوع المشروع" value={typeLabel} />
                <SummaryRow label="اسم المشروع" value={name} />
                <SummaryRow label="العميل" value={clientMode === "existing" ? clients.find((c) => c.id === clientId)?.name ?? "—" : newClientName || "—"} />
                <SummaryRow label="تاريخ التصوير" value={shootingDate || "—"} />
                <SummaryRow label="تاريخ التسليم" value={deliveryDate || "—"} />
                <SummaryRow
                  label={contentKind ? CONTENT_KIND_OPTIONS.find((c) => c.key === contentKind)?.countLabel ?? "" : "عدد المحتوى"}
                  value={contentKind ? String(contentCount) : "—"}
                />
                <SummaryRow label="عدد الخدمات المختارة" value={String(services.length)} />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>سيتم إنشاء العناصر التالية تلقائياً</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                {autoCreatedItems(contentKind).map((it) => (
                  <div key={it.label} className="card" style={{ padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
                    <Icon name={it.icon} size={17} className="text-muted" />
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{it.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 22 }}>
          <button type="button" className="btn btn-ghost" onClick={goBack} disabled={busy}>
            {step === 1 ? "إلغاء" : "رجوع"}
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            {canSaveDraft && step > 1 && (
              <button type="button" className="btn btn-outline" onClick={handleSaveDraft} disabled={busy}>
                {savingDraft ? "جارٍ الحفظ..." : "حفظ كمسودة"}
              </button>
            )}
            {step < 4 ? (
              <button type="button" className="btn btn-gold" onClick={goNext} disabled={busy}>
                التالي <Icon name="arrowLeft" size={16} />
              </button>
            ) : (
              <button type="button" className="btn btn-gold" disabled={busy} onClick={handleCreate}>
                {saving ? "جارٍ الإنشاء..." : "إنشاء المشروع"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function autoCreatedItems(contentKind: ContentKind | ""): { icon: IconName; label: string }[] {
  const contentLabel = CONTENT_KIND_OPTIONS.find((c) => c.key === contentKind)?.label ?? "الحلقات أو الفيديوهات";
  return [
    { icon: "grid", label: "لوحة المشروع" },
    { icon: "episodes", label: contentLabel },
    { icon: "files", label: "الملفات" },
    { icon: "tasks", label: "مراحل التنفيذ" },
    { icon: "message", label: "الملاحظات" },
    { icon: "finance", label: "المالية" },
    { icon: "contracts", label: "العقود" },
    { icon: "proposals", label: "العروض التجارية" },
    { icon: "invoices", label: "الفواتير" },
    { icon: "payments", label: "المدفوعات" },
    { icon: "export", label: "التقارير" },
    { icon: "clients", label: "صفحة العميل" },
  ];
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 5 }}>{error}</p>}
    </div>
  );
}
