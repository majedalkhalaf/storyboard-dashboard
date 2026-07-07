"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { USER_ROLE_LABELS } from "@/app/lib/constants";
import Icon from "@/app/components/ui/Icon";
import type { Profile } from "@/app/lib/types";

type TabKey = "profile" | "security" | "preferences";

async function uploadAvatar(companyId: string, userId: string, file: File): Promise<string | null> {
  const supabase = createClient();
  const path = `${companyId}/avatars/${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
  return data.publicUrl;
}

export default function AccountClient({
  profile,
  companyId,
  email,
  userSettings,
}: {
  profile: Profile;
  companyId: string;
  email: string | null;
  userSettings: { theme: string; language: string; notifications_enabled: boolean };
}) {
  const [tab, setTab] = useState<TabKey>("profile");

  const tabs: { key: TabKey; label: string; icon: "user" | "shield" | "sun" }[] = [
    { key: "profile", label: "الملف الشخصي", icon: "user" },
    { key: "security", label: "الأمان وكلمة المرور", icon: "shield" },
    { key: "preferences", label: "التفضيلات", icon: "sun" },
  ];

  return (
    <div>
      <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
        حسابي
      </h1>

      <div className="settings-layout" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>
        <nav className="settings-nav-mobile" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`sidebar-link settings-nav-item-mobile${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <Icon name={t.icon} size={16} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div>
          {tab === "profile" && <ProfileTab profile={profile} companyId={companyId} email={email} />}
          {tab === "security" && <SecurityTab />}
          {tab === "preferences" && <PreferencesTab userId={profile.id} userSettings={userSettings} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ profile, companyId, email }: { profile: Profile; companyId: string; email: string | null }) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function handleUpload(file?: File) {
    if (!file) return;
    const url = await uploadAvatar(companyId, profile.id, file);
    if (url) setAvatarUrl(url);
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, avatar_url: avatarUrl })
      .eq("id", profile.id);
    setSaving(false);
    if (!error) setSavedAt(new Date().toLocaleTimeString("ar-u-nu-latn"));
  }

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
      <AvatarUploader url={avatarUrl} onFile={handleUpload} />
      <Field label="الاسم الكامل" value={fullName} onChange={setFullName} />
      <Field label="رقم الهاتف" value={phone} onChange={setPhone} />
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
        الدور: {USER_ROLE_LABELS[profile.role] ?? profile.role} · البريد: {email}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-gold" onClick={save} disabled={saving}>
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </button>
        {savedAt && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>تم الحفظ {savedAt}</span>}
      </div>
    </div>
  );
}

function SecurityTab() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("تعذّر تحديث كلمة المرور، حاول مرة أخرى");
      return;
    }
    setPassword("");
    setConfirm("");
    setSuccess(true);
    router.refresh();
  }

  return (
    <div className="card" style={{ padding: 20, maxWidth: 480 }}>
      <h3 style={{ fontWeight: 700, marginBottom: 4 }}>تغيير كلمة المرور</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>اختر كلمة مرور جديدة وقوية لحسابك.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>كلمة المرور الجديدة</label>
          <div style={{ position: "relative" }}>
            <input
              className="input-field"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6 أحرف على الأقل"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="btn btn-ghost"
              style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", padding: 6 }}
              aria-label={show ? "إخفاء" : "إظهار"}
            >
              <Icon name={show ? "eyeOff" : "eye"} size={16} />
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>تأكيد كلمة المرور</label>
          <input
            className="input-field"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="أعد إدخال كلمة المرور"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="alert" size={15} />
            {error}
          </div>
        )}
        {success && (
          <div style={{ color: "#1DB954", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="checkCircle" size={15} />
            تم تحديث كلمة المرور بنجاح
          </div>
        )}

        <button type="submit" className="btn btn-gold" disabled={loading} style={{ justifyContent: "center", marginTop: 4 }}>
          {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
        </button>
      </form>
    </div>
  );
}

function PreferencesTab({
  userId,
  userSettings,
}: {
  userId: string;
  userSettings: { theme: string; language: string; notifications_enabled: boolean };
}) {
  const { theme, toggleTheme } = useSession();
  const [language, setLanguage] = useState(userSettings.language);
  const [notifications, setNotifications] = useState(userSettings.notifications_enabled);

  async function updateSettings(patch: Record<string, unknown>) {
    const supabase = createClient();
    await supabase.from("user_settings").upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  }

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18, maxWidth: 480 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700 }}>الوضع الداكن / الفاتح</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>الحالي: {theme === "dark" ? "داكن" : "فاتح"}</div>
        </div>
        <button className="btn btn-outline" onClick={toggleTheme}>
          <Icon name={theme === "dark" ? "sun" : "moon"} size={16} /> تبديل
        </button>
      </div>

      <div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>اللغة</div>
        <select
          className="input-field"
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            updateSettings({ language: e.target.value });
          }}
        >
          <option value="ar">العربية</option>
          <option value="en">English (قريباً)</option>
        </select>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>الإشعارات</div>
        <button
          className="btn btn-outline"
          onClick={() => {
            const next = !notifications;
            setNotifications(next);
            updateSettings({ notifications_enabled: next });
          }}
        >
          {notifications ? "مفعّلة" : "مغلقة"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
      {label}
      <input className="input-field" style={{ marginTop: 6 }} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function AvatarUploader({ url, onFile }: { url: string | null; onFile: (file?: File) => void }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: "50%",
          border: "1px dashed var(--border-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "var(--bg-secondary)",
          margin: "0 auto 8px",
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="الصورة الشخصية" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Icon name="image" size={22} className="text-muted" />
        )}
      </div>
      <label className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>
        تغيير الصورة
        <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
    </div>
  );
}
