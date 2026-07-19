import type { IconName } from "@/app/components/ui/Icon";
import type { EpisodeTabKey } from "@/app/components/projects/EpisodeWorkspace";
import type { ItemNounKey } from "@/app/lib/constants";
import type { EpisodeGalleryItem } from "@/app/lib/episode-gallery";
import type { Episode } from "@/app/lib/types";

// مفاتيح القوالب المبنية فعلياً حتى الآن — تتوسع لاحقاً بلا كسر (union widening)
// عند إضافة أنواع مشاريع جديدة (يوتيوب، إعلان، تصوير منتجات...).
export type TemplateKey = "podcast" | "reels" | "brand_identity";

export type CardVariant = "standard" | "vertical" | "deliverable";

export interface MetaFieldDef {
  key: string;
  label: string;
  icon?: IconName;
  type: "text" | "textarea" | "tags" | "select" | "url";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface FileTypeChip {
  ext: string;
  label: string;
  icon: IconName;
}

export interface StatCardDef {
  key: string;
  // بعض التسميات (كعدد العناصر) يجب أن تعكس تسمية عنصر المشروع الفعلية
  // (itemNoun.plural) وليس نصاً ثابتاً في القالب — لذلك تُقبل كدالة أيضاً.
  label: string | ((itemNounPlural: string) => string);
  icon: IconName;
  compute: (gallery: EpisodeGalleryItem[]) => string | number;
}

// نسخة مبسّطة من StatCardDef لجهة بوابة العميل — تُحسَب من Episode[] الخام
// (وليس EpisodeGalleryItem المُجمَّع من عدة استعلامات على جهة الفريق)، لتفادي
// فرض بنية بيانات واحدة على جهتين تختلف بياناتهما المتاحة فعلياً.
export interface ClientStatCardDef {
  key: string;
  label: string | ((itemNounPlural: string) => string);
  icon: IconName;
  color: string;
  compute: (episodes: Episode[]) => string | number;
}

export interface StageSeed {
  key: string;
  label: string;
}

export interface ProjectTemplateDefinition {
  key: TemplateKey;
  label: string;
  defaultItemNounKey: ItemNounKey;
  defaultItemNounCustom?: { singular: string; plural: string };
  cardVariant: CardVariant;
  tabs: EpisodeTabKey[];
  defaultStages: StageSeed[];
  metaFields: MetaFieldDef[];
  fileTypeChips?: FileTypeChip[];
  statCards: StatCardDef[];
  clientStatCards: ClientStatCardDef[];
  showDurationBadge: boolean;
}
