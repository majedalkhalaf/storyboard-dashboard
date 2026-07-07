"use client";

import { createClient } from "@/app/lib/supabase/client";
import { startR2Upload } from "@/app/lib/r2-upload";
import type { BehindScenesMediaType } from "@/app/lib/types";

export function mediaTypeOf(file: File): BehindScenesMediaType {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

// رفع ملف وسائط لمنشورات الكواليس/العمل الجاري. الفيديو يذهب دائماً عبر Cloudflare
// R2 (نفس مسار ملفات الحلقة الكبيرة) بدل مساحة public-assets على Supabase Storage
// التي يحدّها سقف خطة Supabase المجانية (50 ميجابايت للملف) — بدون هذا التفرّع كان
// أي فيديو أكبر من ذلك يفشل رفعه بصمت هنا تماماً كما كان يفشل رفع فيديو الحلقة نفسه
// قبل دمج R2. الصور والملفات الصوتية تبقى على public-assets لأنها غالباً صغيرة ولا
// تحتاج تعقيد الرفع المجزّأ.
export async function uploadMediaFile(
  file: File,
  opts: { companyId: string; projectId: string; episodeId: string | null; pathPrefix: string }
): Promise<{ type: BehindScenesMediaType; url: string; name: string } | null> {
  const type = mediaTypeOf(file);

  if (type === "video") {
    let key = "";
    const uploaded = await new Promise<boolean>((resolve) => {
      startR2Upload({ file, projectId: opts.projectId, episodeId: opts.episodeId, category: "video" }, { onSuccess: () => resolve(true), onError: () => resolve(false) }).then(
        (res) => {
          key = res.key;
        }
      );
    });
    const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    if (!uploaded || !base || !key) return null;
    return { type, url: `${base.replace(/\/+$/, "")}/${key}`, name: file.name };
  }

  const supabase = createClient();
  const path = `${opts.companyId}/${opts.pathPrefix}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
  const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) return null;
  const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
  return { type, url: data.publicUrl, name: file.name };
}
