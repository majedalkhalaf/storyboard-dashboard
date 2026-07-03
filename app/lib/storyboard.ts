import { createClient } from "@/app/lib/supabase/client";
import type { StoryboardSceneStatus } from "@/app/lib/types";

// قائمة خفيفة لمعرض المشاهد فقط (بدون كاميرا/إخراج/ملاحظات كاملة) — يُجلب عند تفعيل
// تبويب "ستوري بورد" لأول مرة لكل حلقة (lazy)، والتفاصيل الكاملة لكل مشهد تُجلب عند اختياره
// فقط (انظر app/lib/storyboard-detail.ts) — نفس نمط التحميل التدريجي المستخدم في معرض الحلقات.
export interface StoryboardSceneListItem {
  id: string;
  number: number | null;
  title: string;
  cover_image_url: string | null;
  duration_seconds: number | null;
  shot_type: string | null;
  location: string | null;
  status: StoryboardSceneStatus;
  progress: number;
  sort_order: number;
  notesCount: number;
  filesCount: number;
  castCount: number;
  equipmentCount: number;
}

export async function getStoryboardScenes(episodeId: string): Promise<StoryboardSceneListItem[]> {
  const supabase = createClient();

  const { data: scenes } = await supabase.from("storyboard_scenes").select("*").eq("episode_id", episodeId).order("sort_order");
  const sceneIds = (scenes ?? []).map((s) => s.id);
  if (sceneIds.length === 0) return [];

  const [{ data: files }, { data: notes }, { data: cast }, { data: equipment }] = await Promise.all([
    supabase.from("files").select("scene_id").in("scene_id", sceneIds),
    supabase.from("notes").select("scene_id").in("scene_id", sceneIds),
    supabase.from("storyboard_scene_cast").select("scene_id").in("scene_id", sceneIds),
    supabase.from("storyboard_scene_equipment").select("scene_id").in("scene_id", sceneIds),
  ]);

  const countBy = (rows: { scene_id: string | null }[] | null) => {
    const map: Record<string, number> = {};
    for (const r of rows ?? []) {
      if (!r.scene_id) continue;
      map[r.scene_id] = (map[r.scene_id] ?? 0) + 1;
    }
    return map;
  };

  const filesCount = countBy(files);
  const notesCount = countBy(notes);
  const castCount = countBy(cast);
  const equipmentCount = countBy(equipment);

  return (scenes ?? []).map((s) => ({
    id: s.id,
    number: s.number,
    title: s.title,
    cover_image_url: s.cover_image_url,
    duration_seconds: s.duration_seconds,
    shot_type: s.shot_type,
    location: s.location,
    status: s.status,
    progress: Number(s.progress ?? 0),
    sort_order: s.sort_order,
    notesCount: notesCount[s.id] ?? 0,
    filesCount: filesCount[s.id] ?? 0,
    castCount: castCount[s.id] ?? 0,
    equipmentCount: equipmentCount[s.id] ?? 0,
  }));
}
