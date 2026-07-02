"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import Icon from "@/app/components/ui/Icon";
import type { Profile } from "@/app/lib/types";

export default function ClientSettingsForm({
  profile,
  userSettings,
}: {
  profile: Profile;
  userSettings: { theme: string; language: string; notifications_enabled: boolean };
}) {
  const { theme, toggleTheme } = useSession();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [notifications, setNotifications] = useState(userSettings.notifications_enabled);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleAvatar(file?: File) {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/client-portal/avatar", { method: "POST", body: formData });
    const json = await res.json();
    setUploading(false);
    if (res.ok && json.url) setAvatarUrl(json.url);
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", profile.id);
    await supabase.from("user_settings").upsert({ user_id: profile.id, notifications_enabled: notifications }, { onConflict: "user_id" });
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString("ar"));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
      <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800 }}>
        الإعدادات
      </h1>

      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              margin: "0 auto 8px",
              overflow: "hidden",
              background: "var(--bg-secondary)",
              border: "1px dashed var(--border-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="userPlus" size={26} className="text-muted" />}
          </div>
          <label className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>
            {uploading ? "جارٍ الرفع..." : "تغيير الصورة"}
            <input type="file" accept="image/*" hidden onChange={(e) => handleAvatar(e.target.files?.[0])} disabled={uploading} />
          </label>
        </div>

        <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          الاسم الكامل
          <input className="input-field" style={{ marginTop: 6 }} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          رقم الهاتف
          <input className="input-field" style={{ marginTop: 6 }} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>البريد الإلكتروني: {profile.email}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-gold" onClick={save} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
          {savedAt && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>تم الحفظ {savedAt}</span>}
        </div>
      </div>

      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700 }}>الوضع الداكن / الفاتح</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>الحالي: {theme === "dark" ? "داكن" : "فاتح"}</div>
          </div>
          <button className="btn btn-outline" onClick={toggleTheme}>
            <Icon name={theme === "dark" ? "sun" : "moon"} size={16} /> تبديل
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>الإشعارات</div>
          <button className="btn btn-outline" onClick={() => setNotifications(!notifications)}>
            {notifications ? "مفعّلة" : "مغلقة"}
          </button>
        </div>

        <Link href="/client/change-password" className="btn btn-outline" style={{ justifyContent: "center" }}>
          تغيير كلمة المرور
        </Link>
      </div>
    </div>
  );
}
