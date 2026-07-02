import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import ClientSettingsForm from "@/app/components/client/ClientSettingsForm";

export default async function ClientSettingsPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", session.userId)
    .maybeSingle();

  return (
    <ClientSettingsForm
      profile={session.profile}
      userSettings={settings ?? { theme: "dark", language: "ar", notifications_enabled: true }}
    />
  );
}
