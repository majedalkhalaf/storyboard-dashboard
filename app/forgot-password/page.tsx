"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError("تعذّر إرسال رابط إعادة التعيين");
      return;
    }
    setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card animate-fade-in" style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>نسيت كلمة المرور</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
          أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
        </p>

        {sent ? (
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", borderRadius: 8, padding: "12px 14px", fontSize: 13 }}>
            تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                {error}
              </div>
            )}
            <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@company.com" />
            <button type="submit" className="btn btn-gold" disabled={loading} style={{ justifyContent: "center" }}>
              {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", fontSize: 13, marginTop: 20 }}>
          <Link href="/login" style={{ color: "var(--gold)", fontWeight: 700 }}>
            العودة لتسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
