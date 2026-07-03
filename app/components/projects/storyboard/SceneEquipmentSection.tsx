"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { equipmentCategoryLabel, equipmentStatusInfo } from "@/app/lib/equipment-constants";
import type { Equipment } from "@/app/lib/types";
import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";

// ربط المشهد بمعدات الشركة الموجودة مسبقاً (equipment) عبر جدول الوصل storyboard_scene_equipment.
// قائمة المعدات الكاملة ليست جزءاً من StoryboardSceneFullDetail، لذا تُجلب هنا محلياً.
export default function SceneEquipmentSection({
  scene,
  onChanged,
}: {
  scene: StoryboardSceneFullDetail;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const { company } = useSession();
  const companyId = company!.id;

  const [allEquipment, setAllEquipment] = useState<Equipment[] | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [linking, setLinking] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("equipment").select("*").eq("company_id", companyId).order("name");
    setAllEquipment((data as Equipment[]) ?? []);
  }, [supabase, companyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل قائمة معدات الشركة عند تركيب القسم، النمط القياسي في هذا المشروع
    load();
  }, [load]);

  const linkedIds = useMemo(() => new Set(scene.equipment.map((r) => r.equipment.id)), [scene.equipment]);
  const availableToLink = useMemo(() => (allEquipment ?? []).filter((e) => !linkedIds.has(e.id)), [allEquipment, linkedIds]);

  async function linkEquipment() {
    if (!selectedId || linking) return;
    setLinking(true);
    try {
      await supabase.from("storyboard_scene_equipment").insert({
        company_id: companyId,
        scene_id: scene.id,
        equipment_id: selectedId,
      });
      setSelectedId("");
      onChanged();
    } finally {
      setLinking(false);
    }
  }

  async function unlink(rowId: string) {
    await supabase.from("storyboard_scene_equipment").delete().eq("id", rowId);
    onChanged();
  }

  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 800 }}>المعدات</h3>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>إضافة معدة من المخزون</label>
          <select className="input-field" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={allEquipment === null}>
            <option value="">
              {allEquipment === null ? "جارٍ التحميل..." : availableToLink.length === 0 ? "لا توجد معدات إضافية" : "اختر معدة..."}
            </option>
            {availableToLink.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {equipmentCategoryLabel(e.category)}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-gold" disabled={!selectedId || linking} onClick={linkEquipment}>
          <Icon name="plus" size={15} /> ربط
        </button>
      </div>

      {scene.equipment.length === 0 ? (
        <div className="empty-state">
          <Icon name="equipment" size={28} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد معدات مرتبطة بهذا المشهد بعد</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {scene.equipment.map((row) => {
            const st = equipmentStatusInfo(row.equipment.status);
            return (
              <div key={row.id} className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{row.equipment.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{equipmentCategoryLabel(row.equipment.category)}</div>
                  <span className="chip" style={{ color: st.color, borderColor: st.color, fontSize: 11, marginTop: 6, display: "inline-block" }}>
                    {st.label}
                  </span>
                </div>
                <button className="btn-ghost" style={{ padding: "6px 8px", borderRadius: 8, color: "#ef4444", flexShrink: 0 }} onClick={() => unlink(row.id)}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
