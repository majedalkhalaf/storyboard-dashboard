import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_EPISODE_STAGES, SERVICES_CATALOG } from "@/app/lib/constants";
import type { PresentationData, PresentationEpisodeSummary, PresentationStageSummary } from "@/app/lib/presentation-sections";

// يقبل أي عميل Supabase جاهز (عميل السيرفر المعتاد المقيّد بـRLS للاستخدام داخل النظام،
// أو عميل service_role لصفحة المشاركة العامة /present/[token]) — نفس منطق التجميع في الحالتين.
export async function fetchPresentationData(
  supabase: SupabaseClient,
  companyId: string,
  projectId: string
): Promise<PresentationData | null> {
  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).eq("company_id", companyId).single();
  if (!project) return null;

  const { data: company } = await supabase.from("companies").select("*").eq("id", companyId).single();

  let clientName: string | null = null;
  let clientLogoUrl: string | null = null;
  if (project.client_id) {
    const { data: client } = await supabase.from("clients").select("name, logo_url").eq("id", project.client_id).single();
    clientName = client?.name ?? null;
    clientLogoUrl = client?.logo_url ?? null;
  }

  const [{ data: services }, { data: episodes }] = await Promise.all([
    supabase.from("project_services").select("category, label").eq("project_id", projectId),
    supabase
      .from("episodes")
      .select("id, number, title, description, cover_image_url, status, progress, duration_seconds, script, scenario, location")
      .eq("project_id", projectId)
      .order("sort_order"),
  ]);

  const episodeIds = (episodes ?? []).map((e) => e.id);

  const [{ data: stages }, { data: scenes }, { data: assignedProfiles }, { data: files }] = await Promise.all([
    episodeIds.length
      ? supabase.from("episode_stages").select("episode_id, key, status, started_at, completed_at, assigned_to").in("episode_id", episodeIds)
      : Promise.resolve({ data: [] }),
    episodeIds.length ? supabase.from("storyboard_scenes").select("id, episode_id, location").in("episode_id", episodeIds) : Promise.resolve({ data: [] }),
    supabase.from("episodes").select("assigned_to").eq("project_id", projectId).not("assigned_to", "is", null),
    supabase.from("files").select("category").eq("project_id", projectId),
  ]);

  const sceneIds = (scenes ?? []).map((s) => s.id);
  const { data: sceneEquipment } = sceneIds.length
    ? await supabase.from("storyboard_scene_equipment").select("equipment:equipment(name)").in("scene_id", sceneIds)
    : { data: [] };

  const stageAssignedIds = (stages ?? []).map((s) => s.assigned_to).filter((id): id is string => Boolean(id));
  const episodeAssignedIds = (assignedProfiles ?? []).map((e) => e.assigned_to).filter((id): id is string => Boolean(id));
  const teamIds = Array.from(new Set([...stageAssignedIds, ...episodeAssignedIds]));
  const { data: teamProfiles } = teamIds.length
    ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", teamIds)
    : { data: [] };

  // مراحل كل حلقة مجمّعة بمفتاحها
  const stagesByEpisode: Record<string, { key: string; status: string }[]> = {};
  for (const s of stages ?? []) {
    (stagesByEpisode[s.episode_id] ??= []).push({ key: s.key, status: s.status });
  }
  const scenesByEpisode: Record<string, number> = {};
  for (const sc of scenes ?? []) {
    scenesByEpisode[sc.episode_id] = (scenesByEpisode[sc.episode_id] ?? 0) + 1;
  }

  const episodeSummaries: PresentationEpisodeSummary[] = (episodes ?? []).map((e) => {
    const es = stagesByEpisode[e.id] ?? [];
    return {
      id: e.id,
      number: e.number,
      title: e.title,
      description: e.description,
      cover_image_url: e.cover_image_url,
      status: e.status,
      progress: Number(e.progress ?? 0),
      duration_seconds: e.duration_seconds,
      script: e.script,
      scenario: e.scenario,
      stagesCompleted: es.filter((s) => s.status === "completed").length,
      stagesTotal: es.length,
      hasStoryboard: (scenesByEpisode[e.id] ?? 0) > 0,
      storyboardScenesCount: scenesByEpisode[e.id] ?? 0,
    };
  });

  // ملخص كل مرحلة عبر كل حلقات المشروع (يُستخدم لقسم "رحلة المشروع")
  const stageSummaries: PresentationStageSummary[] = DEFAULT_EPISODE_STAGES.map((stageDef) => {
    const rows = (stages ?? []).filter((s) => s.key === stageDef.key);
    const starts = rows.map((r) => r.started_at).filter((v): v is string => Boolean(v));
    const ends = rows.map((r) => r.completed_at).filter((v): v is string => Boolean(v));
    return {
      key: stageDef.key,
      label: stageDef.label,
      episodesTotal: rows.length,
      completed: rows.filter((r) => r.status === "completed").length,
      inProgress: rows.filter((r) => r.status === "in_progress").length,
      earliestStart: starts.length ? starts.sort()[0] : null,
      latestEnd: ends.length ? ends.sort().reverse()[0] : null,
    };
  }).filter((s) => s.episodesTotal > 0);

  const locations = Array.from(
    new Set([project.location, ...(episodes ?? []).map((e) => e.location), ...(scenes ?? []).map((s) => s.location)].filter((v): v is string => Boolean(v)))
  );

  const equipmentNames = Array.from(
    new Set(
      (sceneEquipment ?? [])
        .map((r) => {
          const eq = r.equipment as { name: string } | { name: string }[] | null;
          return Array.isArray(eq) ? (eq[0]?.name ?? null) : (eq?.name ?? null);
        })
        .filter((v): v is string => Boolean(v))
    )
  );

  const fileCounts = { image: 0, video: 0, document: 0, audio: 0, archive: 0, link: 0, other: 0 };
  for (const f of files ?? []) {
    if (f.category in fileCounts) fileCounts[f.category as keyof typeof fileCounts] += 1;
  }

  const servicesResolved = (services ?? []).map((s) => ({
    category: s.category,
    label: s.label,
  }));

  return {
    companyId,
    projectId,
    companyName: company?.name ?? "",
    companyLogoUrl: company?.logo_url ?? null,
    clientName,
    clientLogoUrl,
    projectName: project.name,
    projectCoverUrl: project.cover_image_url,
    projectDescription: project.description,
    projectLocation: project.location,
    shootingDate: project.shooting_date,
    deliveryDate: project.delivery_date,
    progress: Number(project.progress ?? 0),
    services: servicesResolved,
    episodes: episodeSummaries,
    stages: stageSummaries,
    hasAnyStoryboard: (scenes ?? []).length > 0,
    hasAnyScript: episodeSummaries.some((e) => Boolean(e.script?.trim()) || Boolean(e.scenario?.trim())),
    team: (teamProfiles ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[],
    locations,
    equipmentNames,
    fileCounts,
    referenceLinksCount: fileCounts.link,
    updatedAt: project.updated_at,
  };
}

export function serviceCategoryLabel(category: string): string {
  return SERVICES_CATALOG.find((g) => g.category === category)?.label ?? category;
}
