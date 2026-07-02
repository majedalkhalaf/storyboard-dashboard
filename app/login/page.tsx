"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import Icon from "@/app/components/ui/Icon";
import AuthShowcase from "@/app/components/auth/AuthShowcase";
import OAuthButtons from "@/app/components/auth/OAuthButtons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div
        className="auth-grid card animate-fade-in"
        style={{ width: "100%", maxWidth: 920, overflow: "hidden", padding: 0 }}
      >
        <div style={{ padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 22 }}>👋 مرحباً بك</p>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>تسجيل الدخول</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>تابع مشاريعك وإنتاجك بكل سهولة</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>البريد الإلكتروني</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
                  <Icon name="mail" size={16} />
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="input-field"
                  style={{ paddingInlineStart: 38 }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>كلمة المرور</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
                  <Icon name="shield" size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="input-field"
                  style={{ paddingInlineStart: 38, paddingInlineEnd: 38 }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="btn btn-ghost"
                  style={{ position: "absolute", insetInlineEnd: 4, top: "50%", transform: "translateY(-50%)", padding: 6 }}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", cursor: "pointer" }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: "var(--gold)" }} />
                تذكرني
              </label>
              <Link href="/forgot-password" style={{ fontSize: 12.5, color: "var(--gold)" }}>
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button type="submit" className="btn btn-gold" disabled={loading} style={{ justifyContent: "center", marginTop: 6 }}>
              {loading ? "جاري الدخول..." : "دخول"}
            </button>
          </form>

          <OAuthButtons label="أو سجل الدخول باستخدام" />

          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", marginTop: 20 }}>
            ليس لديك حساب؟{" "}
            <Link href="/signup" style={{ color: "var(--gold)", fontWeight: 700 }}>
              إنشاء حساب شركة جديد
            </Link>
          </p>
        </div>

        <AuthShowcase />
      </div>
    </div>
  );
}
