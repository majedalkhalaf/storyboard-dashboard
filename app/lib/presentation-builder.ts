"use client";

import { createClient } from "@/app/lib/supabase/client";
import { fetchPresentationData } from "@/app/lib/presentation-data-server";
import { buildDefaultSectionConfig, type PresentationData } from "@/app/lib/presentation-sections";
import { generateSmartPresentationTexts } from "@/app/lib/presentation-copywriter";
import type { PresentationDefaultTexts, PresentationTexts, ProjectPresentation } from "@/app/lib/types";

export interface PresentationBundle {
  data: PresentationData;
  presentation: ProjectPresentation;
}

// يُنشئ صفاً افتراضياً عند أول فتح لمُنشئ العرض لهذا المشروع (أقسام مفعّلة تلقائياً حسب
// توفّر بياناتها الفعلية)، أو يعيد الصف الموجود مسبقاً مع بيانات المشروع الحيّة الحالية —
// بيانات المشروع نفسها ليست مخزَّنة، فقط إعدادات الأقسام/القالب/النصوص.
export async function loadPresentationBundle(companyId: string, userId: string, projectId: string): Promise<PresentationBundle> {
  const supabase = createClient();
  const data = await fetchPresentationData(supabase, companyId, projectId);
  if (!data) throw new Error("تعذّر تحميل بيانات المشروع لإنشاء العرض");

  const { data: existing } = await supabase.from("project_presentations").select("*").eq("project_id", projectId).maybeSingle();
  if (existing) return { data, presentation: existing as ProjectPresentation };

  // النصوص الابتدائية لأول عرض لهذا المشروع: نصوص الشركة العامة (نبذة/رؤية/قيم/
  // كلمة المدير) من إعدادات الشركة الافتراضية، مدموجة بنصوص تسويقية خاصة بهذا
  // المشروع تحديداً (تُبنى فوراً من اسمه ووصفه وخدماته وحلقاته الفعلية — بلا أي
  // اعتماد على ذكاء اصطناعي خارجي). كلاهما قابل للتعديل الكامل لاحقاً من تبويب النصوص.
  const { data: companyRow } = await supabase.from("companies").select("presentation_defaults").eq("id", companyId).single();
  const companyDefaults = (companyRow?.presentation_defaults ?? {}) as PresentationDefaultTexts;
  const smartTexts = generateSmartPresentationTexts(data);
  const initialTexts: PresentationTexts = { ...companyDefaults, ...smartTexts };

  const { data: created, error } = await supabase
    .from("project_presentations")
    .insert({
      company_id: companyId,
      project_id: projectId,
      created_by: userId,
      sections: buildDefaultSectionConfig(data),
      texts: initialTexts,
    })
    .select("*")
    .single();
  if (error || !created) throw error ?? new Error("تعذّر إنشاء إعدادات العرض");
  return { data, presentation: created as ProjectPresentation };
}

export async function refreshPresentationData(companyId: string, projectId: string): Promise<PresentationData> {
  const supabase = createClient();
  const data = await fetchPresentationData(supabase, companyId, projectId);
  if (!data) throw new Error("تعذّر تحميل بيانات المشروع");
  return data;
}

export async function savePresentationPatch(id: string, patch: Partial<Pick<ProjectPresentation, "sections" | "texts" | "template">>) {
  const supabase = createClient();
  await supabase.from("project_presentations").update(patch).eq("id", id);
}

export async function setPresentationSharing(id: string, enabled: boolean, currentToken: string | null): Promise<string> {
  const supabase = createClient();
  const token = currentToken ?? crypto.randomUUID();
  await supabase.from("project_presentations").update({ share_enabled: enabled, share_token: token }).eq("id", id);
  return token;
}
