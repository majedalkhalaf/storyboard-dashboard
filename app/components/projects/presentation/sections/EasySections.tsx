import Icon, { type IconName } from "@/app/components/ui/Icon";
import type { PresentationData } from "@/app/lib/presentation-sections";
import type { PresentationTheme } from "@/app/lib/presentation-themes";
import { HighlightedText } from "@/app/lib/presentation-highlight";
import { joinArabicList } from "@/app/lib/presentation-copywriter";
import type { PresentationTexts } from "@/app/lib/types";

export interface SectionProps {
  data: PresentationData;
  texts: PresentationTexts;
  theme: PresentationTheme;
}

function whatsappHref(number: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}`;
}

function websiteHref(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

// نقطة زخرفية صغيرة (شبكة نقاط ذهبية) تظهر في زاوية كل شريحة داخلية — نفس
// اللمسة المستخدمة في لوحة صورة الغلاف، لضمان هوية بصرية واحدة عبر كل العرض.
function PremiumDots({ theme }: { theme: PresentationTheme }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 4px)", gap: 4, flexShrink: 0 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <span key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: theme.accent, opacity: 0.5 }} />
      ))}
    </div>
  );
}

function LogoBadge({ url, theme, small }: { url: string | null; theme: PresentationTheme; small?: boolean }) {
  const size = small ? 22 : 28;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={{ height: size, maxWidth: small ? 70 : 92, objectFit: "contain", flexShrink: 0 }} />;
  }
  return (
    <div
      style={{
        height: size,
        width: size,
        borderRadius: 7,
        background: theme.card,
        border: `1px solid ${theme.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: theme.accent,
        flexShrink: 0,
      }}
    >
      <Icon name="company" size={small ? 11 : 13} />
    </div>
  );
}

// رأس موحّد لكل شرائح العرض الداخلية: شعار الشركة + شعار العميل إن وُجد (كي
// يشعر العميل أن هذا العرض مصمَّم خصيصاً له في كل صفحة وليس فقط الغلاف)، مع
// نقاط زخرفية في الزاوية المقابلة. صفحة الغلاف وحدها لها رأسها الخاص.
export function PremiumHeader({ data, theme }: { data: PresentationData; theme: PresentationTheme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <LogoBadge url={data.companyLogoUrl} theme={theme} />
        <span style={{ fontSize: 12, fontWeight: 800, color: theme.text, whiteSpace: "nowrap" }}>{data.companyName}</span>
        {data.clientLogoUrl && (
          <>
            <span style={{ width: 1, height: 16, background: theme.border, flexShrink: 0 }} />
            <LogoBadge url={data.clientLogoUrl} theme={theme} small />
            {data.clientName && <span style={{ fontSize: 11, color: theme.muted, whiteSpace: "nowrap" }}>{data.clientName}</span>}
          </>
        )}
      </div>
      <PremiumDots theme={theme} />
    </div>
  );
}

