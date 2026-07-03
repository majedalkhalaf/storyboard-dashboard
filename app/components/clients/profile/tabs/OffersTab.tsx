"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { PROPOSAL_STATUSES, PROPOSAL_TYPES } from "@/app/lib/constants";
import { fetchClientProposals } from "@/app/lib/client-profile";
import type { Proposal } from "@/app/lib/types";
import { formatDate } from "@/app/components/projects/utils";

export default function OffersTab({ clientId }: { clientId: string }) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);

  useEffect(() => {
    fetchClientProposals(clientId).then(setProposals);
  }, [clientId]);

  if (proposals === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="skeleton" style={{ height: 40, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 10 }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link href="/proposals" className="btn-ghost" style={{ fontSize: 12, color: "var(--gold)" }}>
          عرض كل العروض
        </Link>
      </div>

      {proposals.length === 0 ? (
        <div className="empty-state card">
          <Icon name="proposals" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد عروض لهذا العميل بعد</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>النوع</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => {
                const statusInfo = PROPOSAL_STATUSES.find((s) => s.value === p.status);
                const typeInfo = PROPOSAL_TYPES.find((t) => t.value === p.type);
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>{p.title}</td>
                    <td>{typeInfo?.label ?? p.type}</td>
                    <td>
                      {statusInfo && (
                        <span className="chip" style={{ color: statusInfo.color, borderColor: statusInfo.color }}>
                          {statusInfo.label}
                        </span>
                      )}
                    </td>
                    <td>{formatDate(p.created_at)}</td>
                    <td>
                      {p.pdf_url && (
                        <a href={p.pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
                          <Icon name="export" size={13} /> عرض PDF
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
