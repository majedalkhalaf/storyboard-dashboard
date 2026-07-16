"use client";

import { createClient } from "@/app/lib/supabase/client";
import { fetchBookletData } from "@/app/lib/booklet-data-server";
import { buildDefaultBookletSectionConfig, type BookletData } from "@/app/lib/booklet-sections";
import { generateSmartBookletTexts } from "@/app/lib/booklet-copywriter";
import type { BookletTexts, PresentationDefaultTexts, ProjectBooklet } from "@/app/lib/types";

export interface BookletBundle {
  data: BookletData;
  booklet: ProjectBooklet;
}

// نفس فكرة loadPresentationBundle تماماً: يُنشئ صفاً افتراضياً عند أول فتح لمُنشئ
// الكتيّب لهذا المشروع، أو يعيد الصف الموجود مسبقاً مع بيانات المشروع الحيّة الحالية.
export async function loadBookletBundle(companyId: string, userId: string, projectId: string): Promise<BookletBundle> {
  const supabase = createClient();
  const data = await fetchBookletData(supabase, companyId, projectId);
  if (!data) throw new Error("تعذّر تحميل بيانات المشروع لإنشاء الكتيّب");

  const { data: existing } = await supabase.from("project_booklets").select("*").eq("project_id", projectId).maybeSingle();
  if (existing) return { data, booklet: existing as ProjectBooklet };

  // نصوص الشركة العامة (نبذة/رؤية/قيم/كلمة المدير) من نفس مصدر العرض الفني،
  // مدموجة بنصوص رجعية-محورية خاصة بهذا الكتيّب (رسالة تسليم/ملخص إنجازات/ختامية)
  // تُبنى فوراً من الإحصائيات الفعلية للمشروع — بلا أي اعتماد على ذكاء اصطناعي خارجي.
  const { data: companyRow } = await supabase.from("companies").select("presentation_defaults").eq("id", companyId).single();
  const companyDefaults = (companyRow?.presentation_defaults ?? {}) as PresentationDefaultTexts;
  const smartTexts = generateSmartBookletTexts(data);
  const initialTexts: BookletTexts = {
    company_bio: companyDefaults.company_bio,
    company_values: companyDefaults.company_values,
    company_vision: companyDefaults.company_vision,
    ceo_message: companyDefaults.ceo_message,
    ...smartTexts,
  };

  const { data: created, error } = await supabase
    .from("project_booklets")
    .insert({
      company_id: companyId,
      project_id: projectId,
      created_by: userId,
      sections: buildDefaultBookletSectionConfig(data),
      texts: initialTexts,
    })
    .select("*")
    .single();
  if (error || !created) throw error ?? new Error("تعذّر إنشاء إعدادات الكتيّب");
  return { data, booklet: created as ProjectBooklet };
}

export async function refreshBookletData(companyId: string, projectId: string): Promise<BookletData> {
  const supabase = createClient();
  const data = await fetchBookletData(supabase, companyId, projectId);
  if (!data) throw new Error("تعذّر تحميل بيانات المشروع");
  return data;
}

export async function saveBookletPatch(id: string, patch: Partial<Pick<ProjectBooklet, "sections" | "texts" | "template">>) {
  const supabase = createClient();
  await supabase.from("project_booklets").update(patch).eq("id", id);
}

export async function setBookletSharing(id: string, enabled: boolean, currentToken: string | null): Promise<string> {
  const supabase = createClient();
  const token = currentToken ?? crypto.randomUUID();
  await supabase.from("project_booklets").update({ share_enabled: enabled, share_token: token }).eq("id", id);
  return token;
}