// تذييل موحّد: معلومات تواصل الشركة الحقيقية القابلة للنقر (أو اسم الشركة فقط
// إن لم تُضَف بيانات تواصل)، تظهر أسفل كل شريحة داخلية بفاصل ذهبي رفيع.
export function PremiumFooter({ data, theme }: { data: PresentationData; theme: PresentationTheme }) {
  const items: { key: string; icon: "link" | "mail" | "phone" | "location"; label: string; href?: string }[] = [];
  if (data.companyWebsite) items.push({ key: "web", icon: "link", label: data.companyWebsite, href: websiteHref(data.companyWebsite) });
  if (data.companyEmail) items.push({ key: "mail", icon: "mail", label: data.companyEmail, href: `mailto:${data.companyEmail}` });
  if (data.companyPhone) items.push({ key: "phone", icon: "phone", label: data.companyPhone, href: `tel:${data.companyPhone}` });
  if (data.companyAddress) items.push({ key: "loc", icon: "location", label: data.companyAddress });

  return (
    <div
      style={{
        flexShrink: 0,
        marginTop: 18,
        paddingTop: 14,
        borderTop: `1px solid ${theme.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        {items.map((it) =>
          it.href ? (
            <a
              key={it.key}
              href={it.href}
              target={it.href.startsWith("http") ? "_blank" : undefined}
              rel={it.href.startsWith("http") ? "noreferrer" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: theme.muted, textDecoration: "none" }}
            >
              <span style={{ color: theme.accent, display: "flex" }}>
                <Icon name={it.icon} size={11} />
              </span>
              {it.label}
            </a>
          ) : (
            <span key={it.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: theme.muted }}>
              <span style={{ color: theme.accent, display: "flex" }}>
                <Icon name={it.icon} size={11} />
              </span>
              {it.label}
            </span>
          )
        )}
      </div>
      <span style={{ fontSize: 10.5, color: theme.muted, fontWeight: 700, whiteSpace: "nowrap" }}>{data.companyName}</span>
    </div>
  );
}

// غلاف شريحة موحّد لكل الأقسام الداخلية (غير الغلاف): رأس ثابت (data اختياري
// للتوافق العكسي) + منطقة محتوى مرنة + تذييل ثابت — هذا ما يضمن أن كل صفحات
// العرض "تنتمي لعرض واحد" بنفس التباعد والهوية بدل تصميم كل صفحة بمعزل عن الباقي.
export function Slide({
  theme,
  data,
  children,
  style,
}: {
  theme: PresentationTheme;
  data?: PresentationData;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: theme.bg,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        padding: data ? "26px 40px 20px" : 48,
        fontFamily: theme.fontHeading,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {data && <PremiumHeader data={data} theme={theme} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, marginTop: data ? 18 : 0, ...style }}>{children}</div>
      {data && <PremiumFooter data={data} theme={theme} />}
    </div>
  );
}

export function SlideTitle({ theme, children, eyebrow }: { theme: PresentationTheme; children: React.ReactNode; eyebrow?: string }) {
  return (
    <div style={{ marginBottom: 20, flexShrink: 0 }}>
      {eyebrow && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
          <span style={{ width: 18, height: 1, background: theme.accent }} />
          <span style={{ fontSize: 10, letterSpacing: 2, color: theme.accent, fontWeight: 700 }}>{eyebrow}</span>
        </div>
      )}
      <h2 style={{ fontSize: 26, fontWeight: 900, color: theme.text, margin: 0 }}>{children}</h2>
    </div>
  );
}

// معلومات تواصل حقيقية قابلة للنقر مباشرة (tel:/mailto:/wa.me/رابط الموقع) —
// تُستخدم في نبذة الشركة وصفحة الشكر، بدل نص ثابت غير قابل للتفاعل.
export function CompanyContactBlock({ data, theme }: { data: PresentationData; theme: PresentationTheme }) {
  const links: { key: string; icon: "phone" | "mail" | "link"; label: string; href: string }[] = [];
  if (data.companyPhone) links.push({ key: "phone", icon: "phone", label: data.companyPhone, href: `tel:${data.companyPhone}` });
  if (data.companyWhatsapp) links.push({ key: "whatsapp", icon: "phone", label: "واتساب", href: whatsappHref(data.companyWhatsapp) });
  if (data.companyEmail) links.push({ key: "email", icon: "mail", label: data.companyEmail, href: `mailto:${data.companyEmail}` });
  if (data.companyWebsite) links.push({ key: "website", icon: "link", label: data.companyWebsite, href: websiteHref(data.companyWebsite) });

  if (links.length === 0 && !data.companyAddress) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 24, justifyContent: "center", alignItems: "center" }}>
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href}
          target={l.href.startsWith("http") ? "_blank" : undefined}
          rel={l.href.startsWith("http") ? "noreferrer" : undefined}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: theme.accent, textDecoration: "none" }}
        >
          <Icon name={l.icon} size={13} /> {l.label}
        </a>
      ))}
      {data.companyAddress && (
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.muted }}>
          <Icon name="location" size={13} /> {data.companyAddress}
        </span>
      )}
    </div>
  );
}

// تاريخ مختصر بالأرقام (27/7/2026) لبطاقات الغلاف — أكثر إحكاماً من formatDate
// المستخدم في بقية التقرير (الذي يكتب اسم الشهر كاملاً وهو طويل لمساحة البطاقة).
function compactDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar-EG-u-nu-latn", { year: "numeric", month: "numeric", day: "numeric" });
  } catch {
    return iso;
  }
}

function CoverStatCard({ theme, icon, label, value }: { theme: PresentationTheme; icon: "calendar" | "episodes"; label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: "12px 14px",
        borderRadius: 14,
        background: theme.card,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div style={{ color: theme.accent, marginBottom: 8 }}>
        <Icon name={icon} size={16} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function CoverProgressCard({ theme, progress }: { theme: PresentationTheme; progress: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = c * (Math.min(100, Math.max(0, progress)) / 100);
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: "12px 14px",
        borderRadius: 14,
        background: theme.card,
        border: `1px solid ${theme.border}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <svg width="52" height="52" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke={theme.border} strokeWidth="3.5" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={theme.accent}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 26 26)"
        />
        <text x="26" y="30" textAnchor="middle" fontSize="12" fontWeight={800} fill={theme.text}>
          {Math.round(progress)}%
        </text>
      </svg>
      <div style={{ fontSize: 10.5, color: theme.muted, lineHeight: 1.4 }}>نسبة الإنجاز</div>
    </div>
  );
}

// صفحة غلاف بقالب ثابت قابل لإعادة الاستخدام لأي مشروع: لوحة نصوص + لوحة صورة
// غلاف بشكل هندسي مميز (بدل الغلاف المركزي البسيط السابق)، تُبنى بالكامل من
// بيانات المشروع الفعلية (لا نص أو رقم ثابت هنا خارج ما يأتي من data).
export function CoverSection({ data, theme }: SectionProps) {
  const heroUrl = data.projectCoverUrl;
  const dateIso = data.deliveryDate || data.shootingDate;
  const hasEpisodes = data.episodes.length > 0;
  const secondaryValue = hasEpisodes ? data.episodes.length : data.services.length;
  const secondaryLabel = hasEpisodes ? "عدد الحلقات" : "عدد الخدمات";

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", background: theme.bg, overflow: "hidden", direction: "ltr" }}>
      {/* لوحة النصوص */}
      <div
        style={{
          flex: "0 0 44%",
          minWidth: 0,
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "34px 30px 26px 40px",
          direction: "rtl",
          textAlign: "right",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {data.companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.companyLogoUrl} alt="" style={{ height: 36, maxWidth: 100, objectFit: "contain" }} />
          ) : (
            <div
              style={{
                height: 36,
                width: 36,
                borderRadius: 8,
                background: theme.card,
                border: `1px solid ${theme.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.accent,
                flexShrink: 0,
              }}
            >
              <Icon name="company" size={17} />
            </div>
          )}
          <span style={{ fontSize: 13.5, fontWeight: 800, color: theme.text }}>{data.companyName}</span>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ width: 22, height: 1, background: theme.accent }} />
            <span style={{ fontSize: 11, letterSpacing: 2, color: theme.accent, fontWeight: 700 }}>عرض فني مقترح</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.2, color: theme.text, margin: 0 }}>{data.projectName}</h1>
          {data.projectDescription && (
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.8,
                color: theme.muted,
                marginTop: 14,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {data.projectDescription}
            </p>
          )}
          {data.clientName && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 16,
                padding: "6px 14px",
                borderRadius: 999,
                background: theme.card,
                border: `1px solid ${theme.border}`,
              }}
            >
              <span style={{ color: theme.accent, display: "flex" }}>
                <Icon name="badgeCheck" size={13} />
              </span>
              <span style={{ fontSize: 11.5, color: theme.text }}>مقدَّم إلى {data.clientName}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <CoverStatCard theme={theme} icon="calendar" label="تاريخ التسليم" value={dateIso ? compactDate(dateIso) : "قيد التحديد"} />
          {secondaryValue > 0 && <CoverStatCard theme={theme} icon="episodes" label={secondaryLabel} value={String(secondaryValue)} />}
          <CoverProgressCard theme={theme} progress={data.progress} />
        </div>
      </div>

      {/* لوحة الصورة — شكل هندسي مميز بدل المستطيل الاعتيادي */}
      <div style={{ flex: "1 1 56%", minWidth: 0, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: "14px 0 14px 0",
            borderRadius: "20px 20px 20px 120px",
            overflow: "hidden",
            background: heroUrl ? undefined : `linear-gradient(155deg, ${theme.card}, ${theme.bg})`,
          }}
        >
          {heroUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: heroUrl ? "linear-gradient(90deg, rgba(0,0,0,0.45), rgba(0,0,0,0) 42%)" : undefined,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 20,
              right: 20,
              width: 46,
              height: 34,
              backgroundImage: `radial-gradient(${theme.accent} 1.3px, transparent 1.6px)`,
              backgroundSize: "9px 9px",
              opacity: 0.5,
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 14,
            bottom: 14,
            left: 0,
            width: 2,
            background: `linear-gradient(180deg, transparent, ${theme.accent}, transparent)`,
          }}
        />
      </div>
    </div>
  );
}

// بطاقة ميزة صغيرة موحّدة (أيقونة + عنوان + وصف قصير) — تُستخدم في صفوف
// الميزات أسفل صفحتي الترحيب ونبذة الشركة، وأي قسم آخر يحتاج تلخيصاً بصرياً
// لعدّة نقاط بدل فقرات نصية طويلة.
function FeatureCard({
  theme,
  icon,
  title,
  description,
  highlight,
}: {
  theme: PresentationTheme;
  icon: IconName;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: "16px 14px",
        borderRadius: 14,
        background: highlight ? `${theme.accent}14` : theme.card,
        border: `1px solid ${highlight ? theme.accent : theme.border}`,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.accent,
          marginBottom: 10,
        }}
      >
        <Icon name={icon} size={15} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: theme.text, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 10.5, color: theme.muted, lineHeight: 1.6 }}>{description}</div>
    </div>
  );
}

// عنوان ديناميكي لصفحة الترحيب يُختار وفق طبيعة المشروع الفعلية (لا عنوان
// ثابت "رسالة ترحيبية")، وفقرات مولَّدة من بيانات المشروع نفسه — إن خصّص
// المستخدم نص "رسالة المشروع" يدوياً من منشئ العروض يُستخدم كما هو.
function pickWelcomeHeading(data: PresentationData): string {
  if (data.episodes.length > 1) return "بداية الرحلة";
  if (data.projectDescription) return "عن هذا المشروع";
  return "رؤية المشروع";
}

function buildWelcomeParagraphs(data: PresentationData, texts: PresentationTexts): string[] {
  if (texts.project_message) return [texts.project_message];
  const clientOrProject = data.clientName || data.projectName;
  const services = data.services.map((s) => s.label).filter(Boolean);
  const servicesText = services.length > 0 ? joinArabicList(services) : "محتوى مرئي ومسموع احترافي";
  return [
    `يسعدنا في **${data.companyName}** أن نضع بين أيديكم هذا العرض، المُعَدّ خصيصاً لمشروع **${data.projectName}**${
      data.clientName ? ` بالتعاون مع **${data.clientName}**` : ""
    }.`,
    data.projectDescription
      ? data.projectDescription
      : `يتولّى فريقنا تقديم **${servicesText}** بما يخدم أهداف ${clientOrProject} ويعكس هويتها الحقيقية أمام جمهورها.`,
    `نُدير هذا المشروع من الفكرة الأولى وحتى التسليم النهائي بخطة عمل واضحة، لنضمن نتيجة تحقّق **أعلى معايير الجودة** وتصل برسالتكم إلى وجهتها بأفضل صورة.`,
  ];
}

function buildWelcomeFeatures(data: PresentationData): { icon: IconName; title: string; description: string }[] {
  const out: { icon: IconName; title: string; description: string }[] = [];
  if (data.episodes.length > 0) {
    out.push({
      icon: "episodes",
      title: `${data.episodes.length} ${data.episodes.length === 1 ? "عنصر إنتاجي" : "عناصر إنتاجية"}`,
      description: "محتوى مصمَّم خصيصاً لتحقيق أهداف المشروع",
    });
  }
  if (data.services.length > 0) {
    out.push({ icon: "sparkles", title: "خدمات متكاملة", description: joinArabicList(data.services.map((s) => s.label).slice(0, 3)) });
  }
  if (data.team.length > 0) {
    out.push({ icon: "team", title: "فريق متخصص", description: `${data.team.length} ${data.team.length === 1 ? "مختص" : "من المختصين"} يواكبون التنفيذ` });
  }
  if (data.equipmentNames.length > 0) {
    out.push({ icon: "equipment", title: "معدات احترافية", description: "أدوات وتقنيات تواكب أعلى معايير الإنتاج" });
  }
  if (data.deliveryDate) {
    out.push({ icon: "calendar", title: "التزام بالمواعيد", description: `تسليم نهائي بتاريخ ${compactDate(data.deliveryDate)}` });
  }
  out.push({ icon: "shield", title: "جودة مضمونة", description: "مراجعة دقيقة لكل مرحلة قبل الاعتماد النهائي" });
  return out.slice(0, 4);
}

export function WelcomeSection({ data, texts, theme }: SectionProps) {
  const heading = pickWelcomeHeading(data);
  const paragraphs = buildWelcomeParagraphs(data, texts);
  const features = buildWelcomeFeatures(data);
  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="عرض فني مقترح">
        {heading}
      </SlideTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0, overflowY: "auto" }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ fontSize: i === 0 ? 15 : 13, lineHeight: 1.9, color: i === 0 ? theme.text : theme.muted, margin: 0, whiteSpace: "pre-wrap" }}>
            <HighlightedText theme={theme} text={p} />
          </p>
        ))}
      </div>
      {features.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexShrink: 0 }}>
          {features.map((f, i) => (
            <FeatureCard key={i} theme={theme} icon={f.icon} title={f.title} description={f.description} highlight={i === 0} />
          ))}
        </div>
      )}
    </Slide>
  );
}

function buildCompanyFeatures(texts: PresentationTexts): { icon: IconName; title: string; description: string }[] {
  const out: { icon: IconName; title: string; description: string }[] = [];
  if (texts.company_vision) out.push({ icon: "zap", title: "الرؤية", description: texts.company_vision });
  if (texts.company_mission) out.push({ icon: "badgeCheck", title: "الرسالة", description: texts.company_mission });
  if (texts.company_values) out.push({ icon: "shield", title: "القيم", description: texts.company_values });
  const fallback: { icon: IconName; title: string; description: string }[] = [
    { icon: "sparkles", title: "حلول إبداعية", description: "أفكار مبتكرة تُترجَم إلى محتوى مؤثر" },
    { icon: "team", title: "فريق متخصص", description: "خبرات معتمدة في كل مراحل الإنتاج" },
    { icon: "badgeCheck", title: "جودة عالية", description: "معايير دقيقة في كل تفصيل" },
    { icon: "zap", title: "التزام بالمواعيد", description: "تسليم في الوقت المتّفق عليه" },
  ];
  for (const f of fallback) {
    if (out.length >= 4) break;
    if (!out.some((o) => o.title === f.title)) out.push(f);
  }
  return out.slice(0, 4);
}

// نبذة الشركة: شعار ضخم في اللوحة اليسرى (بدل فقرة نصية عادية) مع دوائر
// زخرفية خلفه، ولوحة يمنى بالمحتوى — أقرب لصفحة براندنغ فاخرة منها لصفحة نص.
export function CompanyBioSection({ data, texts, theme }: SectionProps) {
  const bio = texts.company_bio || `${data.companyName} شركة متخصصة في تقديم حلول إنتاج إعلامي متكاملة، تجمع بين **الإبداع** و**الدقة** لتحويل الأفكار إلى محتوى احترافي مؤثر.`;
  const features = buildCompanyFeatures(texts);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", background: theme.bg, overflow: "hidden", direction: "ltr" }}>
      <div style={{ flex: "0 0 40%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", border: `1px solid ${theme.border}` }} />
        <div style={{ position: "absolute", width: 210, height: 210, borderRadius: "50%", border: `1px solid ${theme.border}` }} />
        {data.companyLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.companyLogoUrl}
            alt=""
            style={{ maxWidth: "56%", maxHeight: "46%", objectFit: "contain", position: "relative", zIndex: 2, filter: "drop-shadow(0 16px 30px rgba(0,0,0,0.45))" }}
          />
        ) : (
          <div style={{ color: theme.accent, position: "relative", zIndex: 2 }}>
            <Icon name="company" size={80} />
          </div>
        )}
      </div>

      <div style={{ flex: "1 1 60%", direction: "rtl", textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "26px 40px 20px 8px", minWidth: 0 }}>
        <PremiumHeader data={data} theme={theme} />
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <span style={{ width: 18, height: 1, background: theme.accent }} />
            <span style={{ fontSize: 10, letterSpacing: 2, color: theme.accent, fontWeight: 700 }}>نبذة عن الشركة</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: theme.text, margin: 0, marginBottom: 12 }}>{data.companyName}</h1>
          <p style={{ fontSize: 13, lineHeight: 1.85, color: theme.muted, margin: 0, whiteSpace: "pre-wrap" }}>
            <HighlightedText theme={theme} text={bio} />
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {features.map((f, i) => (
            <FeatureCard key={i} theme={theme} icon={f.icon} title={f.title} description={f.description} />
          ))}
        </div>
        <PremiumFooter data={data} theme={theme} />
      </div>
    </div>
  );
}

function buildWhyProjectIntro(data: PresentationData): string {
  const clientOrProject = data.clientName || data.projectName;
  return `نؤمن أن كل مشروع يستحق **قيمة حقيقية**، ولذلك بنينا رؤيتنا لتنفيذ **${data.projectName}** على فهم عميق لاحتياجات **${clientOrProject}**.`;
}

export function WhyProjectSection({ data, texts, theme }: SectionProps) {
  const cards: { label: string; icon: IconName; value?: string; highlight?: boolean }[] = [
    { label: "المشكلة", icon: "alert", value: texts.why_problem },
    { label: "الفرصة", icon: "sparkles", value: texts.why_opportunity, highlight: true },
    { label: "الفائدة", icon: "trendUp", value: texts.why_value },
  ];
  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="رؤيتنا">
        لماذا هذا المشروع
      </SlideTitle>
      <p style={{ fontSize: 13.5, lineHeight: 1.9, color: theme.muted, margin: "0 0 20px", maxWidth: 640 }}>
        <HighlightedText theme={theme} text={buildWhyProjectIntro(data)} />
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              background: c.highlight ? `${theme.accent}14` : theme.card,
              borderRadius: 16,
              padding: 20,
              border: `1px solid ${c.highlight ? theme.accent : theme.border}`,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: theme.bg,
                border: `1px solid ${theme.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.accent,
                marginBottom: 14,
              }}
            >
              <Icon name={c.icon} size={16} />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: theme.text, marginBottom: 10 }}>{c.label}</div>
            <p style={{ fontSize: 12.5, lineHeight: 1.75, color: theme.muted, whiteSpace: "pre-wrap", margin: 0 }}>
              {c.value ? <HighlightedText theme={theme} text={c.value} /> : "—"}
            </p>
          </div>
        ))}
      </div>
    </Slide>
  );
}

