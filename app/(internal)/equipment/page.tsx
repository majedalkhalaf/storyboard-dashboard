import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import EquipmentClient from "@/app/components/equipment/EquipmentClient";
import type { Equipment } from "@/app/lib/types";

export default async function EquipmentPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data } = await supabase
    .from("equipment")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  return <EquipmentClient initialItems={(data as Equipment[]) ?? []} companyId={companyId} />;
}
