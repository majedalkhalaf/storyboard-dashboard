import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import AccountClient from "@/app/components/account/AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", session!.userId)
    .single();

  return (
    <AccountClient
      profile={session!.profile}
      companyId={session!.company!.id}
      email={session!.email}
      userSettings={settings ?? { theme: "dark", language: "ar", notifications_enabled: true }}
    />
  );
}