export function ObjectivesSection({ data, texts, theme }: SectionProps) {
  const objectives = texts.objectives ?? [];
  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="خارطة الطريق">
        أهداف المشروع
      </SlideTitle>
      {objectives.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لم تُضَف أهداف بعد.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {objectives.map((obj, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                background: i === 0 ? `${theme.accent}14` : theme.card,
                borderRadius: 14,
                padding: 16,
                border: `1px solid ${i === 0 ? theme.accent : theme.border}`,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: theme.accent,
                  flexShrink: 0,
                }}
              >
                <Icon name="checkCircle" size={14} />
              </div>
              <span style={{ fontSize: 13, lineHeight: 1.7, color: theme.text }}>{obj}</span>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}

export function AudienceSection({ data, texts, theme }: SectionProps) {
  const chips: { icon: IconName; label: string }[] = [];
  if (data.locations.length > 0) chips.push({ icon: "location", label: joinArabicList(data.locations.slice(0, 3)) });
  if (data.services.length > 0) chips.push({ icon: "sparkles", label: joinArabicList(data.services.map((s) => s.label).slice(0, 3)) });

  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="من نخاطب">
        الجمهور المستهدف
      </SlideTitle>
      <div
        style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          padding: 24,
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: theme.bg, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: theme.accent, flexShrink: 0 }}>
          <Icon name="clients" size={17} />
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.9, whiteSpace: "pre-wrap", color: theme.text, margin: 0 }}>
          {texts.audience ? <HighlightedText theme={theme} text={texts.audience} /> : "—"}
        </p>
      </div>
      {chips.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          {chips.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 999, background: theme.card, border: `1px solid ${theme.border}` }}>
              <span style={{ color: theme.accent, display: "flex" }}>
                <Icon name={c.icon} size={13} />
              </span>
              <span style={{ fontSize: 11.5, color: theme.text }}>{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}

