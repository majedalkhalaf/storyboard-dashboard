import React from "react";
import { NextResponse } from "next/server";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { fetchBookletData } from "@/app/lib/booklet-data-server";
import { BOOKLET_SECTIONS, buildTocEntries } from "@/app/lib/booklet-sections";
import { getPresentationTheme } from "@/app/lib/presentation-themes";
import type { ProjectBooklet } from "@/app/lib/types";
import BookletSectionRenderer from "@/app/components/projects/booklet/BookletSectionRenderer";
import BookletPageChrome from "@/app/components/projects/booklet/BookletPageChrome";

// نفس منطق api/presentation/[projectId]/html/route.ts تماماً (renderToStaticMarkup لنفس
// مكوّن العرض المستخدَم في المعاينة/الطباعة) لكن لبيانات الكتيّب — مقيَّد بشركة الجلسة الحالية.
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const session = await getCurrentSession();
  if (!session || !session.company) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const companyId = session.company.id;
  const supabase = await createClient();

  const { data: bookletRow } = await supabase.from("project_booklets").select("*").eq("project_id", projectId).eq("company_id", companyId).maybeSingle();

  if (!bookletRow) {
    return NextResponse.json({ error: "لم يتم العثور على إعدادات الكتيّب" }, { status: 404 });
  }
  const booklet = bookletRow as ProjectBooklet;

  const data = await fetchBookletData(supabase, companyId, projectId);
  if (!data) {
    return NextResponse.json({ error: "تعذّر تحميل بيانات المشروع" }, { status: 404 });
  }

  const theme = getPresentationTheme(booklet.template, data);
  const ordered = booklet.sections.filter((s) => s.enabled && BOOKLET_SECTIONS.some((def) => def.key === s.key)).map((s) => s.key);
  const tocEntries = buildTocEntries(ordered);

  const slidesMarkup = ordered
    .map((key, i) =>
      renderToStaticMarkup(
        React.createElement(
          "div",
          { className: "presentation-html-slide", id: `section-${key}` },
          key === "cover"
            ? React.createElement(BookletSectionRenderer, { sectionKey: key, data, texts: booklet.texts, theme })
            : React.createElement(
                BookletPageChrome,
                { data, theme, pageNumber: i + 1, totalPages: ordered.length },
                React.createElement(BookletSectionRenderer, { sectionKey: key, data, texts: booklet.texts, theme, tocEntries })
              )
        )
      )
    )
    .join("\n");

  const title = `${data.projectName || "كتيّب المشروع"} — ${data.companyName || ""}`.trim();

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

  const safeFileName = (data.projectName || "booklet").replace(/[^\w؀-ۿ -]/g, "").trim() || "booklet";

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFileName}-كتيب.html"`,
    },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
