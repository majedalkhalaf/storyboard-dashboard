import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import SettingsClient from "@/app/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", session!.userId)
    .single();

  return (
    <SettingsClient
      company={session!.company!}
      profile={session!.profile}
      userSettings={settings ?? { theme: "dark", language: "ar", notifications_enabled: true }}
    />
  );
}
