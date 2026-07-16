import { PRESENTATION_SECTIONS, type PresentationData } from "@/app/lib/presentation-sections";
import type { PresentationTheme } from "@/app/lib/presentation-themes";
import { buildPptxHighlightRuns } from "@/app/lib/presentation-highlight";
import type { ProjectPresentation, PresentationTexts } from "@/app/lib/types";
import { EPISODE_STATUSES } from "@/app/lib/constants";

// يبني ملف PowerPoint حقيقي (شريحة واحدة لكل قسم مفعّل، بنفس ترتيب المعاينة) اعتماداً على
// pptxgenjs الذي يعمل بالكامل في المتصفح (لا حاجة لأي جولة سيرفر). يُستورَد ديناميكياً هنا
// عمداً كي لا يدخل ضمن حزمة السيرفر أبداً ويُحمَّل فقط عند الضغط الفعلي على زر التنزيل.
type PptxGenJSType = typeof import("pptxgenjs");
type Pptx = InstanceType<PptxGenJSType["default"]>;
type PptxSlide = ReturnType<Pptx["addSlide"]>;

function hex(color: string): string {
  return color.replace("#", "").toUpperCase();
}

// شعار الشركة الحالي المطلوب وضعه كعلامة مائية صغيرة أعلى كل شريحة — متغيّر
// على مستوى الوحدة (module scope) بدل تمرير logoUrl كمعامل عبر كل دالة renderX
// (أكثر من 25 دالة) — buildPresentationPptx هي نقطة الدخول الوحيدة وتُستدعى
// دفعة واحدة غير متزامنة مع أي استدعاء آخر (بناء ملف PowerPoint من ضغطة زر واحدة)،
// فلا خطر تداخل قيم بين استدعاءين مختلفين.
let currentCompanyLogoUrl: string | null = null;

function newSlide(pptx: Pptx, theme: PresentationTheme, opts?: { skipLogo?: boolean }): PptxSlide {
  const slide = pptx.addSlide();
  slide.background = { color: hex(theme.bg) };
  if (currentCompanyLogoUrl && !opts?.skipLogo) {
    slide.addImage({ path: currentCompanyLogoUrl, x: 8.55, y: 0.22, w: 0.75, h: 0.5, sizing: { type: "contain", w: 0.75, h: 0.5 } });
  }
  return slide;
}

function addTitle(slide: PptxSlide, theme: PresentationTheme, title: string) {
  slide.addText(title, {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.7,
    fontSize: 26,
    bold: true,
    color: hex(theme.accent),
    fontFace: "Arial",
    align: "right",
    rtlMode: true,
  });
}

function addParagraph(slide: PptxSlide, theme: PresentationTheme, text: string, y = 1.25) {
  // buildPptxHighlightRuns يترجم صيغة **كلمة** (نفس نظام presentation-highlight.tsx
  // المستخدم في المعاينة/HTML) إلى تشغيلات نصية بارزة بلون هوية الشركة (theme.accent)،
  // بدل عرض النجمتين كنصّ خام في ملف PowerPoint الفعلي.
  slide.addText(buildPptxHighlightRuns(text || "—", theme, { fontSize: 14, color: hex(theme.text), fontFace: "Arial" }), {
    x: 0.5,
    y,
    w: 9,
    h: 3.9,
    align: "right",
    rtlMode: true,
    valign: "top",
  });
}

function addBulletList(slide: PptxSlide, theme: PresentationTheme, items: string[], y = 1.25) {
  const safeItems = items.length ? items : ["لا توجد بيانات مضافة بعد"];
  slide.addText(
    safeItems.map((text) => ({ text, options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } })),
    {
      x: 0.5,
      y,
      w: 9,
      h: 4,
      fontSize: 13,
      color: hex(theme.text),
      fontFace: "Arial",
      align: "right",
      rtlMode: true,
      valign: "top",
    }
  );
}

