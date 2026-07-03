"use client";

import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";

export default function SceneAttachmentsSection({
  scene,
}: {
  scene: StoryboardSceneFullDetail;
  onChanged: () => void;
}) {
  return (
    <div className="empty-state card">
      <p>قسم المرفقات قيد الإنشاء لهذا المشهد ({scene.title}).</p>
    </div>
  );
}
