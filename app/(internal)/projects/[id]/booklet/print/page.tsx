import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { fetchBookletData } from "@/app/lib/booklet-data-server";
import { BOOKLET_SECTIONS, buildTocEntries } from "@/app/lib/booklet-sections";
import { getPresentationTheme } from "@/app/lib/presentation-themes";
import type { ProjectBooklet } from "@/app/lib/types";
import BookletSectionRenderer from "@/app/components/projects/booklet/BookletSectionRenderer";
import BookletPageChrome from "@/app/components/projects/booklet/BookletPageChrome";
import PrintButton from "@/app/components/finance/PrintButton";
import Icon from "@/app/components/ui/Icon";

export const dynamic = "force-dynamic";

// عنوان الصفحة باسم المشروع (بدل عنوان النظام العام) لأن متصفحات الطباعة
// (Ctrl+P → حفظ كـ PDF) تقترح اسم الملف افتراضياً من عنوان الصفحة <title>.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const session = await getCurrentSession();
  if (!session?.company) return {};
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("name").eq("id", id).eq("company_id", session.company.id).maybeSingle();
  return { title: project?.name ? `${project.name} — كتيّب المشروع` : "كتيّب المشروع" };
}

// نفس CSS الطباعة المعتمد في presentation/print/page.tsx بالضبط (صفحة كاملة 16:9
// لكل قسم + print-color-adjust: exact) — مُكرَّر هنا محلياً بدل استيراده لإبقاء كل
// ميزة (عرض فني/كتيّب) مستقلة بمساراتها الخاصة، تماماً كما فُصلت باقي طبقات الكتيّب.
const bookletPrintCss = `
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

export default async function BookletPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: bookletRow } = await supabase.from("project_booklets").select("*").eq("project_id", id).eq("company_id", companyId).maybeSingle();

  if (!bookletRow) notFound();
  const booklet = bookletRow as ProjectBooklet;

  const data = await fetchBookletData(supabase, companyId, id);
  if (!data) notFound();

  const theme = getPresentationTheme(booklet.template, data);
  const ordered = booklet.sections.filter((s) => s.enabled && BOOKLET_SECTIONS.some((def) => def.key === s.key)).map((s) => s.key);
  const tocEntries = buildTocEntries(ordered);

  return (
    <>
      <style>{bookletPrintCss}</style>

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
            <p style={{ fontSize: 15 }}>لا توجد أقسام مفعّلة لهذا الكتيّب بعد.</p>
          </div>
        ) : (
          ordered.map((key, i) =>
            key === "cover" ? (
              <div key={key} id={`section-${key}`} className="presentation-print-page">
                <BookletSectionRenderer sectionKey={key} data={data} texts={booklet.texts} theme={theme} />
              </div>
            ) : (
              <div key={key} id={`section-${key}`} className="presentation-print-page">
                <BookletPageChrome data={data} theme={theme} pageNumber={i + 1} totalPages={ordered.length}>
                  <BookletSectionRenderer sectionKey={key} data={data} texts={booklet.texts} theme={theme} tocEntries={tocEntries} />
                </BookletPageChrome>
              </div>
            )
          )
        )}
      </div>
    </>
  );
}
