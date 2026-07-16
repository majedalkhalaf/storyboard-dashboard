import { BOOKLET_SECTIONS, type BookletData } from "@/app/lib/booklet-sections";
import type { PresentationTheme } from "@/app/lib/presentation-themes";
import type { ProjectBooklet, BookletTexts } from "@/app/lib/types";
import { EPISODE_STATUSES } from "@/app/lib/constants";
import { formatDate } from "@/app/components/projects/utils";
import {
  type Pptx,
  hex,
  setPptxLogo,
  newSlide,
  addTitle,
  addParagraph,
  addBulletList,
  addContactLine,
  addTable,
} from "@/app/lib/presentation-pptx-primitives";

// نفس بنية presentation-pptx.ts (شريحة واحدة لكل قسم مفعّل) لكن لمحتوى الكتيّب
// الرجعي-المحور. يستورد pptxgenjs ديناميكياً داخل buildBookletPptx فقط، ويستخدم
// نفس أدوات presentation-pptx-primitives.ts المشتركة (لا تكرار).

function episodeStatusLabel(status: string): string {
  return EPISODE_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function formatSecondsShort(totalSeconds: number): string {
  if (totalSeconds <= 0) return "—";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}س ${minutes}د`;
  return `${minutes}د`;
}

function renderCover(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme, { skipLogo: true });
  if (data.companyLogoUrl) {
    slide.addImage({ path: data.companyLogoUrl, x: 3.25, y: 0.5, w: 3.5, h: 1.2, sizing: { type: "contain", w: 3.5, h: 1.2 } });
  }
  slide.addText("كتيّب تسليم المشروع النهائي", { x: 0.5, y: 1.75, w: 9, h: 0.4, fontSize: 12, color: hex(theme.accent), align: "center", rtlMode: true });
  slide.addText(data.projectName || "كتيّب المشروع", {
    x: 0.5,
    y: 2.15,
    w: 9,
    h: 1.2,
    fontSize: 36,
    bold: true,
    color: hex(theme.text),
    align: "center",
    rtlMode: true,
  });
  if (data.clientName) {
    slide.addText(`تسليم إلى: ${data.clientName}`, { x: 0.5, y: 3.3, w: 9, h: 0.5, fontSize: 16, color: hex(theme.accent), align: "center", rtlMode: true });
  }
  slide.addText(data.companyName || "", { x: 0.5, y: 4.9, w: 9, h: 0.5, fontSize: 12, color: hex(theme.muted), align: "center", rtlMode: true });
}

function renderHandoverMessage(pptx: Pptx, theme: PresentationTheme, data: BookletData, texts: BookletTexts) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "رسالة التسليم");
  addParagraph(slide, theme, texts.handover_message || `يسعدنا تسليمكم مشروع ${data.projectName}.`);
}

function renderCompanyBio(pptx: Pptx, theme: PresentationTheme, data: BookletData, texts: BookletTexts) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "نبذة عن الشركة");
  const parts = [texts.company_bio || `${data.companyName} شركة إنتاج إعلامي متخصصة في تحويل الأفكار إلى محتوى احترافي.`];
  if (texts.company_vision) parts.push(`الرؤية: ${texts.company_vision}`);
  if (texts.company_mission) parts.push(`الرسالة: ${texts.company_mission}`);
  if (texts.company_values) parts.push(`القيم: ${texts.company_values}`);
  if (texts.ceo_message) parts.push(`« ${texts.ceo_message} »`);
  addParagraph(slide, theme, parts.join("\n\n"));
  addContactLine(slide, theme, data, 5.2);
}

function renderToc(pptx: Pptx, theme: PresentationTheme, ordered: string[]) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الفهرس");
  const entries = ordered
    .filter((k) => k !== "toc")
    .map((k, i) => `${i + 1}. ${BOOKLET_SECTIONS.find((d) => d.key === k)?.label ?? k}`);
  addBulletList(slide, theme, entries);
}

function renderClientCard(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "بيانات العميل");
  const c = data.client;
  addTable(slide, theme, ["البيان", "القيمة"], [
    ["اسم العميل", c.name || "—"],
    ["الشركة", c.companyName || "—"],
    ["البريد الإلكتروني", c.email || "—"],
    ["الهاتف", c.phone || "—"],
    ["المدينة", c.city || "—"],
    ["بداية المشروع", formatDate(data.projectStartDate)],
    ["تاريخ التسليم", data.projectDeliveredDate ? formatDate(data.projectDeliveredDate) : "قيد التسليم"],
  ]);
}

function renderProjectOverview(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "نظرة عامة على المشروع");
  addTable(slide, theme, ["البيان", "القيمة"], [
    ["تاريخ البدء", formatDate(data.projectStartDate)],
    ["تاريخ التسليم", data.projectDeliveredDate ? formatDate(data.projectDeliveredDate) : "قيد التسليم"],
    ["مدة التنفيذ", data.daysElapsed != null ? `${data.daysElapsed} يوم` : "—"],
    ["عدد المواقع", String(data.locations.length)],
    ["الخدمات", data.services.map((s) => s.label).join("، ") || "—"],
  ]);
}

function renderAchievements(pptx: Pptx, theme: PresentationTheme, data: BookletData, texts: BookletTexts) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الإنجازات بالأرقام");
  addTable(slide, theme, ["المؤشر", "القيمة"], [
    ["إجمالي العناصر", String(data.totalEpisodes)],
    ["عناصر مكتملة", String(data.completedEpisodes)],
    ["ملفات ومخرجات", String(data.totalFiles)],
    ["إجمالي مدة المحتوى", formatSecondsShort(data.totalDurationSeconds)],
  ]);
  addParagraph(slide, theme, texts.achievements_summary || "—", 3.6);
}

function renderJourney(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "رحلة المشروع");
  addTable(
    slide,
    theme,
    ["المرحلة", "الحلقات", "مكتمل", "قيد التنفيذ"],
    data.stages.map((s) => [s.label, String(s.episodesTotal), String(s.completed), String(s.inProgress)])
  );
}

function renderActivityLog(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "سجل ما تم تنفيذه");
  addTable(
    slide,
    theme,
    ["التاريخ", "الحدث", "الحلقة"],
    data.activityLog.slice(0, 18).map((e) => [formatDate(e.createdAt), e.label, e.episodeTitle ?? "—"])
  );
}

function renderEpisodesDetailed(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الحلقات بالتفصيل");
  addTable(
    slide,
    theme,
    ["الحلقة", "الحالة", "نسبة الإنجاز", "المراحل"],
    data.episodes.map((e) => [e.title, episodeStatusLabel(e.status), `${e.progress}%`, `${e.stagesCompleted}/${e.stagesTotal}`])
  );
}

function renderExecutionPlan(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الخطة التنفيذية");
  addTable(
    slide,
    theme,
    ["المرحلة", "المسؤول", "البداية", "النهاية", "الإنجاز"],
    data.executionPlan.map((s) => [
      s.label,
      s.responsibleNames.join("، ") || "—",
      s.earliestStart ? formatDate(s.earliestStart) : "—",
      s.latestEnd ? formatDate(s.latestEnd) : "—",
      `${s.completed}/${s.episodesTotal}`,
    ])
  );
}

function renderStoryboard(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "Storyboard التفصيلي");
  addTable(
    slide,
    theme,
    ["المشهد", "الحلقة", "نوع اللقطة", "الموقع"],
    data.storyboardDetailed.slice(0, 12).map((s) => [s.title, s.episodeTitle, s.shot_type ?? "—", s.location ?? "—"])
  );
}

function renderApprovals(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الاعتمادات");
  addTable(
    slide,
    theme,
    ["الحلقة", "اعتمد بواسطة", "التاريخ", "الحالة"],
    data.approvalsList.map((a) => [a.episodeTitle ?? "المشروع", a.approverName ?? "—", formatDate(a.approvedAt), a.revoked ? "مسحوب" : "معتمد"])
  );
}

function renderNotes(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الملاحظات");
  addBulletList(
    slide,
    theme,
    data.notesList.slice(0, 14).map((n) => `${n.authorName ?? (n.authorRole === "client" ? "العميل" : "الفريق")}: ${n.body.slice(0, 90)}`)
  );
}

function renderVideos(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الفيديوهات");
  addTable(
    slide,
    theme,
    ["الاسم", "الحلقة", "المدة"],
    data.videosList.slice(0, 14).map((v) => [v.name, v.episodeTitle ?? "—", v.durationSeconds != null ? `${Math.round(v.durationSeconds / 60)} د` : "—"])
  );
}

function renderEquipment(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "المعدات");
  addBulletList(slide, theme, data.equipmentNames);
}

function renderFinance(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الملخص المالي");
  const f = data.finance;
  if (!f) {
    addBulletList(slide, theme, ["لا توجد بيانات مالية متاحة."]);
    return;
  }
  const money = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${data.companyCurrency}`;
  addTable(slide, theme, ["البند", "القيمة"], [
    ...(f.budget != null ? [["ميزانية المشروع", money(f.budget)]] : []),
    ["فواتير مدفوعة", money(f.invoicesPaidTotal)],
    ["فواتير غير مدفوعة", money(f.invoicesUnpaidTotal)],
    ["دفعات مستلمة", money(f.paymentsReceivedTotal)],
    ["إجمالي المصروفات", money(f.expensesTotal)],
    ["عدد العقود", String(f.contractsCount)],
    ["عدد العروض", String(f.proposalsCount)],
  ]);
}

