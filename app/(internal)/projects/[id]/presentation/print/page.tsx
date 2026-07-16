import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { fetchPresentationData } from "@/app/lib/presentation-data-server";
import { PRESENTATION_SECTIONS } from "@/app/lib/presentation-sections";
import { getPresentationTheme } from "@/app/lib/presentation-themes";
import type { ProjectPresentation } from "@/app/lib/types";
import SectionRenderer from "@/app/components/projects/presentation/SectionRenderer";
import PrintButton from "@/app/components/finance/PrintButton";
import Icon from "@/app/components/ui/Icon";

export const dynamic = "force-dynamic";

// CSS خاص بطباعة العرض التقديمي: كل قسم صفحة كاملة 16:9 مستقلة، وفاصل صفحة بينها،
// مع print-color-adjust: exact حتى تُطبَع خلفيات القوالب الملوّنة فعلياً (المتصفحات
// تتجاهل الخلفيات الملوّنة افتراضياً عند الطباعة ما لم تُفرض صراحةً).
const presentationPrintCss = `
.presentation-print-wrap { display: flex; flex-direction: column; align-items: center; gap: 28px; padding: 28px; background: #0a0a0a; }
.presentation-print-page {
  width: 1280px;
  max-width: 100%;
  height: 720px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  color-adjust: exact;
}
.presentation-print-page * {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  color-adjust: exact;
}
@media print {
  body, .main-content { background: #000 !important; }
  .presentation-print-wrap { padding: 0; gap: 0; background: transparent; }
  .presentation-print-page {
    box-shadow: none;
    border-radius: 0;
    page-break-after: always;
    break-after: page;
    width: 100%;
    height: 100vh;
  }
  .presentation-print-page:last-child { page-break-after: auto; break-after: auto; }
  @page { size: landscape; margin: 0; }
}
`;

export default async function PresentationPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: presentationRow } = await supabase
    .from("project_presentations")
    .select("*")
    .eq("project_id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!presentationRow) notFound();
  const presentation = presentationRow as ProjectPresentation;

  const data = await fetchPresentationData(supabase, companyId, id);
  if (!data) notFound();

  const theme = getPresentationTheme(presentation.template, data);
  const ordered = presentation.sections
    .filter((s) => s.enabled && PRESENTATION_SECTIONS.some((def) => def.key === s.key))
    .map((s) => s.key);

  return (
    <>
      <style>{presentationPrintCss}</style>

      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href={`/projects/${id}`} className="btn btn-outline">
          <Icon name="arrowRight" size={16} /> العودة للمشروع
        </Link>
        <PrintButton label="طباعة / تصدير PDF" />
      </div>

      <div className="presentation-print-wrap">
        {ordered.length === 0 ? (
          <div
            className="presentation-print-page"
            style={{ background: theme.bg, color: theme.text, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <p style={{ fontSize: 15 }}>لا توجد أقسام مفعّلة لهذا العرض بعد.</p>
          </div>
        ) : (
          ordered.map((key) => (
            <div key={key} className="presentation-print-page">
              <SectionRenderer sectionKey={key} data={data} texts={presentation.texts} theme={theme} />
            </div>
          ))
        )}
      </div>
    </>
  );
}
