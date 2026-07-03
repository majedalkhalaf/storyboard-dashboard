import { redirect } from "next/navigation";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { isInternalAdmin } from "@/app/lib/permissions";
import FinanceSettingsClient from "@/app/components/finance/FinanceSettingsClient";

export const dynamic = "force-dynamic";

export default async function FinanceSettingsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!isInternalAdmin(session.profile.role)) redirect("/finance");

  return <FinanceSettingsClient company={session.company!} />;
}
