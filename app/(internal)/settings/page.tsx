import { getCurrentSession } from "@/app/lib/supabase/session";
import SettingsClient from "@/app/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getCurrentSession();

  return <SettingsClient company={session!.company!} profile={session!.profile} />;
}
