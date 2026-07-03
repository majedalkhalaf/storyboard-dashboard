"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { fmtMoney } from "@/app/components/finance/format";
import { PROJECT_STATUSES } from "@/app/lib/constants";
import type { FinanceProjectRow } from "@/app/lib/finance-dashboard";
import { triggerBlobDownload } from "@/app/lib/report-export";

type SortKey = "contractValue" | "paidFromPayments" | "remainingFromBudget" | "expenses" | "profitFromBudget" | "profitabilityRate";

const STATUS_META = new Map(PROJECT_STATUSES.map((s) => [s.value as string, s]));

export default function AccountsProjectsTable({ projects }: { projects: FinanceProjectRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("contractValue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = projects;
    if (q) {
      rows = rows.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.code ?? "").toLowerCase().includes(q) || (p.clientName ?? "").toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => (sortDir === "asc" ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
  }, [projects, search, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (
      <span style={{ display: "inline-flex", transform: sortDir === "asc" ? "rotate(180deg)" : undefined }}>
        <Icon name="chevronDown" size={12} />
      </span>
    ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
            <Icon name="search" size={15} />
          </span>
          <input
            className="input-field"
            style={{ paddingInlineStart: 36 }}
            placeholder="بحث بالاسم أو الكود أو العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-outline" onClick={() => void exportProjectsExcel(filtered)}>
          <Icon name="export" size={16} /> تصدير Excel
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="finance" size={32} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد مشاريع مطابقة</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>كود المشروع</th>
                <th>اسم المشروع</th>
                <th>العميل</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("contractValue")}>
                  قيمة المشروع {sortIcon("contractValue")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("paidFromPayments")}>
                  إجمالي المدفوع {sortIcon("paidFromPayments")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("remainingFromBudget")}>
                  المتبقي {sortIcon("remainingFromBudget")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("expenses")}>
                  إجمالي المصروفات {sortIcon("expenses")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("profitFromBudget")}>
                  صافي الأرباح {sortIcon("profitFromBudget")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("profitabilityRate")}>
                  نسبة الربحية {sortIcon("profitabilityRate")}
                </th>
                <th>حالة المشروع</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const status = STATUS_META.get(r.status);
                return (
                  <tr key={r.id}>
                    <td style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{r.code ?? "—"}</td>
                    <td style={{ fontWeight: 600 }}>
                      <Link href={`/projects/${r.id}`}>{r.name}</Link>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{r.clientName ?? "—"}</td>
                    <td>{fmtMoney(r.contractValue)}</td>
                    <td style={{ color: "#1DB954" }}>{fmtMoney(r.paidFromPayments)}</td>
                    <td style={{ color: "#F59E0B" }}>{fmtMoney(r.remainingFromBudget)}</td>
                    <td style={{ color: "#EF4444" }}>{fmtMoney(r.expenses)}</td>
                    <td style={{ color: r.profitFromBudget >= 0 ? "#10B981" : "#EF4444", fontWeight: 700 }}>{fmtMoney(r.profitFromBudget)}</td>
                    <td style={{ color: r.profitabilityRate >= 0 ? "#10B981" : "#EF4444" }}>{Math.round(r.profitabilityRate)}%</td>
                    <td>
                      <span className="chip" style={{ color: status?.color ?? "var(--text-muted)", borderColor: status?.color ?? "var(--border)", fontSize: 11 }}>
                        {status?.label ?? r.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/accounts/${r.id}`} className="btn btn-outline" style={{ fontSize: 12, padding: "6px 10px", whiteSpace: "nowrap" }}>
                        <Icon name="finance" size={13} /> إدارة الحساب
                      </Link>
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

async function exportProjectsExcel(rows: FinanceProjectRow[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("حسابات المشاريع");
  const header = ws.addRow(["كود المشروع", "اسم المشروع", "العميل", "قيمة المشروع", "إجمالي المدفوع", "المتبقي", "إجمالي المصروفات", "صافي الأرباح", "نسبة الربحية", "الحالة"]);
  header.font = { bold: true };
  rows.forEach((r) => {
    const status = STATUS_META.get(r.status);
    ws.addRow([
      r.code ?? "—",
      r.name,
      r.clientName ?? "—",
      r.contractValue,
      r.paidFromPayments,
      r.remainingFromBudget,
      r.expenses,
      r.profitFromBudget,
      `${Math.round(r.profitabilityRate)}%`,
      status?.label ?? r.status,
    ]);
  });
  ws.columns.forEach((c) => {
    c.width = 20;
  });
  const buffer = await wb.xlsx.writeBuffer();
  triggerBlobDownload(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "حسابات_المشاريع.xlsx");
}