export function CreativeIdeaSection({ data, texts, theme }: SectionProps) {
  const allBlocks: { icon: IconName; label: string; value?: string }[] = [
    { icon: "wand", label: "المفهوم", value: texts.creative_idea || data.projectDescription || undefined },
    { icon: "palette", label: "أسلوب التنفيذ", value: texts.shooting_style || undefined },
    { icon: "trendUp", label: "الأثر المتوقع", value: texts.why_value || undefined },
  ];
  const blocks = allBlocks.filter((b) => b.value);

  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="الإبداع">
        الفكرة الإبداعية
      </SlideTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {blocks.length === 0 && <p style={{ fontSize: 13, color: theme.muted }}>—</p>}
        {blocks.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "16px 18px", borderRadius: 14, background: theme.card, border: `1px solid ${theme.border}`, borderInlineStart: `2px solid ${theme.accent}` }}>
            <div style={{ color: theme.accent, flexShrink: 0, marginTop: 2 }}>
              <Icon name={b.icon} size={16} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: theme.accent, marginBottom: 6 }}>{b.label}</div>
              <p style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", color: theme.text, margin: 0 }}>
                <HighlightedText theme={theme} text={b.value!} />
              </p>
            </div>
          </div>
        ))}
      </div>
    </Slide>
  );
}

