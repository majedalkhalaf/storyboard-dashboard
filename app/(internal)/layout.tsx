import { redirect } from "next/navigation";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { createClient } from "@/app/lib/supabase/server";
import { ensureCompanyForPendingUser } from "@/app/lib/ensure-company";
import SessionProvider from "@/app/providers/SessionProvider";
import AppShell from "@/app/components/AppShell";

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  let session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.profile.role === "client") redirect("/client");

  const supabase = await createClient();

  if (!session.profile.company_id) {
    const repaired = await ensureCompanyForPendingUser(supabase, session.userId);
    if (!repaired) redirect("/onboarding");
    session = await getCurrentSession();
    if (!session || !session.profile.company_id) redirect("/onboarding");
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("theme, extra")
    .eq("user_id", session.userId)
    .single();

  const extra = (settings?.extra ?? {}) as Record<string, unknown>;

  return (
    <SessionProvider
      userId={session.userId}
      email={session.email}
      profile={session.profile}
      company={session.company}
      initialTheme={settings?.theme ?? "dark"}
      initialSidebarCollapsed={Boolean(extra.sidebar_collapsed)}
    >
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