// نسخة من addBulletList تدعم صيغة **كلمة** داخل كل بند — تُبنى كتشغيلات نصية
// متتالية بدل نصّ خام، مع وضع علامة bullet على أول تشغيلة وbreakLine على آخر
// تشغيلة في كل بند، محافظةً على نفس شكل القائمة النقطية.
function addRichBulletList(slide: PptxSlide, theme: PresentationTheme, items: string[], y = 1.25) {
  const safeItems = items.length ? items : ["لا توجد بيانات مضافة بعد"];
  const runs: { text: string; options: Record<string, unknown> }[] = [];
  for (const item of safeItems) {
    const itemRuns = buildPptxHighlightRuns(item, theme, { fontSize: 13, color: hex(theme.text), fontFace: "Arial" });
    itemRuns.forEach((r, j) => {
      runs.push({
        text: r.text,
        options: {
          ...r.options,
          ...(j === 0 ? { bullet: true } : {}),
          ...(j === itemRuns.length - 1 ? { breakLine: true, paraSpaceAfter: 8 } : {}),
        },
      });
    });
  }
  slide.addText(runs, { x: 0.5, y, w: 9, h: 4, align: "right", rtlMode: true, valign: "top" });
}

// سطر تواصل حقيقي قابل للنقر (هاتف/واتساب/بريد/موقع) بروابط hyperlink فعلية
// مدعومة أصلاً في pptxgenjs — لا نصّ ثابت غير تفاعلي.
function buildContactRuns(data: PresentationData, theme: PresentationTheme): { text: string; options: Record<string, unknown> }[] {
  const items: { label: string; url: string }[] = [];
  if (data.companyPhone) items.push({ label: data.companyPhone, url: `tel:${data.companyPhone}` });
  if (data.companyWhatsapp) items.push({ label: "واتساب", url: `https://wa.me/${data.companyWhatsapp.replace(/\D/g, "")}` });
  if (data.companyEmail) items.push({ label: data.companyEmail, url: `mailto:${data.companyEmail}` });
  if (data.companyWebsite) items.push({ label: data.companyWebsite, url: data.companyWebsite.startsWith("http") ? data.companyWebsite : `https://${data.companyWebsite}` });

  const runs: { text: string; options: Record<string, unknown> }[] = [];
  items.forEach((item, i) => {
    if (i > 0) runs.push({ text: "   |   ", options: { color: hex(theme.muted), fontSize: 11 } });
    runs.push({ text: item.label, options: { color: hex(theme.accent), fontSize: 11, hyperlink: { url: item.url } } });
  });
  return runs;
}

function addContactLine(slide: PptxSlide, theme: PresentationTheme, data: PresentationData, y: number) {
  const runs = buildContactRuns(data, theme);
  if (runs.length === 0) return;
  slide.addText(runs, { x: 0.5, y, w: 9, h: 0.4, align: "center", rtlMode: true });
}

function addTable(slide: PptxSlide, theme: PresentationTheme, header: string[], rows: string[][], y = 1.25) {
  const headRow = header.map((label) => ({
    text: label,
    options: { bold: true, color: "FFFFFF", fill: { color: hex(theme.accent) }, align: "right" as const, fontSize: 11 },
  }));
  const bodyRows = rows.length
    ? rows.map((r) =>
        r.map((cell) => ({
          text: cell || "—",
          options: { color: hex(theme.text), fill: { color: hex(theme.card) }, align: "right" as const, fontSize: 11 },
        }))
      )
    : [header.map(() => ({ text: "لا توجد بيانات", options: { color: hex(theme.muted), fill: { color: hex(theme.card) }, align: "right" as const, fontSize: 11 } }))];

  slide.addTable([headRow, ...bodyRows], {
    x: 0.5,
    y,
    w: 9,
    color: hex(theme.text),
    border: { type: "solid", color: theme.border.startsWith("rgba") ? "333333" : hex(theme.border), pt: 0.5 },
    autoPage: true,
  });
}

