"use client";

import { useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import VideoWithMuteToggle from "@/app/components/ui/VideoWithMuteToggle";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import type { BehindScenesMediaItem, BehindScenesMediaType } from "@/app/lib/types";

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
  const [clientUserId, setClientUserId] = useState(existing?.client_user_id ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
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

  async function submit() {
    if (!clientUserId) {
      setError("اختر العميل الذي تريد إرسال الإعلان إليه.");
      return;
    }
    if (!title.trim() && media.length === 0) {
      setError("أضف عنواناً أو وسائط على الأقل.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const selected = clientAccounts.find((c) => c.clientUserId === clientUserId);

    if (isEditing && existing) {
      const { error: updateError } = await supabase
        .from("client_announcements")
        .update({ title: title.trim() || null, media })
        .eq("id", existing.id);
      setBusy(false);
      if (updateError) {
        setError("تعذّر حفظ التعديلات، حاول مرة أخرى.");
        return;
      }
      onSaved();
      return;
    }

    const { error: insertError } = await supabase.from("client_announcements").insert({
      company_id: companyId,
      client_user_id: clientUserId,
      client_id: selected?.clientId ?? null,
      title: title.trim() || null,
      media,
      created_by: profile.id,
    });
    setBusy(false);
    if (insertError) {
      setError("تعذّر إنشاء الإعلان، حاول مرة أخرى.");
      return;
    }
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal-content" style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Icon name="megaphone" size={20} className="nav-icon" />
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>{isEditing ? "تعديل الإعلان" : "إنشاء إعلان جديد"}</h3>
        </div>

        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>إرسال إلى</label>
        <select className="input-field" value={clientUserId} onChange={(e) => setClientUserId(e.target.value)} disabled={isEditing} style={{ marginBottom: 14 }}>
          <option value="">اختر عميلاً...</option>
          {clientAccounts.map((c) => (
            <option key={c.clientUserId} value={c.clientUserId}>
              {c.name}
              {c.email ? ` — ${c.email}` : ""}
            </option>
          ))}
        </select>

        <input className="input-field" placeholder="عنوان الإعلان" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 14 }} />

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
            {busy ? "جارٍ الحفظ..." : isEditing ? "حفظ التعديلات" : "إنشاء وإرسال"}
          </button>
        </div>
      </div>
    </div>
  );
}
