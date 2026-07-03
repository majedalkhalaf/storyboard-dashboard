"use client";

import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";

export default function SceneEquipmentSection({
  scene,
}: {
  scene: StoryboardSceneFullDetail;
  onChanged: () => void;
}) {
  return (
    <div className="empty-state card">
      <p>قسم المعدات قيد الإنشاء لهذا المشهد ({scene.title}).</p>
    </div>
  );
}