function durationLabel(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function episodeStatusLabel(status: string): string {
  return EPISODE_STATUSES.find((s) => s.value === status)?.label ?? status;
}

// ── شرائح خاصة بكل قسم (تغطي الـ25 قسماً المعروفة حالياً) ──

function renderCover(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  // شعار كبير وواسع على شريحة الغلاف تحديداً (بدل العلامة المائية الصغيرة
  // المعتادة في newSlide) — أول ما يراه العميل عند فتح العرض.
  const slide = newSlide(pptx, theme, { skipLogo: true });
  if (data.companyLogoUrl) {
    slide.addImage({ path: data.companyLogoUrl, x: 3.25, y: 0.5, w: 3.5, h: 1.2, sizing: { type: "contain", w: 3.5, h: 1.2 } });
  }
  slide.addText(data.projectName || "عرض تقديمي", {
    x: 0.5,
    y: 2.1,
    w: 9,
    h: 1.2,
    fontSize: 36,
    bold: true,
    color: hex(theme.text),
    align: "center",
    rtlMode: true,
  });
  if (data.clientName) {
    slide.addText(`مقدَّم إلى: ${data.clientName}`, {
      x: 0.5,
      y: 3.25,
      w: 9,
      h: 0.5,
      fontSize: 16,
      color: hex(theme.accent),
      align: "center",
      rtlMode: true,
    });
  }
  slide.addText(data.companyName || "", {
    x: 0.5,
    y: 4.9,
    w: 9,
    h: 0.5,
    fontSize: 12,
    color: hex(theme.muted),
    align: "center",
    rtlMode: true,
  });
}

function renderWelcome(pptx: Pptx, theme: PresentationTheme, data: PresentationData, texts: PresentationTexts) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, `رسالة ترحيبية${data.clientName ? ` إلى ${data.clientName}` : ""}`);
  addParagraph(slide, theme, texts.welcome_message || "نتشرّف بتقديم هذا العرض المقترح لمشروعكم.");
}

function renderCompanyBio(pptx: Pptx, theme: PresentationTheme, data: PresentationData, texts: PresentationTexts) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "نبذة عن الشركة");
  const parts = [texts.company_bio || `${data.companyName} شركة إنتاج إعلامي متخصصة في تحويل الأفكار إلى محتوى احترافي.`];
  if (texts.company_vision) parts.push(`الرؤية: ${texts.company_vision}`);
  if (texts.company_values) parts.push(`القيم: ${texts.company_values}`);
  if (texts.ceo_message) parts.push(`« ${texts.ceo_message} »`);
  addParagraph(slide, theme, parts.join("\n\n"));
  addContactLine(slide, theme, data, 5.2);
}

function renderWhyProject(pptx: Pptx, theme: PresentationTheme, texts: PresentationTexts) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "لماذا هذا المشروع");
  addRichBulletList(slide, theme, [
    `المشكلة: ${texts.why_problem || "—"}`,
    `الفرصة: ${texts.why_opportunity || "—"}`,
    `الفائدة: ${texts.why_value || "—"}`,
  ]);
}

function renderObjectives(pptx: Pptx, theme: PresentationTheme, texts: PresentationTexts) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "أهداف المشروع");
  addBulletList(slide, theme, texts.objectives ?? []);
}

function renderAudience(pptx: Pptx, theme: PresentationTheme, texts: PresentationTexts) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الجمهور المستهدف");
  addParagraph(slide, theme, texts.audience || "—");
}

function renderCreativeIdea(pptx: Pptx, theme: PresentationTheme, data: PresentationData, texts: PresentationTexts) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الفكرة الإبداعية");
  addParagraph(slide, theme, texts.creative_idea || data.projectDescription || "—");
}

function renderVisualIdentity(pptx: Pptx, theme: PresentationTheme) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الهوية البصرية");
  addBulletList(slide, theme, [`لون الهوية الأساسي: ${theme.accent}`, `خلفية العرض: ${theme.bg}`, `لون النص: ${theme.text}`]);
}

function renderShootingStyle(pptx: Pptx, theme: PresentationTheme, texts: PresentationTexts) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "أسلوب التصوير");
  addParagraph(slide, theme, texts.shooting_style || "—");
}

function renderProjectJourney(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "رحلة المشروع (Timeline)");
  addTable(
    slide,
    theme,
    ["المرحلة", "الحلقات", "مكتمل", "قيد التنفيذ"],
    data.stages.map((s) => [s.label, String(s.episodesTotal), String(s.completed), String(s.inProgress)])
  );
}

