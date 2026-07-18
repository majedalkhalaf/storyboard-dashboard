import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { PRESENTATION_SECTIONS, type PresentationData } from "@/app/lib/presentation-sections";
import type { PresentationTheme } from "@/app/lib/presentation-themes";
import type { ProjectPresentation } from "@/app/lib/types";
import SectionRenderer from "@/app/components/projects/presentation/SectionRenderer";

// يبني ملف PDF حقيقي بالكامل داخل المتصفح (بلا أي اعتماد على مربع طباعة
// المتصفح أو خصائص CSS للطباعة المُجزَّأة) — كل قسم مفعّل يُصيَّر خارج الشاشة
// إلى صورة عالية الجودة عبر html-to-image، ثم تُجمَّع الصور في مستند PDF واحد
// بنفس ترتيب الأقسام عبر jsPDF. هذا يضمن تصدير كل الصفحات دائماً بغضّ النظر عن
// متصفح/جهاز المستخدم، تماماً كما يعمل تصدير PowerPoint المعتمد على pptxgenjs
// أصلاً دون أي اعتماد على آلية طباعة المتصفح.

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

function waitForImages(container: HTMLElement, timeoutMs = 8000): Promise<void> {
  const imgs = Array.from(container.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        setTimeout(done, timeoutMs);
      });
    })
  ).then(() => undefined);
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export interface PdfExportProgress {
  index: number;
  total: number;
}

export async function buildPresentationPdf(
  data: PresentationData,
  presentation: ProjectPresentation,
  theme: PresentationTheme,
  onProgress?: (p: PdfExportProgress) => void
): Promise<void> {
  const ordered = presentation.sections.filter((s) => s.enabled && PRESENTATION_SECTIONS.some((def) => def.key === s.key)).map((s) => s.key);
  if (ordered.length === 0) throw new Error("لا توجد أقسام مفعّلة لهذا العرض");

  // حاوية مخفيّة خلف باقي الصفحة (وليست display:none — العناصر المخفية تماماً
  // لا تُرسَم فتُعطي صوراً فارغة، وليست بإزاحة هائلة خارج الشاشة أيضاً — تبيّن
  // تجريبياً أن html-to-image يُصيّر صفحة سوداء فارغة تماماً عند وضع الحاوية
  // على إحداثيات بعيدة جداً عن حدود الشاشة الفعلية). z-index سالب يبقيها ضمن
  // حدود إحداثيات معقولة لكن خلف كل المحتوى الحقيقي وغير قابلة للتفاعل.
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.insetInlineStart = "0";
  container.style.zIndex = "-1";
  container.style.width = `${SLIDE_WIDTH}px`;
  container.style.height = `${SLIDE_HEIGHT}px`;
  container.style.overflow = "hidden";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);
  const root = createRoot(container);

  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [SLIDE_WIDTH, SLIDE_HEIGHT], compress: true });

  try {
    for (let i = 0; i < ordered.length; i++) {
      const key = ordered[i];
      onProgress?.({ index: i + 1, total: ordered.length });

      await new Promise<void>((resolve) => {
        root.render(createElement(SectionRenderer, { sectionKey: key, data, texts: presentation.texts, theme }));
        resolve();
      });
      await waitForPaint();
      await waitForImages(container);

      const dataUrl = await toPng(container, {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        pixelRatio: 1.5,
        backgroundColor: theme.bg,
        skipFonts: true,
        cacheBust: true,
      });

      if (i > 0) pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], "landscape");
      pdf.addImage(dataUrl, "PNG", 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT);
    }

    const safeName = (data.projectName || "presentation").replace(/[\\/:*?"<>|]/g, "").trim() || "presentation";
    pdf.save(`${safeName}.pdf`);
  } finally {
    root.unmount();
    container.remove();
  }
}
