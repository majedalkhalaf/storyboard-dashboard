import { ITEM_NOUN_OPTIONS, type ItemNounKey } from "./constants";

interface ProjectNounFields {
  item_noun_key?: string | null;
  item_noun_custom_singular?: string | null;
  item_noun_custom_plural?: string | null;
}

export interface ItemNoun {
  singular: string;
  plural: string;
  titlePrefix: string;
}

/** تسمية عنصر المشروع (حلقة/حلقات، فيديو إعلاني/فيديوهات إعلانية، عنصر/عناصر، أو
 * تسمية مخصّصة) — تُستخدم بدل الاسم الثابت "حلقة/الحلقات" في كل واجهات عرض البطاقات. */
export function getItemNoun(project: ProjectNounFields): ItemNoun {
  const key = (project.item_noun_key ?? "episodes") as ItemNounKey;
  if (key === "custom") {
    const singular = project.item_noun_custom_singular?.trim() || "عنصر";
    const plural = project.item_noun_custom_plural?.trim() || "عناصر";
    return { singular, plural, titlePrefix: singular };
  }
  const preset = ITEM_NOUN_OPTIONS.find((o) => o.value === key);
  if (preset) return { singular: preset.singular, plural: preset.plural, titlePrefix: preset.titlePrefix };
  return { singular: "حلقة", plural: "حلقات", titlePrefix: "الحلقة" };
}

interface EpisodeKindFields {
  kind?: string | null;
  kind_label?: string | null;
}

/** تسمية نوع العنصر الظاهرة على البطاقة: "مقدمة"/"انترو" لهما تسميتان ثابتتان،
 * النوع المخصص يعرض kind_label، والعادي يتبع تسمية المشروع (singular). */
export function getEpisodeKindLabel(episode: EpisodeKindFields, itemNounSingular: string): string {
  const kind = episode.kind ?? "regular";
  if (kind === "intro") return "مقدمة";
  if (kind === "bumper") return "انترو";
  if (kind === "custom") return episode.kind_label?.trim() || "خاص";
  return itemNounSingular;
}

/** الأنواع "الخاصة" (مقدمة/انترو/مخصص) تُعرض ببطاقة مميزة منفصلة عن شبكة العناصر
 * العادية — بخلاف "عادي" الذي يظهر بنفس شكل الشبكة الرئيسي. */
export function isSpecialEpisodeKind(kind?: string | null): boolean {
  return kind === "intro" || kind === "bumper" || kind === "custom";
}
