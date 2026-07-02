"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES } from "@/app/lib/constants";
import type { WorkspaceProject } from "@/app/lib/workspace-projects";

// تقويم شهري (7 أعمدة × حتى 6 صفوف) يعرض مؤشرات صغيرة لمواعيد التصوير
// والتسليم — RTL بالكامل (الأسبوع يبدأ الأحد، ويُعرض بترتيب DOM عادي
// ويعتمد على شبكة CSS لتصحيح الاتجاه تلقائياً).

const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTH_LABELS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const MAX_VISIBLE_EVENTS = 3;

function statusColor(status: string): string {
  return PROJECT_STATUSES.find((s) => s.value === status)?.color ?? "#6B7280";
}

function toIsoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

interface DayEvent {
  project: WorkspaceProject;
  kind: "shooting" | "delivery";
}

export default function CalendarView({ projects }: { projects: WorkspaceProject[] }) {
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    for (const p of projects) {
      if (p.shooting_date) {
        const key = p.shooting_date.slice(0, 10);
        (map.get(key) ?? map.set(key, []).get(key)!).push({ project: p, kind: "shooting" });
      }
      if (p.delivery_date) {
        const key = p.delivery_date.slice(0, 10);
        (map.get(key) ?? map.set(key, []).get(key)!).push({ project: p, kind: "delivery" });
      }
    }
    return map;
  }, [projects]);

  const todayIso = toIsoDay(new Date());

  const cells = useMemo(() => {
    const firstOfMonth = displayMonth;
    const leadingCount = firstOfMonth.getDay(); // 0 = Sunday
    const gridStart = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), 1 - leadingCount);
    const daysInMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate();
    const totalCells = Math.ceil((leadingCount + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, i) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const iso = toIsoDay(date);
      return {
        date,
        iso,
        inMonth: date.getMonth() === firstOfMonth.getMonth(),
        isToday: iso === todayIso,
        events: eventsByDay.get(iso) ?? [],
      };
    });
  }, [displayMonth, eventsByDay, todayIso]);

  function goPrevMonth() {
    setDisplayMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function goNextMonth() {
    setDisplayMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
  function goToday() {
    setDisplayMonth(startOfMonth(new Date()));
  }

  if (projects.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="calendarView" size={32} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد مشاريع مطابقة</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="btn btn-outline" onClick={goPrevMonth} aria-label="الشهر السابق" style={{ padding: 8 }}>
            <Icon name="chevronRight" size={16} />
          </button>
          <button className="btn btn-outline" onClick={goNextMonth} aria-label="الشهر التالي" style={{ padding: 8 }}>
            <Icon name="chevronLeft" size={16} />
          </button>
          <button className="btn btn-outline" onClick={goToday}>
            اليوم
          </button>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 800 }}>
          {MONTH_LABELS[displayMonth.getMonth()]} {displayMonth.getFullYear()}
        </h3>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="video" size={12} /> تصوير
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="checkCircle" size={12} /> تسليم
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ background: "var(--bg-secondary)", padding: "8px 6px", fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", textAlign: "center" }}>
            {w}
          </div>
        ))}

        {cells.map((cell) => {
          const visible = cell.events.slice(0, MAX_VISIBLE_EVENTS);
          const overflow = cell.events.length - visible.length;
          return (
            <div
              key={cell.iso}
              style={{
                background: "var(--bg-card)",
                minHeight: 92,
                padding: 6,
                opacity: cell.inMonth ? 1 : 0.4,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: cell.isToday ? 800 : 600,
                  color: cell.isToday ? "var(--gold)" : "var(--text-secondary)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: cell.isToday ? "1.5px solid var(--gold)" : "none",
                }}
              >
                {cell.date.getDate()}
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {visible.map((ev, idx) => {
                  const color = statusColor(ev.project.status);
                  return (
                    <Link
                      key={`${ev.project.id}-${ev.kind}-${idx}`}
                      href={`/projects/${ev.project.id}`}
                      title={`${ev.project.name} — ${ev.kind === "shooting" ? "تصوير" : "تسليم"}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: "2px 5px",
                        borderRadius: 5,
                        background: `${color}22`,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      <span style={{ color, flexShrink: 0, display: "flex" }}>
                        <Icon name={ev.kind === "shooting" ? "video" : "checkCircle"} size={10} />
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{ev.project.name}</span>
                    </Link>
                  );
                })}
                {overflow > 0 && (
                  <span
                    title={cell.events
                      .slice(MAX_VISIBLE_EVENTS)
                      .map((e) => e.project.name)
                      .join("، ")}
                    style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 700, padding: "0 4px" }}
                  >
                    +{overflow}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
