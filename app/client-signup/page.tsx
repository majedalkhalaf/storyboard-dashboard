"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import AuthShowcase from "@/app/components/auth/AuthShowcase";

// تسجيل مستقل لحساب عميل — بلا حاجة لدعوة مسبقة من أي شركة. الحساب يُنشأ بدور
// "client" افتراضياً (نفس سلوك handle_new_user() عند غياب role في user_metadata)
// وبلا company_id، فلا يرى أي مشروع حتى تربطه إحدى الشركات بمشروع عبر معالج
// الدعوة لاحقاً (بنفس هذا البريد) — بوابة العميل تعرض حالة فارغة آمنة إلى حينها.
export default function ClientSignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          role: "client",
          phone: phone || null,
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message.includes("already registered") ? "هذا البريد مسجّل بالفعل" : "تعذّر إنشاء الحساب، حاول مرة أخرى");
      return;
    }

    setLoading(false);
    if (!data.session) {
      setNeedsConfirmation(true);
      return;
    }

    router.push("/client");
    router.refresh();
  }

  if (needsConfirmation) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="card animate-fade-in" style={{ width: "100%", maxWidth: 420, padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>تحقق من بريدك الإلكتروني</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            أرسلنا رابط تفعيل إلى <strong>{email}</strong>. افتح الرابط لتفعيل حسابك، ثم سجّل دخولك من صفحة الدخول.
          </p>
          <Link href="/login" className="btn btn-outline" style={{ marginTop: 20, justifyContent: "center" }}>
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="auth-grid card animate-fade-in" style={{ width: "100%", maxWidth: 940, overflow: "hidden", padding: 0 }}>
        <div style={{ padding: "40px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 21, fontWeight: 800 }}>تسجيل حساب عميل</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              أنشئ حسابك الآن — بمجرد أن تربطك إحدى الشركات بمشروع بنفس هذا البريد سيظهر لك تلقائياً هنا
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>اسمك الكامل</label>
              <input
                required
                name="name"
                autoComplete="name"
                className="input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم الكامل"
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>البريد الإلكتروني</label>
              <input
                type="email"
                required
                name="email"
                autoComplete="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@company.com"
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>رقم الجوال (اختياري)</label>
              <input
                type="tel"
                name="tel"
                autoComplete="tel"
                className="input-field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>كلمة المرور</label>
              <input
                type="password"
                required
                minLength={6}
                name="new-password"
                autoComplete="new-password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
              />
            </div>

            <button type="submit" className="btn btn-gold" disabled={loading} style={{ justifyContent: "center", marginTop: 6 }}>
              {loading ? "جاري الإنشاء..." : "إنشاء حساب العميل"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", marginTop: 18 }}>
            لديك حساب بالفعل؟{" "}
            <Link href="/login" style={{ color: "var(--gold)", fontWeight: 700 }}>
              تسجيل الدخول
            </Link>
          </p>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
            تدير مشاريع لعملاء؟{" "}
            <Link href="/signup" style={{ color: "var(--gold)", fontWeight: 700 }}>
              إنشاء حساب شركة
            </Link>
          </p>
        </div>

        <AuthShowcase />
      </div>
    </div>
  );
}
