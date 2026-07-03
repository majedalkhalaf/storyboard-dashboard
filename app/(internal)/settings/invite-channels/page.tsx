import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { isInternalAdmin } from "@/app/lib/permissions";
import InviteChannelsClient from "@/app/components/settings/InviteChannelsClient";
import type { CompanySenderNumber } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export default async function InviteChannelsPage() {
  const session = await getCurrentSession();
  if (!isInternalAdmin(session!.profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: numbers } = await supabase
    .from("company_sender_numbers")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at");

  return <InviteChannelsClient companyId={companyId} initialNumbers={(numbers ?? []) as CompanySenderNumber[]} />;
}
