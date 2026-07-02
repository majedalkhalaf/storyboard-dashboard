"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { useSession } from "@/app/providers/SessionProvider";
import { createClient } from "@/app/lib/supabase/client";
import { USER_ROLE_LABELS } from "@/app/lib/constants";

export default function AccountMenu() {
  const { profile, theme, toggleTheme } = useSession();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div style={{ position: "relative" }}>
      <button className="btn btn-ghost" onClick={() => setOpen((v) => !v)} style={{ gap: 8 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            color: "#0A0A0B",
            fontSize: 13,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            (profile.full_name || profile.email || "?").charAt(0)
          )}
        </div>
        <span className="header-account-label" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{profile.full_name || profile.email}</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.2 }}>{USER_ROLE_LABELS[profile.role]}</span>
        </span>
        <Icon name="chevronDown" size={14} />
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div
            className="card animate-fade-in"
            style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 220, zIndex: 100, padding: 10 }}
          >
            <div style={{ padding: "6px 10px 10px", borderBottom: "1px solid var(--border)", marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{profile.full_name || "بدون اسم"}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{USER_ROLE_LABELS[profile.role]}</div>
            </div>
            <Link href="/account" className="sidebar-link" onClick={() => setOpen(false)} style={{ textAlign: "right" }}>
              <Icon name="user" size={16} />
              <span>حسابي</span>
            </Link>
            <button className="sidebar-link" onClick={toggleTheme} style={{ textAlign: "right" }}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
              <span>{theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}</span>
            </button>
            <button className="sidebar-link" onClick={handleLogout} style={{ textAlign: "right", color: "#ef4444" }}>
              <Icon name="logout" size={16} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
