"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { UpdateCard, UpdateComposer, type UpdateRow } from "@/app/components/projects/sections/ProjectProgressUpdatesSection";
import type { ProgressUpdate } from "@/app/lib/types";
import type { EpisodeFullDetail } from "@/app/lib/episode-detail";

// نسخة مصغّرة من قسم "العمل الجاري" مخصّصة لحلقة واحدة بعينها — كل تحديث هنا
// مُثبَّت تلقائياً على هذه الحلقة، ويظهر ضمن مرفقات الحلقة نفسها، بالإضافة
// لظهوره أيضاً في قسم العمل الجاري العام للمشروع وفي صفحة "العمل الجاري"
// الشاملة لكل المشاريع.
export default function EpisodeProgressTab({ episode }: { episode: EpisodeFullDetail }) {
  const [updates, setUpdates] = useState<UpdateRow[] | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("progress_updates")
      .select("*, author:profiles!author_id(full_name)")
      .eq("episode_id", episode.id)
      .order("created_at", { ascending: false });

    const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
    const rows = ((data ?? []) as Record<string, unknown>[]).map((u) => ({
      ...(u as unknown as ProgressUpdate),
      author_name: one<{ full_name: string | null }>(u.author as never)?.full_name ?? null,
      episode_title: null,
    })) as UpdateRow[];
    setUpdates(rows);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل تحديثات عمل هذه الحلقة عند فتح التبويب، النمط القياسي في هذا المشروع
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`progress-episode:${episode.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "progress_updates", filter: `episode_id=eq.${episode.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load مُعاد إنشاؤه كل عرض عمداً ليقرأ episode.id الحالي دوماً
  }, [episode.id]);

  async function deleteUpdate(id: string) {
    if (!confirm("حذف هذا التحديث نهائياً؟")) return;
    const supabase = createClient();
    await supabase.from("progress_updates").delete().eq("id", id);
    load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-gold" style={{ fontSize: 12.5 }} onClick={() => setComposerOpen(true)}>
          <Icon name="plus" size={15} /> تحديث جديد لهذه الحلقة
        </button>
      </div>

      {composerOpen && (
        <UpdateComposer
          companyId={episode.company_id}
          projectId={episode.project_id}
          episodes={[]}
          lockEpisodeId={episode.id}
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            setComposerOpen(false);
            load();
          }}
        />
      )}

      {!updates ? (
        <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />
      ) : updates.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا توجد تحديثات عمل جارٍ لهذه الحلقة بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {updates.map((u) => (
            <UpdateCard key={u.id} update={u} onDelete={() => deleteUpdate(u.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
