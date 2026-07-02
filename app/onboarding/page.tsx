import { redirect } from "next/navigation";
import { getCurrentSession } from "@/app/lib/supabase/session";
import OnboardingForm from "@/app/components/auth/OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.profile.role === "client") redirect("/client");
  if (session.profile.company_id) redirect("/dashboard");

  return <OnboardingForm fullName={session.profile.full_name} email={session.email} />;
}
