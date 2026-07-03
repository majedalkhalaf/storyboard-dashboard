// فحص تشخيصي (قراءة فقط) لمتغيرات البيئة الحرجة — لا يستطيع أي كود يعمل داخل
// التطبيق المنشور فعلياً كتابة متغيرات بيئة على المنصة المستضيفة (Netlify)، لذا هذا
// تقرير تشخيصي واضح يُعرض للمسؤول بدل شاشة خطأ غير مفهومة، وليس إصلاحاً تلقائياً.
export interface EnvCheckItem {
  key: string;
  label: string;
  ok: boolean;
  fixHint: string;
}

export function getEnvHealthReport(): EnvCheckItem[] {
  return [
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      label: "مفتاح Supabase الإداري (service_role)",
      ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      fixHint: "أضِفه من Supabase Dashboard → Project Settings → API → service_role، ثم أضِفه في Netlify → Site settings → Environment variables.",
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      label: "رابط مشروع Supabase",
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      fixHint: "أضِفه من Supabase Dashboard → Project Settings → API → Project URL.",
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      label: "مفتاح Supabase العام (anon)",
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      fixHint: "أضِفه من Supabase Dashboard → Project Settings → API → anon public.",
    },
  ];
}
