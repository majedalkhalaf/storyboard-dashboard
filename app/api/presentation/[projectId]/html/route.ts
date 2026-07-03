import React from "react";
import { NextResponse } from "next/server";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { fetchPresentationData } from "@/app/lib/presentation-data-server";
import { PRESENTATION_SECTIONS } from "@/app/lib/presentation-sections";
import { PRESENTATION_THEMES } from "@/app/lib/presentation-themes";
import type { ProjectPresentation } from "@/app/lib/types";
import SectionRenderer from "@/app/components/projects/presentation/SectionRenderer";

// يُصدِّر ملف HTML مستقل قابل للتنزيل يطابق المعاينة الحيّة تماماً — عبر renderToStaticMarkup
// (آمن على السيرفر فقط) لنفس مكوّن SectionRenderer المستخدَم في المعاينة والطباعة، بدل إعادة
// كتابة تسلسل HTML يدوياً بمنطق منفصل عن باقي الميزة. الطلب موثّق ومقيَّد بشركة الجلسة الحالية
// (لا علاقة له بصفحة المشاركة العامة /present/[token] التي تستخدم عميل service_role بدلاً منه).
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const session = await getCurrentSession();
  if (!session || !session.company) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const companyId = session.company.id;
  const supabase = await createClient();

  const { data: presentationRow } = await supabase
    .from("project_presentations")
    .select("*")
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!presentationRow) {
    return NextResponse.json({ error: "لم يتم العثور على إعدادات العرض" }, { status: 404 });
  }
  const presentation = presentationRow as ProjectPresentation;

  const data = await fetchPresentationData(supabase, companyId, projectId);
  if (!data) {
    return NextResponse.json({ error: "تعذّر تحميل بيانات المشروع" }, { status: 404 });
  }

  const theme = PRESENTATION_THEMES[presentation.template];
  const ordered = presentation.sections
    .filter((s) => s.enabled && PRESENTATION_SECTIONS.some((def) => def.key === s.key))
    .map((s) => s.key);

  const slidesMarkup = ordered
    .map((key) =>
      renderToStaticMarkup(
        React.createElement(
          "div",
          { className: "presentation-html-slide" },
          React.createElement(SectionRenderer, { sectionKey: key, data, texts: presentation.texts, theme })
        )
      )
    )
    .join("\n");

  const title = `${data.projectName || "عرض تقديمي"} — ${data.companyName || ""}`.trim();

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #0a0a0a;
    font-family: 'IBM Plex Sans Arabic', Arial, sans-serif;
    padding: 24px;
  }
  .presentation-html-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    max-width: 1280px;
    margin: 0 auto;
  }
  .presentation-html-slide {
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  }
  @media print {
    body { background: #000; padding: 0; }
    .presentation-html-wrap { gap: 0; }
    .presentation-html-slide { border-radius: 0; box-shadow: none; page-break-after: always; }
  }
</style>
</head>
<body>
<div class="presentation-html-wrap">
${slidesMarkup}
</div>
</body>
</html>`;

  const safeFileName = (data.projectName || "presentation").replace(/[^\w؀-ۿ -]/g, "").trim() || "presentation";

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFileName}.html"`,
    },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