function renderStagesDetail(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "مراحل التنفيذ التفصيلية");
  addTable(
    slide,
    theme,
    ["الحلقة", "مراحل مكتملة", "الإجمالي", "نسبة الإنجاز"],
    data.episodes.map((e) => [e.title, String(e.stagesCompleted), String(e.stagesTotal), `${e.progress}%`])
  );
}

function renderEpisodes(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الحلقات");
  addTable(
    slide,
    theme,
    ["#", "العنوان", "الحالة", "نسبة الإنجاز"],
    data.episodes.map((e, i) => [String(e.number ?? i + 1), e.title, episodeStatusLabel(e.status), `${e.progress}%`])
  );
}

function renderEpisodeDetails(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "تفاصيل كل حلقة");
  addTable(
    slide,
    theme,
    ["الحلقة", "الوصف", "الحالة", "المدة"],
    data.episodes.map((e) => [e.title, (e.description ?? "—").slice(0, 80), episodeStatusLabel(e.status), durationLabel(e.duration_seconds)])
  );
}

function renderStoryboard(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "Storyboard");
  const items = data.episodes.filter((e) => e.hasStoryboard).map((e) => `${e.title}: ${e.storyboardScenesCount} مشهد`);
  addBulletList(slide, theme, items);
}

function renderScript(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "السكربت");
  const items = data.episodes
    .filter((e) => Boolean(e.script?.trim()) || Boolean(e.scenario?.trim()))
    .map((e) => `${e.title}: ${(e.script || e.scenario || "").slice(0, 90)}`);
  addBulletList(slide, theme, items);
}

function renderEquipment(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "المعدات");
  addBulletList(slide, theme, data.equipmentNames);
}

function renderTeam(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الفريق");
  addBulletList(
    slide,
    theme,
    data.team.map((t) => t.full_name || "عضو فريق")
  );
}

function renderLocations(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "المواقع");
  addBulletList(slide, theme, data.locations);
}

function renderGallery(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "معرض الصور");
  const images = [data.projectCoverUrl, ...data.episodes.map((e) => e.cover_image_url)].filter((v): v is string => Boolean(v)).slice(0, 6);
  if (images.length === 0) {
    addBulletList(slide, theme, [`عدد صور المشروع: ${data.fileCounts.image}`]);
    return;
  }
  const cols = Math.min(3, images.length);
  const cellW = 8.5 / cols;
  images.forEach((url, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    slide.addImage({ path: url, x: 0.5 + col * cellW, y: 1.25 + row * 2.1, w: cellW - 0.15, h: 1.9 });
  });
}

function renderReferences(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "المراجع");
  addBulletList(slide, theme, [`عدد الروابط المرجعية المرفقة: ${data.referenceLinksCount}`]);
}

