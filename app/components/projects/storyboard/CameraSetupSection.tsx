"use client";

import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";

export default function CameraSetupSection({
  scene,
}: {
  scene: StoryboardSceneFullDetail;
  onChanged: (patch: Partial<StoryboardSceneFullDetail>) => void;
}) {
  return (
    <div className="empty-state card">
      <p>قسم Camera Setup قيد الإنشاء لهذا المشهد ({scene.title}).</p>
    </div>
  );
}
