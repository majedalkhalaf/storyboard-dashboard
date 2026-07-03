"use client";

import { useEffect, useState } from "react";
import ActivityTimeline, { type ActivityItem } from "@/app/components/projects/ActivityTimeline";
import { fetchClientActivity } from "@/app/lib/client-profile";

export default function ActivityTab({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    fetchClientActivity(clientId).then(setItems);
  }, [clientId]);

  if (items === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skeleton" style={{ height: 60, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 60, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 60, borderRadius: 10 }} />
      </div>
    );
  }

  return <ActivityTimeline items={items} />;
}
