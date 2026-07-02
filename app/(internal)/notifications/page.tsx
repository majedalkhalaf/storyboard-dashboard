import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import NotificationsClient from "@/app/components/notifications/NotificationsClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function NotificationsPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const userId = session!.userId;

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  return (
    <NotificationsClient
      userId={userId}
      initialNotifications={notifications ?? []}
      pageSize={PAGE_SIZE}
    />
  );
}
