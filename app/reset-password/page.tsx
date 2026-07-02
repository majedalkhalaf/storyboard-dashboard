"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("تعذّر تحديث كلمة المرور، جرّب طلب رابط جديد");
      return;
    }
    router.push("/login");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={handleSubmit} className="card animate-fade-in" style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>تعيين كلمة مرور جديدة</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>اختر كلمة مرور قوية لحسابك</p>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="password"
            required
            minLength={6}
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور الجديدة"
          />
          <button type="submit" className="btn btn-gold" disabled={loading} style={{ justifyContent: "center" }}>
            {loading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
          </button>
        </div>
      </form>
    </div>
  );
}
