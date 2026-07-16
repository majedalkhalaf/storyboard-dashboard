import { CompanyBioSection } from "@/app/components/projects/presentation/sections/EasySections";
import ProjectJourneySection from "@/app/components/projects/presentation/sections/ProjectJourneySection";
import EpisodeDetailsSection from "@/app/components/projects/presentation/sections/EpisodeDetailsSection";
import LocationsSection from "@/app/components/projects/presentation/sections/LocationsSection";
import EquipmentSection from "@/app/components/projects/presentation/sections/EquipmentSection";
import FilesSection from "@/app/components/projects/presentation/sections/FilesSection";
import {
  BookletCoverSection,
  TocSection,
  HandoverMessageSection,
  ClientCardSection,
  ProjectOverviewSection,
  AchievementsSection,
  ActivityLogSection,
  BookletGallerySection,
  BookletClosingSection,
  type BookletSectionProps,
} from "./sections/BookletEasySections";
import {
  ExecutionPlanSection,
  BookletTeamSection,
  StoryboardDetailedSection,
  VideosSection,
  ApprovalsSection,
  NotesSection,
  FinanceSection,
} from "./sections/BookletRichSections";

// نفس فكرة SectionRenderer.tsx للعرض الفني: نقطة عرض مشتركة وحيدة تُستخدم من كل
// قنوات استهلاك الكتيّب (المعاينة، صفحة المشاركة العامة، الطباعة/PDF، تصدير HTML).
// الأقسام المشتركة مع العرض الفني (نبذة الشركة/رحلة المشروع/الحلقات/المواقع/
// المعدات/الملفات) تُستدعى مباشرة بلا إعادة كتابة — تعتمد فقط على data/theme،
// وBookletData امتداد فعلي لـ PresentationData.
const REGISTRY: Record<string, React.ComponentType<BookletSectionProps>> = {
  cover: BookletCoverSection,
  handover_message: HandoverMessageSection,
  company_bio: CompanyBioSection,
  client_card: ClientCardSection,
  project_overview: ProjectOverviewSection,
  achievements: AchievementsSection,
  journey: ProjectJourneySection,
  execution_plan: ExecutionPlanSection,
  activity_log: ActivityLogSection,
  approvals: ApprovalsSection,
  episodes_detailed: EpisodeDetailsSection,
  storyboard: StoryboardDetailedSection,
  videos: VideosSection,
  team: BookletTeamSection,
  equipment: EquipmentSection,
  locations: LocationsSection,
  gallery: BookletGallerySection,
  files: FilesSection,
  notes: NotesSection,
  finance: FinanceSection,
  closing: BookletClosingSection,
};

export default function BookletSectionRenderer({
  sectionKey,
  tocEntries,
  ...props
}: { sectionKey: string; tocEntries?: { key: string; label: string; page: number }[] } & BookletSectionProps) {
  if (sectionKey === "toc") {
    return <TocSection theme={props.theme} entries={tocEntries ?? []} />;
  }

  const Cmp = REGISTRY[sectionKey];
  if (!Cmp) return null;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Cmp {...props} />
      {sectionKey !== "cover" && props.data.companyLogoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.data.companyLogoUrl}
          alt=""
          style={{
            position: "absolute",
            bottom: 18,
            insetInlineEnd: 22,
            maxHeight: 30,
            maxWidth: 100,
            objectFit: "contain",
            opacity: 0.8,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