export function VisualIdentitySection({ data, theme }: SectionProps) {
  const swatches: { label: string; color: string }[] = [
    { label: "اللون الأساسي", color: data.companyPrimaryColor },
    { label: "اللون الثانوي", color: data.companySecondaryColor },
    { label: "لون التمييز", color: data.companyAccentColor },
  ].filter((s) => s.color);

  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="البراند">
        الهوية البصرية
      </SlideTitle>
      <div style={{ display: "flex", gap: 24, alignItems: "stretch", flex: 1, minHeight: 0 }}>
        {data.projectCoverUrl && (
          <div style={{ flex: "0 0 42%", borderRadius: 16, overflow: "hidden", border: `1px solid ${theme.border}`, position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.projectCoverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
          <div style={{ display: "flex", gap: 16 }}>
            {swatches.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: s.color, border: `1px solid ${theme.border}`, marginBottom: 8 }} />
                <div style={{ fontSize: 10.5, color: theme.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
          {data.companyLogoUrl && (
            <div style={{ padding: 16, borderRadius: 14, background: theme.card, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.companyLogoUrl} alt="" style={{ height: 34, maxWidth: 110, objectFit: "contain" }} />
              <span style={{ fontSize: 11.5, color: theme.muted }}>الشعار الرسمي لـ{data.companyName}</span>
            </div>
          )}
        </div>
      </div>
    </Slide>
  );
}

export function ShootingStyleSection({ data, texts, theme }: SectionProps) {
  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="التنفيذ">
        أسلوب التصوير
      </SlideTitle>
      <div
        style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          padding: 24,
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: theme.bg, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: theme.accent, flexShrink: 0 }}>
          <Icon name="palette" size={17} />
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.9, whiteSpace: "pre-wrap", color: theme.text, margin: 0 }}>
          {texts.shooting_style ? <HighlightedText theme={theme} text={texts.shooting_style} /> : "—"}
        </p>
      </div>
    </Slide>
  );
}

