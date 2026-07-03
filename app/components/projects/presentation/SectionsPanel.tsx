"use client";

import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Icon from "@/app/components/ui/Icon";
import { PRESENTATION_SECTIONS, type PresentationData } from "@/app/lib/presentation-sections";
import type { PresentationSectionConfig } from "@/app/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  intro: "المقدمة",
  strategy: "الاستراتيجية",
  execution: "التنفيذ",
  content: "المحتوى",
  closing: "الختام",
};

export default function SectionsPanel({
  data,
  sections,
  onChange,
}: {
  data: PresentationData;
  sections: PresentationSectionConfig[];
  onChange: (sections: PresentationSectionConfig[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // دمج الترتيب المحفوظ مع أي أقسام جديدة أُضيفت للكتالوج لاحقاً لم تُحفظ بعد لهذا المشروع
  const known = new Set(sections.map((s) => s.key));
  const merged: PresentationSectionConfig[] = [
    ...sections.filter((s) => PRESENTATION_SECTIONS.some((def) => def.key === s.key)),
    ...PRESENTATION_SECTIONS.filter((def) => !known.has(def.key)).map((def) => ({ key: def.key, enabled: def.isAvailable(data) })),
  ];

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = merged.findIndex((s) => s.key === active.id);
    const newIndex = merged.findIndex((s) => s.key === over.id);
    onChange(arrayMove(merged, oldIndex, newIndex));
  }

  function toggle(key: string) {
    onChange(merged.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)));
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        فعّل/عطّل أي قسم، ورتّبها بالسحب والإفلات. الأقسام التي لا تملك بيانات فعلية (مثل Storyboard لو لم تُضِف أي مشهد)
        تُعطَّل تلقائياً افتراضياً — يمكنك تفعيلها يدوياً وستظهر فارغة إن لم توجد بيانات.
      </p>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={merged.map((s) => s.key)} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {merged.map((s) => {
              const def = PRESENTATION_SECTIONS.find((d) => d.key === s.key);
              if (!def) return null;
              const available = def.isAvailable(data);
              return (
                <SortableRow key={s.key} id={s.key}>
                  <span className="chip" style={{ fontSize: 10, flexShrink: 0 }}>
                    {CATEGORY_LABELS[def.category]}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, opacity: available ? 1 : 0.5 }}>
                    {def.label}
                    {!available && <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}> — لا توجد بيانات</span>}
                  </span>
                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input type="checkbox" checked={s.enabled} onChange={() => toggle(s.key)} />
                  </label>
                </SortableRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className="card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <span {...attributes} {...listeners} style={{ cursor: "grab", color: "var(--text-muted)", display: "flex" }}>
        <Icon name="grip" size={16} />
      </span>
      {children}
    </div>
  );
}
