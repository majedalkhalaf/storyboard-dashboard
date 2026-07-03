import { createClient } from "@/app/lib/supabase/client";
import type { Equipment, StoryboardScene, StoryboardSceneCast } from "@/app/lib/types";
import type { NoteWithAuthor } from "@/app/lib/episode-detail";

export interface SceneEquipmentRow {
  id: string;
  equipment: Equipment;
}

export interface StoryboardSceneFullDetail extends StoryboardScene {
  files: import("@/app/lib/types").ProjectFile[];
  notes: NoteWithAuthor[];
  cast: StoryboardSceneCast[];
  equipment: SceneEquipmentRow[];
}

export async function fetchSceneDetail(sceneId: string): Promise<StoryboardSceneFullDetail> {
  const supabase = createClient();

  const { data: scene, error } = await supabase.from("storyboard_scenes").select("*").eq("id", sceneId).single();
  if (error || !scene) throw error ?? new Error("المشهد غير موجود");

  const [{ data: files }, { data: noteRows }, { data: cast }, { data: equipmentRows }] = await Promise.all([
    supabase.from("files").select("*").eq("scene_id", sceneId).order("created_at", { ascending: false }),
    supabase.from("notes").select("*, author:profiles!author_id(full_name)").eq("scene_id", sceneId).order("created_at", { ascending: false }),
    supabase.from("storyboard_scene_cast").select("*").eq("scene_id", sceneId).order("created_at"),
    supabase.from("storyboard_scene_equipment").select("id, equipment:equipment(*)").eq("scene_id", sceneId),
  ]);

  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

  const notes: NoteWithAuthor[] = (noteRows ?? []).map((n) => ({
    ...(n as import("@/app/lib/types").Note),
    author_name: one<{ full_name: string | null }>(n.author as never)?.full_name ?? null,
  }));

  const equipment: SceneEquipmentRow[] = (equipmentRows ?? [])
    .map((r) => ({ id: r.id, equipment: one<Equipment>(r.equipment as never) }))
    .filter((r): r is SceneEquipmentRow => r.equipment != null);

  return {
    ...(scene as StoryboardScene),
    camera_setup: (scene.camera_setup ?? {}) as StoryboardScene["camera_setup"],
    director_notes: (scene.director_notes ?? {}) as StoryboardScene["director_notes"],
    files: (files ?? []) as import("@/app/lib/types").ProjectFile[],
    notes,
    cast: (cast ?? []) as StoryboardSceneCast[],
    equipment,
  };
}
