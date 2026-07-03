"use client";

import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";

export default function DirectorNotesSection({
  scene,
}: {
  scene: StoryboardSceneFullDetail;
  onChanged: (patch: Partial<StoryboardSceneFullDetail>) => void;
}) {
  return (
    <div className="empty-state card">
      <p>قسم Director Notes قيد الإنشاء لهذا المشهد ({scene.title}).</p>
    </div>
  );
}
