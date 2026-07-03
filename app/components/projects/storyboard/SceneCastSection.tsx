"use client";

import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";

export default function SceneCastSection({
  scene,
}: {
  scene: StoryboardSceneFullDetail;
  onChanged: () => void;
}) {
  return (
    <div className="empty-state card">
      <p>قسم الممثلين/الطاقم قيد الإنشاء لهذا المشهد ({scene.title}).</p>
    </div>
  );
}
