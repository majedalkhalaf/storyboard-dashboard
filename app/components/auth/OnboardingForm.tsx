"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import AuthShowcase from "@/app/components/auth/AuthShowcase";

export default function OnboardingForm({ fullName, email }: { fullName: string | null; email: string | null }) {
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error: rpcError } = await supabase.rpc("create_company_and_owner", {
      p_company_name: companyName,
      p_email: email,
      p_phone: phone || null,
    });

    setLoading(false);
    if (rpcError) {
      setError("تعذّر إكمال إعداد الحساب، حاول مرة أخرى");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="auth-grid card animate-fade-in" style={{ width: "100%", maxWidth: 920, overflow: "hidden", padding: 0 }}>
        <div style={{ padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h1 style={{ fontSize: 21, fontWeight: 800 }}>خطوة أخيرة لإكمال حسابك</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6, marginBottom: 22 }}>
            مرحباً {fullName || ""}، أخبرنا باسم شركتك أو استوديوك لإنشاء مساحة عملك.
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>رقم الهاتف (اختياري)</label>
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

            <button type="submit" className="btn btn-gold" disabled={loading} style={{ justifyContent: "center", marginTop: 6 }}>
              {loading ? "جارٍ الإعداد..." : "إكمال الإعداد"}
            </button>
          </form>
        </div>

        <AuthShowcase />
      </div>
    </div>
  );
}
