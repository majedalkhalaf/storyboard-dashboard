import { requireClient } from "@/app/components/client/guards";
import NotificationsListFull from "@/app/components/client/NotificationsListFull";

export default async function ClientNotificationsPage() {
  const session = await requireClient();

  return (
    <div className="animate-fade-in" style={{ maxWidth: 760, margin: "0 auto" }}>
      <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
        التنبيهات
      </h1>
      <NotificationsListFull userId={session.userId} />
    </div>
  );
}