function renderFiles(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الملفات والمرفقات");
  const labels: Record<string, string> = {
    image: "صور",
    video: "فيديو",
    document: "مستندات",
    audio: "صوتيات",
    archive: "أرشيف",
    design: "تصميم",
    project_file: "ملفات مشروع",
    link: "روابط",
    other: "أخرى",
  };
  addBulletList(
    slide,
    theme,
    Object.entries(data.fileCounts)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${labels[k] ?? k}: ${n}`)
  );
}

function renderDeliverables(pptx: Pptx, theme: PresentationTheme, data: PresentationData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "المخرجات النهائية");
  addBulletList(
    slide,
    theme,
    data.services.map((s) => s.label)
  );
}

function renderFaq(pptx: Pptx, theme: PresentationTheme, texts: PresentationTexts) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الأسئلة الشائعة");
  const faq = texts.faq ?? [];
  addBulletList(
    slide,
    theme,
    faq.map((f) => `${f.question} — ${f.answer}`)
  );
}

function renderTerms(pptx: Pptx, theme: PresentationTheme, texts: PresentationTexts) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الشروط والتسليم");
  addParagraph(slide, theme, texts.terms || "—");
}

function renderThanks(pptx: Pptx, theme: PresentationTheme, data: PresentationData, texts: PresentationTexts) {
  const slide = newSlide(pptx, theme);
  slide.addText(texts.thanks_message || "شكراً لثقتكم بنا", {
    x: 0.5,
    y: 2.3,
    w: 9,
    h: 1,
    fontSize: 30,
    bold: true,
    color: hex(theme.accent),
    align: "center",
    rtlMode: true,
  });
  slide.addText(data.companyName || "", { x: 0.5, y: 3.4, w: 9, h: 0.5, fontSize: 13, color: hex(theme.muted), align: "center", rtlMode: true });
  addContactLine(slide, theme, data, 4.0);
}

// شبكة احتياطية لأي مفتاح قسم مستقبلي لم يُخصَّص له عرض بعد — لا يُترَك فارغاً أبداً.
function renderGenericFallback(pptx: Pptx, theme: PresentationTheme, data: PresentationData, key: string) {
  const slide = newSlide(pptx, theme);
  const label = PRESENTATION_SECTIONS.find((d) => d.key === key)?.label ?? key;
  addTitle(slide, theme, label);
  const raw = (data as unknown as Record<string, unknown>)[key];
  let bullets: string[] = [];
  if (Array.isArray(raw)) {
    bullets = raw.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).slice(0, 12);
  } else if (raw && typeof raw === "object") {
    bullets = Object.entries(raw as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .slice(0, 12);
  } else if (raw != null) {
    bullets = [String(raw)];
  }
  addBulletList(slide, theme, bullets.length ? bullets : ["لا توجد بيانات إضافية متاحة لهذا القسم حالياً."]);
}

function renderSection(pptx: Pptx, key: string, data: PresentationData, texts: PresentationTexts, theme: PresentationTheme) {
  switch (key) {
    case "cover":
      return renderCover(pptx, theme, data);
    case "welcome":
      return renderWelcome(pptx, theme, data, texts);
    case "company_bio":
      return renderCompanyBio(pptx, theme, data, texts);
    case "why_project":
      return renderWhyProject(pptx, theme, texts);
    case "objectives":
      return renderObjectives(pptx, theme, texts);
    case "audience":
      return renderAudience(pptx, theme, texts);
    case "creative_idea":
      return renderCreativeIdea(pptx, theme, data, texts);
    case "visual_identity":
      return renderVisualIdentity(pptx, theme);
    case "shooting_style":
      return renderShootingStyle(pptx, theme, texts);
    case "project_journey":
      return renderProjectJourney(pptx, theme, data);
    case "stages_detail":
      return renderStagesDetail(pptx, theme, data);
    case "episodes":
      return renderEpisodes(pptx, theme, data);
    case "episode_details":
      return renderEpisodeDetails(pptx, theme, data);
    case "storyboard":
      return renderStoryboard(pptx, theme, data);
    case "script":
      return renderScript(pptx, theme, data);
    case "equipment":
      return renderEquipment(pptx, theme, data);
    case "team":
      return renderTeam(pptx, theme, data);
    case "locations":
      return renderLocations(pptx, theme, data);
    case "gallery":
      return renderGallery(pptx, theme, data);
    case "references":
      return renderReferences(pptx, theme, data);
    case "files":
      return renderFiles(pptx, theme, data);
    case "deliverables":
      return renderDeliverables(pptx, theme, data);
    case "faq":
      return renderFaq(pptx, theme, texts);
    case "terms":
      return renderTerms(pptx, theme, texts);
    case "thanks":
      return renderThanks(pptx, theme, data, texts);
    default:
      return renderGenericFallback(pptx, theme, data, key);
  }
}

export async function buildPresentationPptx(data: PresentationData, presentation: ProjectPresentation, theme: PresentationTheme): Promise<void> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.rtlMode = true;
  pptx.author = data.companyName || "";
  pptx.title = data.projectName || "عرض تقديمي";

  currentCompanyLogoUrl = data.companyLogoUrl;
  try {
    const ordered = presentation.sections.filter((s) => s.enabled && PRESENTATION_SECTIONS.some((def) => def.key === s.key)).map((s) => s.key);

    for (const key of ordered) {
      renderSection(pptx, key, data, presentation.texts, theme);
    }

    const safeName = (data.projectName || "presentation").replace(/[\\/:*?"<>|]/g, "").trim() || "presentation";
    await pptx.writeFile({ fileName: `${safeName}.pptx` });
  } finally {
    currentCompanyLogoUrl = null;
  }
}
