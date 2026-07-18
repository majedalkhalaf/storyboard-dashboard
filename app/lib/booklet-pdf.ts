import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { BOOKLET_SECTIONS, buildTocEntries, type BookletData } from "@/app/lib/booklet-sections";
import type { PresentationTheme } from "@/app/lib/presentation-themes";
import type { ProjectBooklet } from "@/app/lib/types";
import BookletSectionRenderer from "@/app/components/projects/booklet/BookletSectionRenderer";

// نفس منطق presentation-pdf.ts تماماً (تصيير كل قسم خارج الشاشة إلى صورة عبر
// html-to-image ثم تجميعها في PDF واحد عبر jsPDF) — بلا أي اعتماد على مربع
// طباعة المتصفح، مطبَّق على الكتيّب بدل العرض الفني.

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

export async function buildBookletPdf(
  data: BookletData,
  booklet: ProjectBooklet,
  theme: PresentationTheme,
  onProgress?: (p: PdfExportProgress) => void
): Promise<void> {
  const ordered = booklet.sections.filter((s) => s.enabled && BOOKLET_SECTIONS.some((def) => def.key === s.key)).map((s) => s.key);
  if (ordered.length === 0) throw new Error("لا توجد أقسام مفعّلة لهذا الكتيّب");
  const tocEntries = buildTocEntries(ordered);

  // انظر presentation-pdf.ts لسبب استخدام z-index سالب بدل إزاحة هائلة خارج
  // الشاشة — الإزاحة الهائلة كانت تُنتج صفحات فارغة تماماً مع html-to-image.
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
        root.render(createElement(BookletSectionRenderer, { sectionKey: key, data, texts: booklet.texts, theme, tocEntries }));
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

    const safeName = (data.projectName || "booklet").replace(/[\\/:*?"<>|]/g, "").trim() || "booklet";
    pdf.save(`${safeName}-كتيب.pdf`);
  } finally {
    root.unmount();
    container.remove();
  }
}
