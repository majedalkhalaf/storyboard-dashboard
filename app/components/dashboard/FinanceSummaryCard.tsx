import Link from "next/link";
import Sparkline from "./Sparkline";
import { fmtMoney } from "@/app/components/finance/format";

interface Row {
  label: string;
  amount: number;
  changePct: number | null;
  color: string;
  spark: number[];
}

export default function FinanceSummaryCard({ rows }: { rows: Row[] }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>الملخص المالي</h3>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>هذا الشهر</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{fmtMoney(r.amount)}</div>
              {r.changePct !== null && (
                <div style={{ fontSize: 11, color: r.changePct >= 0 ? "#22C55E" : "#EF4444", fontWeight: 700, marginTop: 2 }}>
                  {r.changePct >= 0 ? "+" : ""}
                  {r.changePct.toFixed(1)}%
                </div>
              )}
            </div>
            <Sparkline values={r.spark} color={r.color} />
          </div>
        ))}
      </div>

      <Link href="/finance" className="btn btn-outline" style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
        عرض التقرير المالي
      </Link>
    </div>
  );
}
