import { redirect } from "next/navigation";
import { getCurrentSession } from "@/app/lib/supabase/session";

export default async function RootPage() {
  const session = await getCurrentSession();

  if (!session) redirect("/login");
  if (session.profile.role === "client") redirect("/client");
  if (!session.profile.company_id) redirect("/signup");
  redirect("/dashboard");
}
