import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { canClient } from "@/app/lib/permissions";
import { safeStorageKey } from "@/app/lib/storage-path";
import type { ClientPermissions } from "@/app/lib/types";

const MAX_COVER_BYTES = 20 * 1024 * 1024;
const TEAM_ROLES = ["super_admin", "company_owner", "admin", "team_member"];

// يعدّل عنوان/وصف/غلاف حلقة نيابة عن العميل، بعد التحقق من صلاحية
// edit_episode على مشروعه تحديداً — العميل لا يملك صلاحية RLS للتعديل
// المباشر على جدول الحلقات (نفس نمط رفع مرفقات طلب التعديل عبر service_role).
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "client") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const formData = await request.formData();
    const episodeId = formData.get("episodeId");
    const projectId = formData.get("projectId");
    const title = formData.get("title");
    const description = formData.get("description");
    const coverFile = formData.get("cover");

    if (
      typeof episodeId !== "string" || !episodeId ||
      typeof projectId !== "string" || !projectId ||
      typeof title !== "string" || !title.trim()
    ) {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }
    if (coverFile instanceof File && coverFile.size > MAX_COVER_BYTES) {
      return NextResponse.json({ error: "حجم صورة الغلاف كبير جداً (الحد الأقصى 20 ميجابايت)" }, { status: 413 });
    }

    const { data: pc } = await supabase
      .from("project_clients")
      .select("permissions")
      .eq("project_id", projectId)
      .eq("client_user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    const permissions = pc?.permissions as ClientPermissions | undefined;
    if (!canClient(permissions, "edit_episode")) {
      return NextResponse.json({ error: "لا تملك صلاحية تعديل بيانات هذه الحلقة" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: episode } = await admin
      .from("episodes")
      .select("id, company_id, project_id")
      .eq("id", episodeId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!episode) return NextResponse.json({ error: "الحلقة غير موجودة" }, { status: 404 });

    let coverUrl: string | undefined;
    if (coverFile instanceof File && coverFile.size > 0) {
      const path = `${episode.company_id}/covers/${safeStorageKey(coverFile.name)}`;
      const { error: uploadError } = await admin.storage
        .from("public-assets")
        .upload(path, coverFile, { upsert: false, contentType: coverFile.type || undefined });
      if (uploadError) return NextResponse.json({ error: "تعذّر رفع صورة الغلاف" }, { status: 500 });
      coverUrl = admin.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = typeof description === "string" ? description.trim() || null : null;
    const update: Record<string, unknown> = { title: trimmedTitle, description: trimmedDescription };
    if (coverUrl) update.cover_image_url = coverUrl;

    const { error: updateError } = await admin.from("episodes").update(update).eq("id", episodeId);
    if (updateError) return NextResponse.json({ error: "تعذّر حفظ التعديلات" }, { status: 500 });

    await admin.from("activity_logs").insert({
      company_id: episode.company_id,
      project_id: projectId,
      episode_id: episodeId,
      actor_id: user.id,
      actor_role: "client",
      action: "episode_updated",
      details: { title: trimmedTitle, source: "client" },
    });

    const { data: teamMembers } = await admin.from("profiles").select("id").eq("company_id", episode.company_id).in("role", TEAM_ROLES);
    if (teamMembers && teamMembers.length > 0) {
      await admin.from("notifications").insert(
        teamMembers.map((m) => ({
          user_id: m.id,
          company_id: episode.company_id,
          project_id: projectId,
          episode_id: episodeId,
          type: "client_episode_edit",
          title: "تعديل من العميل على بيانات حلقة",
          message: `تم تعديل بيانات حلقة "${trimmedTitle}" من طرف العميل`,
        }))
      );
    }

    return NextResponse.json({ title: trimmedTitle, description: trimmedDescription, cover_image_url: coverUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر حفظ التعديلات" }, { status: 500 });
  }
}
