"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import ZipExportButton from "@/app/components/ui/ZipExportButton";
import ClientInviteModal from "@/app/components/projects/ClientInviteModal";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { exportProjectZip } from "@/app/lib/zip-export";
import type { Project } from "@/app/lib/types";
import type { EpisodeGalleryItem, StageBadge } from "@/app/lib/episode-gallery";
import type { ZipProgress } from "@/app/lib/zip-export";

interface ActionDef {
  icon: IconName;
  label: string;
  href?: string;
}

// شارة مرحلة افتراضية محايدة — الأرشيف المُصدَّر من البطاقة لا يعرض شارات المراحل
// لأي مستخدم (هذه القيمة لا تظهر في واجهة المستخدم إطلاقاً)، فهي مجرّد قيمة قانونية
// لإرضاء نوع EpisodeGalleryItem الذي يحتاجه exportProjectZip.
const NEUTRAL_STAGE_BADGE: StageBadge = { label: "", color: "#6B7280" };

function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const copy = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
}

export default function ProjectQuickActions({
  projectId,
  projectName,
  onArchive,
}: {
  projectId: string;
  projectName: string;
  /** يُستدعى بعد تأكيد المستخدم للأرشفة (بعد نجاح تحديث الحالة في القاعدة) — البطاقة الأب تحدّث حالتها المحلية */
  onArchive?: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const { company } = useSession();
  const companyId = company!.id;

  const [showInvite, setShowInvite] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const actions: ActionDef[] = [
    { icon: "eye", label: "فتح المشروع", href: `/projects/${projectId}` },
    { icon: "edit", label: "تحرير", href: `/projects/${projectId}` },
    { icon: "userPlus", label: "دعوة العميل" },
    { icon: "contracts", label: "العقد", href: "/contracts" },
    { icon: "proposals", label: "العرض", href: "/proposals" },
    { icon: "invoices", label: "الفواتير", href: "/invoices" },
    { icon: "finance", label: "الحساب", href: `/accounts/${projectId}` },
    { icon: "files", label: "الملفات", href: `/files?project=${projectId}` },
    { icon: "export", label: "التقرير", href: `/export/project/${projectId}` },
    { icon: "settings", label: "الإعدادات", href: `/projects/${projectId}` },
    // ملاحظة: الرابط أدناه لا يفتح تلقائياً نافذة "حلقة جديدة" — صفحة المشروع لا تقرأ
    // معامل new_episode من الرابط حالياً (يتطلب تعديل EpisodeWorkspace.tsx، خارج نطاق هذه المهمة).
    { icon: "plus", label: "إضافة حلقة", href: `/projects/${projectId}?new_episode=1` },
    { icon: "upload", label: "رفع ملف", href: `/files?project=${projectId}` },
  ];

  // جلب مصغّر لغرض تصدير ZIP فقط: exportProjectZip يحتاج شكل EpisodeGalleryItem[] لمعرفة
  // عدد الحلقات ومعدّل الإنجاز في ملخص التقرير، لكنه لا يقرأ stageBadge/الأعداد الفرعية
  // إطلاقاً أثناء التصدير (يُعيد جلب تفاصيل كل حلقة كاملة بنفسه عبر fetchEpisodeDetail).
  // لذا نبني هنا استعلاماً خفيفاً بدل استدعاء getEpisodeGallery الكامل (وهو دالة خادم فقط
  // Server Component لا يمكن استدعاؤها من مكوّن "use client" كهذا).
  async function fetchGalleryForExport(): Promise<EpisodeGalleryItem[]> {
    const { data } = await supabase
      .from("episodes")
      .select("id, project_id, number, title, description, type, status, progress, pipeline_stage, kind, kind_label, cover_image_url, duration_seconds, updated_at")
      .eq("project_id", projectId)
      .order("sort_order");
    return (data ?? []).map((e) => ({
      id: e.id,
      project_id: e.project_id,
      number: e.number,
      title: e.title,
      description: e.description,
      type: e.type,
      status: e.status,
      progress: Number(e.progress ?? 0),
      pipeline_stage: e.pipeline_stage,
      kind: e.kind ?? "regular",
      kind_label: e.kind_label ?? null,
      cover_image_url: e.cover_image_url,
      duration_seconds: e.duration_seconds,
      assigned_to_name: null,
      updated_at: e.updated_at,
      stageBadge: NEUTRAL_STAGE_BADGE,
      filesCount: 0,
      notesCount: 0,
      commentsCount: 0,
      versionsCount: 0,
      hasActiveApproval: false,
      unreadCount: 0,
    }));
  }

  async function runProjectExport(onProgress: (p: ZipProgress) => void) {
    const [{ data: projectRow }, gallery] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      fetchGalleryForExport(),
    ]);
    if (!projectRow) throw new Error("تعذّر تحميل بيانات المشروع");
    await exportProjectZip(supabase, companyId, projectRow as Project, gallery, onProgress);
  }

  // الأرشفة هي البديل الآمن والقابل للتراجع بدل حذف نهائي حقيقي للمشروع (Hard Delete) —
  // حذف نهائي فعلي يمسح كل الحلقات/الملفات/الفواتير المرتبطة بلا رجعة، وهو إجراء أخطر
  // بكثير من مجرد اختصار بطاقة، فتُرك عمداً خارج نطاق هذه الميزة.
  async function archiveProject() {
    if (!confirm(`أرشفة المشروع "${projectName}"؟ يمكنك إعادته لاحقاً من الإعدادات.`)) return;
    setArchiving(true);
    try {
      await supabase.from("projects").update({ status: "archived" }).eq("id", projectId);
      await logActivity(supabase, { companyId, projectId, action: "project_status_changed", details: { to: "archived" } });
      onArchive?.();
    } finally {
      setArchiving(false);
    }
  }

  // تكرار كامل: صف المشروع نفسه + كل حلقاته + مراحل كل حلقة (episode_stages) —
  // لا تُنسخ الملفات/الملاحظات/الفواتير/الاعتمادات لأنها بيانات خاصة بنسخة
  // العمل الفعلية وليست "قالباً" يصح تكراره، وتُعاد كل الحلقات المُكرَّرة إلى
  // حالة "لم يبدأ" ونسبة إنجاز 0% بدل نسخ تقدّم عمل لم يحدث فعلاً في النسخة الجديدة.
  async function duplicateProject() {
    if (!confirm(`تكرار المشروع "${projectName}" بكل حلقاته ومراحلها؟`)) return;
    setDuplicating(true);
    try {
      const { data: original } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (!original) return;
      const rest = omit(original, ["id", "created_at", "updated_at"]);
      const { data: inserted, error } = await supabase
        .from("projects")
        .insert({ ...rest, name: `${original.name} (نسخة)`, status: "planning", progress: 0, code: null })
        .select("id")
        .single();
      if (error || !inserted) return;

      const { data: episodes } = await supabase.from("episodes").select("*").eq("project_id", projectId).order("sort_order");
      for (const ep of episodes ?? []) {
        const epRest = omit(ep, ["id", "created_at", "updated_at"]);
        const { data: newEp } = await supabase
          .from("episodes")
          .insert({ ...epRest, project_id: inserted.id, status: "not_started", progress: 0 })
          .select("id")
          .single();
        if (!newEp) continue;
        const { data: stages } = await supabase.from("episode_stages").select("*").eq("episode_id", ep.id);
        if (stages && stages.length > 0) {
          const clones = stages.map((s) => ({ ...omit(s, ["id", "created_at", "updated_at"]), episode_id: newEp.id, status: "pending", progress: 0, started_at: null, completed_at: null }));
          await supabase.from("episode_stages").insert(clones);
        }
      }

      await logActivity(supabase, { companyId, projectId: inserted.id, action: "project_duplicated", details: { from: projectId, name: original.name } });
      router.push(`/projects/${inserted.id}`);
    } finally {
      setDuplicating(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        {actions.map((a) =>
          a.href ? (
            <Link
              key={a.label}
              href={a.href}
              title={a.label}
              onClick={(e) => e.stopPropagation()}
              className="btn-ghost"
              style={{ padding: 7, borderRadius: 8, color: "var(--text-muted)" }}
            >
              <Icon name={a.icon} size={15} />
            </Link>
          ) : (
            <button
              key={a.label}
              title={a.label}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowInvite(true);
              }}
              className="btn-ghost"
              style={{ padding: 7, borderRadius: 8, color: "var(--text-muted)" }}
            >
              <Icon name={a.icon} size={15} />
            </button>
          )
        )}

        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <ZipExportButton label="تصدير المشروع ZIP" icon="archive" run={runProjectExport} size="sm" />
        </div>

        <button
          title="تكرار المشروع"
          disabled={duplicating}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            duplicateProject();
          }}
          className="btn-ghost"
          style={{ padding: 7, borderRadius: 8, color: "var(--text-muted)", cursor: duplicating ? "wait" : "pointer" }}
        >
          <Icon name="copy" size={15} />
        </button>

        <button
          title="أرشفة المشروع"
          disabled={archiving}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            archiveProject();
          }}
          className="btn-ghost"
          style={{ padding: 7, borderRadius: 8, color: "var(--text-muted)", cursor: archiving ? "wait" : "pointer" }}
        >
          <Icon name="archive" size={15} />
        </button>
      </div>

      {showInvite && (
        <div onClick={(e) => e.stopPropagation()}>
          <ClientInviteModal projectId={projectId} onClose={() => setShowInvite(false)} onInvited={() => setShowInvite(false)} />
        </div>
      )}
    </>
  );
}
