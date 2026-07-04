"use client";

import { useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import ModalPortal from "@/app/components/ui/ModalPortal";
import VideoWithMuteToggle from "@/app/components/ui/VideoWithMuteToggle";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { CLIENT_INVITE_DURATIONS } from "@/app/lib/client-invite-catalog";
import { formatDate } from "@/app/components/client/utils";
import type { BehindScenesMediaItem, BehindScenesMediaType } from "@/app/lib/types";

const DEFAULT_CTA_LABEL = "عرض";

export interface ClientAccountOption {
  clientUserId: string;
  clientId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface AnnouncementRow {
  id: string;
  company_id: string;
  client_user_id: string;
  client_id: string | null;
  title: string | null;
  media: BehindScenesMediaItem[];
  duration_days: number | null;
  expires_at: string | null;
  cta_label: string;
  created_at: string;
  updated_at: string;
  clientName: string;
}

function mediaType(file: File): BehindScenesMediaType {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

// قسم "إعلان للعميل" — مستقل تماماً عن المشروع والحلقة. كل إعلان مرتبط بحساب
// دخول عميل محدد (وليس بمشروع)، ويظهر له كبطاقة خاصة في الصفحة الرئيسية
// لبوابته، مع إمكانية مشاركته مباشرة عبر واتساب (تلقائياً إن كان واتساب بزنس
// API مُعدّاً للشركة، وإلا رابط wa.me جاهز يفتحه المستخدم بنفسه).
export default function AnnouncementsManager({
  companyId,
  clientAccounts,
  initialAnnouncements,
}: {
  companyId: string;
  clientAccounts: ClientAccountOption[];
  initialAnnouncements: AnnouncementRow[];
}) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [composerTarget, setComposerTarget] = useState<"new" | AnnouncementRow | null>(null);

  async function reload() {
    const supabase = createClient();
    const { data } = await supabase
      .from("client_announcements")
      .select("*, profile:profiles!client_user_id(full_name), client:clients(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
    const rows: AnnouncementRow[] = ((data ?? []) as Record<string, unknown>[]).map((a) => {
      const profile = one<{ full_name: string | null }>(a.profile as never);
      const client = one<{ name: string | null }>(a.client as never);
      return {
        id: a.id as string,
        company_id: a.company_id as string,
        client_user_id: a.client_user_id as string,
        client_id: (a.client_id as string) ?? null,
        title: (a.title as string) ?? null,
        media: a.media as BehindScenesMediaItem[],
        duration_days: (a.duration_days as number) ?? null,
        expires_at: (a.expires_at as string) ?? null,
        cta_label: (a.cta_label as string) || DEFAULT_CTA_LABEL,
        created_at: a.created_at as string,
        updated_at: a.updated_at as string,
        clientName: profile?.full_name || client?.name || "عميل",
      };
    });
    setAnnouncements(rows);
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm("حذف هذا الإعلان نهائياً؟")) return;
    const supabase = createClient();
    await supabase.from("client_announcements").delete().eq("id", id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            إعلان للعميل
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>أرسل إعلاناً خاصاً لعميل محدد — يظهر له كبطاقة مميزة في الصفحة الرئيسية لبوابته.</p>
        </div>
        <button className="btn btn-gold" onClick={() => setComposerTarget("new")}>
          <Icon name="plus" size={16} /> إنشاء إعلان جديد
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="card empty-state">
          <Icon name="megaphone" size={36} className="nav-icon" />
          <p style={{ marginTop: 12, fontSize: 14 }}>لا توجد إعلانات مُرسلة بعد.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {announcements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} onEdit={() => setComposerTarget(a)} onDelete={() => deleteAnnouncement(a.id)} />
          ))}
        </div>
      )}

      {composerTarget && (
        <AnnouncementComposer
          companyId={companyId}
          clientAccounts={clientAccounts}
          existing={composerTarget === "new" ? null : composerTarget}
          onClose={() => setComposerTarget(null)}
          onSaved={() => {
            setComposerTarget(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function AnnouncementCard({ announcement, onEdit, onDelete }: { announcement: AnnouncementRow; onEdit: () => void; onDelete: () => void }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function shareOnWhatsapp() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/announcements/notify-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: announcement.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult(json.error || "تعذّر التحضير للمشاركة");
        return;
      }
      if (json.sentAutomatically) {
        setResult("تم إرسال الرسالة تلقائياً عبر واتساب ✓");
      } else if (json.whatsappLink) {
        window.open(json.whatsappLink, "_blank", "noopener,noreferrer");
        setResult("افتح واتساب لإكمال الإرسال يدوياً");
      } else {
        setResult("لا يوجد رقم جوال مسجّل لهذا العميل");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 2 }}>إلى: {announcement.clientName}</div>
          <div style={{ fontSize: 14.5, fontWeight: 800 }}>{announcement.title || "إعلان بلا عنوان"}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
            {announcement.expires_at ? `ينتهي عرضه في ${formatDate(announcement.expires_at)}` : "عرض غير محدود"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button className="btn btn-ghost" style={{ padding: "4px 6px" }} onClick={onEdit} aria-label="تعديل">
            <Icon name="edit" size={14} className="text-muted" />
          </button>
          <button className="btn btn-ghost" style={{ padding: "4px 6px" }} onClick={onDelete} aria-label="حذف">
            <Icon name="trash" size={14} className="text-muted" />
          </button>
        </div>
      </div>

      {announcement.media.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(announcement.media.length, 4)}, 1fr)`, gap: 5 }}>
          {announcement.media.slice(0, 4).map((m) =>
            m.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m.url} src={m.url} alt={m.name} style={{ width: "100%", height: 60, objectFit: "cover", borderRadius: 6, background: "#000" }} />
            ) : (
              <div key={m.url} style={{ width: "100%", height: 60, borderRadius: 6, background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={m.type === "video" ? "video" : "mic"} size={16} className="nav-icon" />
              </div>
            )
          )}
        </div>
      )}

      <button className="btn" style={{ fontSize: 12.5, background: "#25D366", color: "#fff", justifyContent: "center" }} onClick={shareOnWhatsapp} disabled={sending}>
        <Icon name="phone" size={14} /> {sending ? "جارٍ التحضير..." : "مشاركة عبر واتساب"}
      </button>
      {result && <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{result}</div>}
    </div>
  );
}

function AnnouncementComposer({
  companyId,
  clientAccounts,
  existing,
  onClose,
  onSaved,
}: {
  companyId: string;
  clientAccounts: ClientAccountOption[];
  existing: AnnouncementRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useSession();
  const isEditing = Boolean(existing);
  const [selectedIds, setSelectedIds] = useState<string[]>(existing ? [existing.client_user_id] : []);
  const [clientQuery, setClientQuery] = useState("");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [ctaLabel, setCtaLabel] = useState(existing?.cta_label ?? DEFAULT_CTA_LABEL);
  const [durationDays, setDurationDays] = useState<number | null>(existing ? existing.duration_days : 30);
  const [media, setMedia] = useState<BehindScenesMediaItem[]>(existing?.media ?? []);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(fileList: FileList | File[]) {
    const supabase = createClient();
    for (const file of Array.from(fileList)) {
      setUploadingCount((c) => c + 1);
      try {
        const type = mediaType(file);
        const path = `${companyId}/announcements/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("public-assets").upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (uploadError) {
          setError("تعذّر رفع أحد الملفات");
          continue;
        }
        const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
        setMedia((prev) => [...prev, { type, url: data.publicUrl, name: file.name }]);
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }
  }

  function removeMedia(url: string) {
    setMedia((prev) => prev.filter((m) => m.url !== url));
  }

  const filteredClients = clientAccounts.filter((c) => {
    const q = clientQuery.trim().toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q);
  });
  const allFilteredSelected = filteredClients.length > 0 && filteredClients.every((c) => selectedIds.includes(c.clientUserId));

  function toggleClient(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredClients.map((c) => c.clientUserId));
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredClients.map((c) => c.clientUserId)])));
    }
  }

  async function submit() {
    if (selectedIds.length === 0) {
      setError("اختر عميلاً واحداً على الأقل لإرسال الإعلان إليه.");
      return;
    }
    if (!title.trim() && media.length === 0) {
      setError("أضف عنواناً أو وسائط على الأقل.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    // إعادة حساب تاريخ الانتهاء فقط عند إنشاء إعلان جديد أو عند تغيير المدة فعلياً
    // أثناء التعديل — كي لا يُعاد ضبط عدّاد الأيام من الصفر بمجرد تعديل العنوان فقط.
    const durationChanged = !isEditing || durationDays !== (existing?.duration_days ?? null);
    const expiresAt = durationChanged ? (durationDays ? new Date(Date.now() + durationDays * 86400000).toISOString() : null) : (existing?.expires_at ?? null);
    const ctaLabelToSave = ctaLabel.trim() || DEFAULT_CTA_LABEL;

    if (isEditing && existing) {
      const { error: updateError } = await supabase
        .from("client_announcements")
        .update({ title: title.trim() || null, media, duration_days: durationDays, expires_at: expiresAt, cta_label: ctaLabelToSave })
        .eq("id", existing.id);
      setBusy(false);
      if (updateError) {
        setError("تعذّر حفظ التعديلات، حاول مرة أخرى.");
        return;
      }
      onSaved();
      return;
    }

    // إعلان مستقل لكل عميل مُحدَّد — نفس العنوان/الوسائط/المدة، بصفوف منفصلة
    // (لا يوجد مفهوم "إعلان جماعي" في قاعدة البيانات، كل صف مرتبط بعميل واحد).
    const rows = selectedIds.map((id) => {
      const selected = clientAccounts.find((c) => c.clientUserId === id);
      return {
        company_id: companyId,
        client_user_id: id,
        client_id: selected?.clientId ?? null,
        title: title.trim() || null,
        media,
        duration_days: durationDays,
        expires_at: expiresAt,
        cta_label: ctaLabelToSave,
        created_by: profile.id,
      };
    });
    const { error: insertError } = await supabase.from("client_announcements").insert(rows);
    setBusy(false);
    if (insertError) {
      setError("تعذّر إنشاء الإعلان، حاول مرة أخرى.");
      return;
    }
    onSaved();
  }

  return (
    <ModalPortal>
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal-content" style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Icon name="megaphone" size={20} className="nav-icon" />
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>{isEditing ? "تعديل الإعلان" : "إنشاء إعلان جديد"}</h3>
        </div>

        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
          إرسال إلى {!isEditing && selectedIds.length > 0 ? `(${selectedIds.length} محدَّد)` : ""}
        </label>
        {isEditing ? (
          <div className="input-field" style={{ marginBottom: 14, display: "flex", alignItems: "center", color: "var(--text-secondary)" }}>
            {clientAccounts.find((c) => c.clientUserId === existing?.client_user_id)?.name ?? "عميل"}
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>
              <input
                className="input-field"
                placeholder="ابحث عن عميل بالاسم أو البريد..."
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                style={{ fontSize: 12.5 }}
              />
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 12px",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 12.5,
                background: "var(--bg-secondary)",
              }}
            >
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} style={{ accentColor: "var(--gold)" }} />
              تحديد الكل {filteredClients.length > 0 ? `(${filteredClients.length})` : ""}
            </label>
            <div style={{ maxHeight: 190, overflowY: "auto" }}>
              {filteredClients.length === 0 ? (
                <p style={{ padding: 14, fontSize: 12.5, color: "var(--text-muted)", textAlign: "center" }}>لا يوجد عملاء مطابقون</p>
              ) : (
                filteredClients.map((c) => (
                  <label
                    key={c.clientUserId}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", fontSize: 12.5, borderBottom: "1px solid var(--border)" }}
                  >
                    <input type="checkbox" checked={selectedIds.includes(c.clientUserId)} onChange={() => toggleClient(c.clientUserId)} style={{ accentColor: "var(--gold)" }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.name}
                      {c.email ? ` — ${c.email}` : ""}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <input className="input-field" placeholder="عنوان الإعلان" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 14 }} />

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>مدة عرض الإعلان</label>
            <select
              className="input-field"
              value={durationDays === null ? "unlimited" : String(durationDays)}
              onChange={(e) => setDurationDays(e.target.value === "unlimited" ? null : Number(e.target.value))}
            >
              {CLIENT_INVITE_DURATIONS.map((d) => (
                <option key={d.label} value={d.value === null ? "unlimited" : d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>نص زر الدعوة</label>
            <input className="input-field" placeholder={DEFAULT_CTA_LABEL} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? "var(--gold)" : "var(--border)"}`,
            borderRadius: 10,
            padding: 18,
            textAlign: "center",
            cursor: "pointer",
            background: dragActive ? "rgba(var(--gold-rgb),0.06)" : "var(--bg-secondary)",
            marginBottom: 10,
          }}
        >
          <Icon name="fileUp" size={22} className="nav-icon" />
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>اسحب وأفلت صوراً أو فيديو أو تسجيلاً صوتياً، أو اضغط للاختيار</p>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*" hidden onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
        </div>

        {uploadingCount > 0 && <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>جارٍ رفع {uploadingCount} ملف...</p>}

        {media.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {media.map((m) => (
              <div key={m.url} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-secondary)", borderRadius: 8, padding: "6px 10px" }}>
                {m.type === "video" ? (
                  <VideoWithMuteToggle src={m.url} style={{ width: 60, height: 40, borderRadius: 4 }} />
                ) : m.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                ) : (
                  <Icon name="mic" size={14} className="nav-icon" />
                )}
                <span style={{ fontSize: 12.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                <button className="btn btn-ghost" style={{ padding: "3px 6px" }} onClick={() => removeMedia(m.url)} aria-label="حذف">
                  <Icon name="close" size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 10, display: "flex", gap: 6, alignItems: "center" }}>
            <Icon name="alert" size={15} />
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={busy || uploadingCount > 0}>
            <Icon name={isEditing ? "check" : "send"} size={16} />
            {busy
              ? "جارٍ الحفظ..."
              : isEditing
                ? "حفظ التعديلات"
                : selectedIds.length > 1
                  ? `إنشاء وإرسال إلى ${selectedIds.length} عملاء`
                  : "إنشاء وإرسال"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
