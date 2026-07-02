"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES } from "@/app/lib/constants";
import { fmtDate } from "@/app/components/finance/format";
import type { WorkspaceProject } from "@/app/lib/workspace-projects";

// عرض زمني (Gantt) بسيط مرسوم يدوياً بـ SVG — بنفس منهج مخططات لوحة التحكم
// (RevenueExpenseChart / StatusDonut): لا مكتبات رسوم بيانية، إحداثيات فيزيائية
// من اليسار لليمين مثل أي مخطط زمني حتى داخل تطبيق RTL.

const DAY_MS = 86400000;
const ROW_H = 40;
const HEADER_H = 32;
const ROW_PAD = 7;

const MONTH_LABELS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function statusColor(status: string): string {
  return PROJECT_STATUSES.find((s) => s.value === status)?.color ?? "#6B7280";
}

function statusLabel(status: string): string {
  return PROJECT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

type RangeRow = { kind: "range"; project: WorkspaceProject; start: Date; end: Date };
type PointRow = { kind: "point"; project: WorkspaceProject; date: Date; pointKind: "shooting" | "delivery" };
type Row = RangeRow | PointRow;

export default function TimelineView({ projects }: { projects: WorkspaceProject[] }) {
  const router = useRouter();
  const [hoverId, setHoverId] = useState<string | null>(null);

  const { rows, noDateProjects } = useMemo(() => {
    const rows: Row[] = [];
    const noDateProjects: WorkspaceProject[] = [];
    for (const p of projects) {
      const s = parseDate(p.shooting_date);
      const d = parseDate(p.delivery_date);
      if (s && d) {
        rows.push({ kind: "range", project: p, start: s < d ? s : d, end: s < d ? d : s });
      } else if (s) {
        rows.push({ kind: "point", project: p, date: s, pointKind: "shooting" });
      } else if (d) {
        rows.push({ kind: "point", project: p, date: d, pointKind: "delivery" });
      } else {
        noDateProjects.push(p);
      }
    }
    rows.sort((a, b) => (a.kind === "range" ? a.start : a.date).getTime() - (b.kind === "range" ? b.start : b.date).getTime());
    return { rows, noDateProjects };
  }, [projects]);

  const chart = useMemo(() => {
    if (rows.length === 0) return null;

    const allDates: Date[] = [];
    for (const r of rows) {
      if (r.kind === "range") {
        allDates.push(r.start, r.end);
      } else {
        allDates.push(r.date);
      }
    }
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    const axisStart = startOfMonth(minDate);
    const axisEnd = addMonths(startOfMonth(maxDate), 1); // exclusive
    const totalDays = Math.max(1, daysBetween(axisStart, axisEnd));

    const rawPxPerDay = totalDays <= 45 ? 26 : totalDays <= 120 ? 14 : totalDays <= 300 ? 8 : totalDays <= 800 ? 4 : 2;
    const totalWidth = Math.max(720, Math.round(totalDays * rawPxPerDay));
    const pxPerDay = totalWidth / totalDays;
    const totalHeight = HEADER_H + rows.length * ROW_H;

    const months: { key: string; x: number; label: string }[] = [];
    let cur = axisStart;
    while (cur < axisEnd) {
      months.push({
        key: `${cur.getFullYear()}-${cur.getMonth()}`,
        x: daysBetween(axisStart, cur) * pxPerDay,
        label: `${MONTH_LABELS[cur.getMonth()]} ${cur.getFullYear()}`,
      });
      cur = addMonths(cur, 1);
    }

    const today = new Date();
    const todayX = today >= axisStart && today < axisEnd ? daysBetween(axisStart, today) * pxPerDay : null;

    return { axisStart, axisEnd, totalWidth, totalHeight, pxPerDay, months, todayX };
  }, [rows]);

  if (projects.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="timeline" size={32} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد مشاريع مطابقة</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {chart && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ position: "relative", width: chart.totalWidth }}>
              <svg width={chart.totalWidth} height={chart.totalHeight} style={{ display: "block", overflow: "visible" }}>
                {/* شبكة الأشهر */}
                {chart.months.map((m) => (
                  <g key={m.key}>
                    <line x1={m.x} x2={m.x} y1={HEADER_H} y2={chart.totalHeight} stroke="var(--border)" strokeWidth={1} />
                    <text x={m.x + 6} y={20} fontSize={11} fill="var(--text-muted)">
                      {m.label}
                    </text>
                  </g>
                ))}

                {chart.todayX !== null && (
                  <line
                    x1={chart.todayX}
                    x2={chart.todayX}
                    y1={HEADER_H}
                    y2={chart.totalHeight}
                    stroke="var(--gold)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                )}

                {/* خطوط تفصل الصفوف */}
                {rows.map((r, i) => (
                  <line
                    key={`row-${r.project.id}`}
                    x1={0}
                    x2={chart.totalWidth}
                    y1={HEADER_H + (i + 1) * ROW_H}
                    y2={HEADER_H + (i + 1) * ROW_H}
                    stroke="var(--border)"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                ))}

                {rows.map((r, i) => {
                  const y = HEADER_H + i * ROW_H;
                  const color = statusColor(r.project.status);
                  const rowCenter = y + ROW_H / 2;

                  if (r.kind === "range") {
                    const x1 = daysBetween(chart.axisStart, r.start) * chart.pxPerDay;
                    const x2 = daysBetween(chart.axisStart, r.end) * chart.pxPerDay;
                    const barWidth = Math.max(6, x2 - x1);
                    const estimatedTextWidth = r.project.name.length * 6.5 + 16;
                    const labelInside = barWidth >= estimatedTextWidth;
                    const labelFitsAfter = x1 + barWidth + 8 + estimatedTextWidth <= chart.totalWidth;

                    return (
                      <g
                        key={r.project.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => router.push(`/projects/${r.project.id}`)}
                        onMouseEnter={() => setHoverId(r.project.id)}
                        onMouseLeave={() => setHoverId(null)}
                      >
                        <rect x={x1} y={y + ROW_PAD} width={barWidth} height={ROW_H - ROW_PAD * 2} rx={6} fill={`${color}33`} stroke={color} strokeWidth={1.5} />
                        {labelInside ? (
                          <text x={x1 + 8} y={rowCenter + 4} fontSize={11.5} fontWeight={700} fill="var(--text-primary)">
                            {r.project.name}
                          </text>
                        ) : labelFitsAfter ? (
                          <text x={x1 + barWidth + 8} y={rowCenter + 4} fontSize={11.5} fontWeight={700} fill="var(--text-primary)">
                            {r.project.name}
                          </text>
                        ) : (
                          <text x={x1 - 8} y={rowCenter + 4} fontSize={11.5} fontWeight={700} fill="var(--text-primary)" textAnchor="end">
                            {r.project.name}
                          </text>
                        )}
                      </g>
                    );
                  }

                  const x = daysBetween(chart.axisStart, r.date) * chart.pxPerDay;
                  const estimatedTextWidth = r.project.name.length * 6.5 + 16;
                  const labelFitsAfter = x + 10 + estimatedTextWidth <= chart.totalWidth;

                  return (
                    <g
                      key={r.project.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => router.push(`/projects/${r.project.id}`)}
                      onMouseEnter={() => setHoverId(r.project.id)}
                      onMouseLeave={() => setHoverId(null)}
                    >
                      <circle cx={x} cy={rowCenter} r={6} fill={color} stroke="var(--bg-card)" strokeWidth={2} />
                      {labelFitsAfter ? (
                        <text x={x + 12} y={rowCenter + 4} fontSize={11.5} fontWeight={700} fill="var(--text-primary)">
                          {r.project.name}
                        </text>
                      ) : (
                        <text x={x - 12} y={rowCenter + 4} fontSize={11.5} fontWeight={700} fill="var(--text-primary)" textAnchor="end">
                          {r.project.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {rows.map((r, i) => {
                if (hoverId !== r.project.id) return null;
                const y = HEADER_H + i * ROW_H;
                return (
                  <div
                    key={`tooltip-${r.project.id}`}
                    className="card"
                    style={{
                      position: "absolute",
                      top: Math.max(y - 6, 0),
                      left: 0,
                      transform: "translateY(-100%)",
                      padding: "8px 12px",
                      fontSize: 12,
                      pointerEvents: "none",
                      whiteSpace: "nowrap",
                      zIndex: 5,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{r.project.name}</div>
                    <div style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name="clients" size={11} /> {r.project.client_name ?? "بدون عميل"}
                    </div>
                    <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
                      {r.kind === "range"
                        ? `${fmtDate(r.project.shooting_date)} — ${fmtDate(r.project.delivery_date)}`
                        : r.pointKind === "shooting"
                          ? `تصوير: ${fmtDate(r.project.shooting_date)}`
                          : `تسليم: ${fmtDate(r.project.delivery_date)}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {noDateProjects.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "var(--text-secondary)" }}>
            بدون تواريخ محددة ({noDateProjects.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {noDateProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 8px",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}
                className="btn-ghost"
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(p.status), flexShrink: 0 }} />
                <span style={{ fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: 12 }}>
                  <Icon name="clients" size={11} /> {p.client_name ?? "بدون عميل"}
                </span>
                <span className="chip" style={{ color: statusColor(p.status), borderColor: statusColor(p.status) }}>
                  {statusLabel(p.status)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
