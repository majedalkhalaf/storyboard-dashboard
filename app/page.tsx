import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { ensureCompanyForPendingUser } from "@/app/lib/ensure-company";

export default async function RootPage() {
  const session = await getCurrentSession();

  if (!session) redirect("/login");
  if (session.profile.role === "client") redirect("/client");

  if (!session.profile.company_id) {
    const supabase = await createClient();
    const repaired = await ensureCompanyForPendingUser(supabase, session.userId);
    if (!repaired) redirect("/signup");
  }

  redirect("/dashboard");
}
