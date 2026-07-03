"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { CONTRACT_STATUSES } from "@/app/lib/constants";
import { fetchClientContracts } from "@/app/lib/client-profile";
import type { Contract } from "@/app/lib/types";
import { formatDate } from "@/app/components/projects/utils";

export default function ContractsTab({ clientId }: { clientId: string }) {
  const [contracts, setContracts] = useState<Contract[] | null>(null);

  useEffect(() => {
    fetchClientContracts(clientId).then(setContracts);
  }, [clientId]);

  if (contracts === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="skeleton" style={{ height: 40, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 10 }} />
      </div>
    );
  }

  const totalValue = contracts.reduce((sum, c) => (c.status === "cancelled" ? sum : sum + (c.amount ?? 0)), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          إجمالي قيمة العقود (باستثناء الملغاة): <span style={{ fontWeight: 800, color: "var(--gold)" }}>{totalValue.toLocaleString()} ر.س</span>
        </p>
        <Link href="/contracts" className="btn-ghost" style={{ fontSize: 12, color: "var(--gold)" }}>
          عرض كل العقود
        </Link>
      </div>

      {contracts.length === 0 ? (
        <div className="empty-state card">
          <Icon name="contracts" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد عقود لهذا العميل بعد</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>القيمة</th>
                <th>الحالة</th>
                <th>الإصدار</th>
                <th>تاريخ الإنشاء</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const info = CONTRACT_STATUSES.find((s) => s.value === c.status);
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.title}</td>
                    <td>{c.amount != null ? `${c.amount.toLocaleString()} ر.س` : "—"}</td>
                    <td>
                      {info && (
                        <span className="chip" style={{ color: info.color, borderColor: info.color }}>
                          {info.label}
                        </span>
                      )}
                    </td>
                    <td>v{c.version}</td>
                    <td>{formatDate(c.created_at)}</td>
                    <td>
                      {c.pdf_url && (
                        <a href={c.pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
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
