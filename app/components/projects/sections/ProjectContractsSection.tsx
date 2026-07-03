"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { fmtMoney } from "@/app/components/finance/format";
import { CONTRACT_STATUSES } from "@/app/lib/constants";
import { formatDate } from "../utils";
import type { Contract } from "@/app/lib/types";

export default function ProjectContractsSection({ projectId }: { projectId: string }) {
  const [contracts, setContracts] = useState<Contract[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("contracts")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setContracts((data as Contract[]) ?? []));
  }, [projectId]);

  if (!contracts) {
    return <div className="skeleton" style={{ height: 90, borderRadius: 10 }} />;
  }

  if (contracts.length === 0) {
    return <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا توجد عقود لهذا المشروع</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {contracts.map((c) => {
        const info = CONTRACT_STATUSES.find((s) => s.value === c.status);
        return (
          <Link
            key={c.id}
            href={`/contracts/${c.id}`}
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
            <Icon name="contracts" size={15} className="text-muted" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{formatDate(c.created_at)}</div>
            </div>
            <span className="chip" style={{ fontSize: 10.5, color: info?.color, borderColor: info?.color, flexShrink: 0 }}>
              {info?.label ?? c.status}
            </span>
            {c.amount != null && <span style={{ fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>{fmtMoney(c.amount)}</span>}
          </Link>
        );
      })}
    </div>
  );
}
