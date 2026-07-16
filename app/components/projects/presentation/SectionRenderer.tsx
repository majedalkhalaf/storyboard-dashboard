import {
  AudienceSection,
  CompanyBioSection,
  CoverSection,
  CreativeIdeaSection,
  FaqSection,
  ObjectivesSection,
  ShootingStyleSection,
  TermsSection,
  ThanksSection,
  VisualIdentitySection,
  WelcomeSection,
  WhyProjectSection,
  type SectionProps,
} from "./sections/EasySections";
import ProjectJourneySection from "./sections/ProjectJourneySection";
import StagesDetailSection from "./sections/StagesDetailSection";
import EpisodesSection from "./sections/EpisodesSection";
import EpisodeDetailsSection from "./sections/EpisodeDetailsSection";
import StoryboardSection from "./sections/StoryboardSection";
import ScriptSection from "./sections/ScriptSection";
import EquipmentSection from "./sections/EquipmentSection";
import TeamSection from "./sections/TeamSection";
import LocationsSection from "./sections/LocationsSection";
import GallerySection from "./sections/GallerySection";
import ReferencesSection from "./sections/ReferencesSection";
import FilesSection from "./sections/FilesSection";
import DeliverablesSection from "./sections/DeliverablesSection";

const REGISTRY: Record<string, React.ComponentType<SectionProps>> = {
  cover: CoverSection,
  welcome: WelcomeSection,
  company_bio: CompanyBioSection,
  why_project: WhyProjectSection,
  objectives: ObjectivesSection,
  audience: AudienceSection,
  creative_idea: CreativeIdeaSection,
  visual_identity: VisualIdentitySection,
  shooting_style: ShootingStyleSection,
  project_journey: ProjectJourneySection,
  stages_detail: StagesDetailSection,
  episodes: EpisodesSection,
  episode_details: EpisodeDetailsSection,
  storyboard: StoryboardSection,
  script: ScriptSection,
  equipment: EquipmentSection,
  team: TeamSection,
  locations: LocationsSection,
  gallery: GallerySection,
  references: ReferencesSection,
  files: FilesSection,
  deliverables: DeliverablesSection,
  faq: FaqSection,
  terms: TermsSection,
  thanks: ThanksSection,
};

// نقطة مشتركة وحيدة تُستخدم من كل قنوات العرض الأربع (المعاينة الحيّة، صفحة
// المشاركة العامة، نسخة الطباعة/PDF، تصدير HTML) — إضافة شعار الشركة كعلامة
// مائية ثابتة هنا مرة واحدة تكفي لظهوره في كل صفحة عبر كل القنوات معاً، بدل
// تعديل كل قسم من الأقسام الـ24 على حدة. الغلاف يستثنى لأنه يعرض شعاراً كبيراً
// خاصاً به أصلاً (CoverSection).
export default function SectionRenderer({ sectionKey, ...props }: { sectionKey: string } & SectionProps) {
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
