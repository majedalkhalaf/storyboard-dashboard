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
  children,
}: {
  userId: string;
  email: string | null;
  profile: Profile;
  company: Company | null;
  initialTheme: "dark" | "light";
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<"dark" | "light">(initialTheme);

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

  return (
    <SessionContext.Provider value={{ userId, email, profile, company, theme, toggleTheme }}>
      {children}
    </SessionContext.Provider>
  );
}
