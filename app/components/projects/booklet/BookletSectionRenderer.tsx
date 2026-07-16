import { CompanyBioSection } from "@/app/components/projects/presentation/sections/EasySections";
import ProjectJourneySection from "@/app/components/projects/presentation/sections/ProjectJourneySection";
import EpisodeDetailsSection from "@/app/components/projects/presentation/sections/EpisodeDetailsSection";
import TeamSection from "@/app/components/projects/presentation/sections/TeamSection";
import LocationsSection from "@/app/components/projects/presentation/sections/LocationsSection";
import GallerySection from "@/app/components/projects/presentation/sections/GallerySection";
import FilesSection from "@/app/components/projects/presentation/sections/FilesSection";
import {
  BookletCoverSection,
  HandoverMessageSection,
  ProjectOverviewSection,
  AchievementsSection,
  ActivityLogSection,
  BookletClosingSection,
  type BookletSectionProps,
} from "./sections/BookletEasySections";

// نفس فكرة SectionRenderer.tsx للعرض الفني: نقطة عرض مشتركة وحيدة تُستخدم من كل
// قنوات استهلاك الكتيّب (المعاينة، صفحة المشاركة العامة، الطباعة/PDF، تصدير HTML).
// الأقسام المشتركة مع العرض الفني (نبذة الشركة/رحلة المشروع/الحلقات/الفريق/
// المواقع/المعرض/الملفات) تُستدعى مباشرة بلا إعادة كتابة — تعتمد فقط على
// data/theme، وBookletData امتداد فعلي لـ PresentationData.
const REGISTRY: Record<string, React.ComponentType<BookletSectionProps>> = {
  cover: BookletCoverSection,
  handover_message: HandoverMessageSection,
  company_bio: CompanyBioSection,
  project_overview: ProjectOverviewSection,
  achievements: AchievementsSection,
  journey: ProjectJourneySection,
  activity_log: ActivityLogSection,
  episodes_detailed: EpisodeDetailsSection,
  team: TeamSection,
  locations: LocationsSection,
  gallery: GallerySection,
  files: FilesSection,
  closing: BookletClosingSection,
};

export default function BookletSectionRenderer({ sectionKey, ...props }: { sectionKey: string } & BookletSectionProps) {
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
