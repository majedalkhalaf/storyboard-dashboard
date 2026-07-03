"use client";

import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";

export default function SceneNotesSection({
  scene,
}: {
  scene: StoryboardSceneFullDetail;
  onChanged: () => void;
}) {
  return (
    <div className="empty-state card">
      <p>قسم الملاحظات قيد الإنشاء لهذا المشهد ({scene.title}).</p>
    </div>
  );
}
