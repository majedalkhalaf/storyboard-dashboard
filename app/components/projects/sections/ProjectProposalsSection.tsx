"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { PROPOSAL_STATUSES, PROPOSAL_TYPES } from "@/app/lib/constants";
import { formatDate } from "../utils";
import type { Proposal } from "@/app/lib/types";

export default function ProjectProposalsSection({ projectId }: { projectId: string }) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("proposals")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProposals((data as Proposal[]) ?? []));
  }, [projectId]);

  if (!proposals) {
    return <div className="skeleton" style={{ height: 90, borderRadius: 10 }} />;
  }

  if (proposals.length === 0) {
    return <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا توجد عروض لهذا المشروع</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {proposals.map((p) => {
        const info = PROPOSAL_STATUSES.find((s) => s.value === p.status);
        const typeLabel = PROPOSAL_TYPES.find((t) => t.value === p.type)?.label ?? p.type;
        return (
          <Link
            key={p.id}
            href={`/proposals/${p.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Icon name="proposals" size={15} className="text-muted" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                {typeLabel} · {formatDate(p.created_at)}
              </div>
            </div>
            <span className="chip" style={{ fontSize: 10.5, color: info?.color, borderColor: info?.color, flexShrink: 0 }}>
              {info?.label ?? p.status}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
