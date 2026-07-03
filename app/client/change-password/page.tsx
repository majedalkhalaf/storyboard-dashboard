"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";

export default function ChangePasswordPage() {
  const { userId, profile } = useSession();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const forced = profile.must_change_password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
    if (updateError) {
      setError("تعذّر تحديث كلمة المرور، حاول مرة أخرى");
      setLoading(false);
      return;
    }

    await supabase.from("profiles").update({ must_change_password: false }).eq("id", userId);
    if (forced) {
      // "قبول" حقيقي للدعوة (قناة واتساب/SMS بكلمة مرور مؤقتة) — أول تغيير فعلي لكلمة
      // المرور الإجبارية، وليس مجرد فتح صفحة. لا يمنع تسجيل الدخول إن فشل هذا التسجيل.
      fetch("/api/invitations/mark-accepted", { method: "POST" }).catch(() => {});
    }

    router.push("/client");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 460, margin: "0 auto" }}>
      <div className="card animate-fade-in" style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Icon name="shield" size={22} className="nav-icon" />
          <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800 }}>
            {forced ? "تعيين كلمة مرور جديدة" : "تغيير كلمة المرور"}
          </h1>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>
          {forced
            ? "مرحباً بك! لحماية حسابك، يرجى تعيين كلمة مرور خاصة بك قبل متابعة مشاريعك."
            : "اختر كلمة مرور جديدة لحسابك."}
        </p>

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

          <button type="submit" className="btn btn-gold" disabled={loading} style={{ justifyContent: "center", marginTop: 4 }}>
            {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
          </button>
        </form>
      </div>
    </div>
  );
}