function renderTeam(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الفريق");
  addBulletList(
    slide,
    theme,
    data.team.map((t) => t.full_name || "عضو فريق")
  );
}

function renderLocations(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "المواقع");
  addBulletList(slide, theme, data.locations);
}

function renderGallery(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "خلف الكواليس والمعرض");
  const images = data.galleryImagesExtended.slice(0, 6).map((g) => g.url);
  if (images.length === 0) {
    addBulletList(slide, theme, ["لا توجد صور مضافة بعد."]);
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

function renderFiles(pptx: Pptx, theme: PresentationTheme, data: BookletData) {
  const slide = newSlide(pptx, theme);
  addTitle(slide, theme, "الملفات والمخرجات");
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

function renderClosing(pptx: Pptx, theme: PresentationTheme, data: BookletData, texts: BookletTexts) {
  const slide = newSlide(pptx, theme);
  slide.addText(texts.closing_message || "شكراً لثقتكم بنا", {
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

function renderGenericFallback(pptx: Pptx, theme: PresentationTheme, key: string) {
  const slide = newSlide(pptx, theme);
  const label = BOOKLET_SECTIONS.find((d) => d.key === key)?.label ?? key;
  addTitle(slide, theme, label);
  addBulletList(slide, theme, ["لا توجد بيانات إضافية متاحة لهذا القسم حالياً."]);
}

function renderSection(pptx: Pptx, key: string, data: BookletData, texts: BookletTexts, theme: PresentationTheme, ordered: string[]) {
  switch (key) {
    case "cover":
      return renderCover(pptx, theme, data);
    case "toc":
      return renderToc(pptx, theme, ordered);
    case "handover_message":
      return renderHandoverMessage(pptx, theme, data, texts);
    case "company_bio":
      return renderCompanyBio(pptx, theme, data, texts);
    case "client_card":
      return renderClientCard(pptx, theme, data);
    case "project_overview":
      return renderProjectOverview(pptx, theme, data);
    case "achievements":
      return renderAchievements(pptx, theme, data, texts);
    case "journey":
      return renderJourney(pptx, theme, data);
    case "execution_plan":
      return renderExecutionPlan(pptx, theme, data);
    case "activity_log":
      return renderActivityLog(pptx, theme, data);
    case "approvals":
      return renderApprovals(pptx, theme, data);
    case "episodes_detailed":
      return renderEpisodesDetailed(pptx, theme, data);
    case "storyboard":
      return renderStoryboard(pptx, theme, data);
    case "videos":
      return renderVideos(pptx, theme, data);
    case "team":
      return renderTeam(pptx, theme, data);
    case "equipment":
      return renderEquipment(pptx, theme, data);
    case "locations":
      return renderLocations(pptx, theme, data);
    case "gallery":
      return renderGallery(pptx, theme, data);
    case "files":
      return renderFiles(pptx, theme, data);
    case "notes":
      return renderNotes(pptx, theme, data);
    case "finance":
      return renderFinance(pptx, theme, data);
    case "closing":
      return renderClosing(pptx, theme, data, texts);
    default:
      return renderGenericFallback(pptx, theme, key);
  }
}

export async function buildBookletPptx(data: BookletData, booklet: ProjectBooklet, theme: PresentationTheme): Promise<void> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.rtlMode = true;
  pptx.author = data.companyName || "";
  pptx.title = data.projectName || "كتيّب المشروع";

  setPptxLogo(data.companyLogoUrl);
  try {
    const ordered = booklet.sections.filter((s) => s.enabled && BOOKLET_SECTIONS.some((def) => def.key === s.key)).map((s) => s.key);

    for (const key of ordered) {
      renderSection(pptx, key, data, booklet.texts, theme, ordered);
    }

    const safeName = (data.projectName || "booklet").replace(/[\\/:*?"<>|]/g, "").trim() || "booklet";
    await pptx.writeFile({ fileName: `${safeName}-كتيب.pptx` });
  } finally {
    setPptxLogo(null);
  }
}
