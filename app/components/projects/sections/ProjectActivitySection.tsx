"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import ActivityTimeline, { type ActivityItem } from "../ActivityTimeline";

export default function ProjectActivitySection({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("activity_logs")
      .select("*, actor:profiles!actor_id(full_name, job_title)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
        const rows: ActivityItem[] = (data ?? []).map((a) => ({
          id: a.id,
          actor_role: a.actor_role,
          actor_name: one<{ full_name: string | null; job_title: string | null }>(a.actor as never)?.full_name ?? null,
          actor_job_title: one<{ full_name: string | null; job_title: string | null }>(a.actor as never)?.job_title ?? null,
          action: a.action,
          details: (a.details ?? {}) as Record<string, unknown>,
          created_at: a.created_at,
        }));
        setItems(rows);
      });
  }, [projectId]);

  if (!items) {
    return <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />;
  }

  return <ActivityTimeline items={items} />;
}
