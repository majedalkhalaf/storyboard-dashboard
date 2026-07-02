"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export default function SignupPage() {
  const [companyName, setCompanyName] = useState("");
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
          role: "company_owner",
          pending_company_name: companyName,
          pending_phone: phone,
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message.includes("already registered") ? "هذا البريد مسجّل بالفعل" : "تعذّر إنشاء الحساب، حاول مرة أخرى");
      return;
    }

    if (!data.session) {
      setLoading(false);
      setNeedsConfirmation(true);
      return;
    }

    const { error: companyError } = await supabase.rpc("create_company_and_owner", {
      p_company_name: companyName,
      p_email: email,
      p_phone: phone,
    });

    setLoading(false);
    if (companyError) {
      setError("تم إنشاء الحساب لكن تعذّر إنشاء الشركة، حاول تسجيل الدخول مجدداً");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (needsConfirmation) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="card animate-fade-in" style={{ width: "100%", maxWidth: 420, padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>تحقق من بريدك الإلكتروني</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            أرسلنا رابط تفعيل إلى <strong>{email}</strong>. افتح الرابط لتفعيل حسابك وإنشاء شركتك تلقائياً.
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
      <form onSubmit={handleSubmit} className="card animate-fade-in" style={{ width: "100%", maxWidth: 440, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>إنشاء حساب شركة جديد</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>ابدأ بإدارة مشاريع الإنتاج خلال دقيقة</p>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>اسم الشركة / الاستوديو</label>
            <input
              required
              name="organization"
              autoComplete="organization"
              className="input-field"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="مثال: استوديو الإبداع"
            />
          </div>
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
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>رقم الهاتف</label>
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
            {loading ? "جاري الإنشاء..." : "إنشاء الحساب"}
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", marginTop: 20 }}>
          لديك حساب بالفعل؟{" "}
          <Link href="/login" style={{ color: "var(--gold)", fontWeight: 700 }}>
            تسجيل الدخول
          </Link>
        </p>
      </form>
    </div>
  );
}