export function FaqSection({ data, texts, theme }: SectionProps) {
  const faq = texts.faq ?? [];
  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="أسئلة وأجوبة">
        الأسئلة الشائعة
      </SlideTitle>
      {faq.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد أسئلة مضافة.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
          {faq.map((f, i) => (
            <div key={i} style={{ padding: "14px 16px", borderRadius: 12, background: theme.card, border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: theme.accent }}>{f.question}</div>
              <p style={{ fontSize: 12.5, color: theme.muted, marginTop: 6, lineHeight: 1.7 }}>{f.answer}</p>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}

export function TermsSection({ data, texts, theme }: SectionProps) {
  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="اتفاقنا">
        الشروط والتسليم
      </SlideTitle>
      <p style={{ fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap", color: theme.muted }}>{texts.terms || "—"}</p>
    </Slide>
  );
}

export function ThanksSection({ data, texts, theme }: SectionProps) {
  return (
    <Slide theme={theme} data={data} style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <h1 style={{ fontSize: 30, fontWeight: 900, color: theme.text }}>
        <HighlightedText theme={theme} text={texts.thanks_message || "شكراً لثقتكم بنا"} />
      </h1>
      <p style={{ fontSize: 13, color: theme.muted, marginTop: 14 }}>{data.companyName}</p>
    </Slide>
  );
}
