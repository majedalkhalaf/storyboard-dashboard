"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Company, Profile } from "@/app/lib/types";
import { createClient } from "@/app/lib/supabase/client";

interface SessionContextValue {
  userId: string;
  email: string | null;
  profile: Profile;
  company: Company | null;
  theme: "dark" | "light";
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  /** حقيبة تفضيلات إضافية حرة الشكل (حالة طي الأقسام، إلخ) — مُحمَّلة من user_settings.extra */
  extra: Record<string, unknown>;
  /** يدمج patch مع extra الحالي محلياً وفي قاعدة البيانات (لا يستبدل extra بالكامل، حتى لا تُفقد مفاتيح أخرى محفوظة فيه) */
  updateExtra: (patch: Record<string, unknown>) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession يجب أن يُستخدم داخل SessionProvider");
  return ctx;
}

export default function SessionProvider({
  userId,
  email,
  profile,
  company,
  initialTheme,
  initialExtra = {},
  children,
}: {
  userId: string;
  email: string | null;
  profile: Profile;
  company: Company | null;
  initialTheme: "dark" | "light";
  initialExtra?: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<"dark" | "light">(initialTheme);
  const [extra, setExtra] = useState<Record<string, unknown>>(initialExtra);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "dark" ? false : true);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({ user_id: userId, theme: next }, { onConflict: "user_id" })
      .then(() => {});
  };

  // يدمج مع extra الحالي (بدل استبداله بالكامل) حتى لا تُفقد مفاتيح أخرى محفوظة فيه
  // (مثال: تبديل طي الشريط الجانبي لا يجب أن يمحو حالة طي أقسام صفحة المشروع، والعكس)
  const updateExtra = (patch: Record<string, unknown>) => {
    setExtra((prev) => {
      const next = { ...prev, ...patch };
      const supabase = createClient();
      supabase
        .from("user_settings")
        .upsert({ user_id: userId, extra: next }, { onConflict: "user_id" })
        .then(() => {});
      return next;
    });
  };

  const sidebarCollapsed = Boolean(extra.sidebar_collapsed);
  const toggleSidebarCollapsed = () => updateExtra({ sidebar_collapsed: !sidebarCollapsed });

  return (
    <SessionContext.Provider
      value={{ userId, email, profile, company, theme, toggleTheme, sidebarCollapsed, toggleSidebarCollapsed, extra, updateExtra }}
    >
      {children}
    </SessionContext.Provider>
  );
}
