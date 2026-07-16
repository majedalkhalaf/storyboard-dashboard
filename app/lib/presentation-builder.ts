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

function isBlankTextValue(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim() === "");
}

// يُنشئ صفاً افتراضياً عند أول فتح لمُنشئ العرض لهذا المشروع (أقسام مفعّلة تلقائياً حسب
// توفّر بياناتها الفعلية)، أو يعيد الصف الموجود مسبقاً مع بيانات المشروع الحيّة الحالية —
// بيانات المشروع نفسها ليست مخزَّنة، فقط إعدادات الأقسام/القالب/النصوص.
export async function loadPresentationBundle(companyId: string, userId: string, projectId: string): Promise<PresentationBundle> {
  const supabase = createClient();
  const data = await fetchPresentationData(supabase, companyId, projectId);
  if (!data) throw new Error("تعذّر تحميل بيانات المشروع لإنشاء العرض");

  // النصوص الافتراضية: نصوص الشركة العامة (نبذة/رؤية/قيم/كلمة المدير) من إعدادات الشركة،
  // مدموجة بنصوص تسويقية خاصة بهذا المشروع تحديداً (تُبنى فوراً من اسمه ووصفه وخدماته
  // وحلقاته الفعلية — بلا أي اعتماد على ذكاء اصطناعي خارجي). تُحسَب دائماً (وليس فقط عند
  // إنشاء أول عرض) لأنها تُستخدم أيضاً لتعبئة أي حقل فارغ في عرض موجود مسبقاً (راجع أدناه).
  const { data: companyRow } = await supabase.from("companies").select("presentation_defaults").eq("id", companyId).single();
  const companyDefaults = (companyRow?.presentation_defaults ?? {}) as PresentationDefaultTexts;
  const smartTexts = generateSmartPresentationTexts(data);
  const fallbackTexts: PresentationTexts = { ...companyDefaults, ...smartTexts };

  const { data: existing } = await supabase.from("project_presentations").select("*").eq("project_id", projectId).maybeSingle();

  if (existing) {
    // عروض أُنشئت قبل إضافة مولّد النصوص التسويقية الذكية (أو قبل إعداد نصوص الشركة
    // الافتراضية) بقيت بحقول نصوص فارغة تماماً بلا أي تعبئة تلقائية لاحقة — لأن التعبئة
    // كانت تحدث فقط عند إنشاء الصف لأول مرة. نُكمّل هنا أي حقل ما زال فارغاً (بلا الكتابة
    // فوق أي نص عدّله المستخدم فعلياً) في كل مرة يُفتح فيها منشئ العرض.
    const currentTexts = (existing.texts ?? {}) as PresentationTexts;
    const merged: PresentationTexts = { ...currentTexts };
    let changed = false;
    (Object.keys(fallbackTexts) as (keyof PresentationTexts)[]).forEach((key) => {
      if (isBlankTextValue(currentTexts[key]) && !isBlankTextValue(fallbackTexts[key])) {
        (merged as Record<string, unknown>)[key] = fallbackTexts[key];
        changed = true;
      }
    });

    if (!changed) return { data, presentation: existing as ProjectPresentation };

    await supabase.from("project_presentations").update({ texts: merged }).eq("id", existing.id);
    return { data, presentation: { ...(existing as ProjectPresentation), texts: merged } };
  }

  const { data: created, error } = await supabase
    .from("project_presentations")
    .insert({
      company_id: companyId,
      project_id: projectId,
      created_by: userId,
      sections: buildDefaultSectionConfig(data),
      texts: fallbackTexts,
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
