import Icon from "@/app/components/ui/Icon";
import type { PresentationData } from "@/app/lib/presentation-sections";
import type { PresentationTheme } from "@/app/lib/presentation-themes";
import { HighlightedText } from "@/app/lib/presentation-highlight";
import type { PresentationTexts } from "@/app/lib/types";

export interface SectionProps {
  data: PresentationData;
  texts: PresentationTexts;
  theme: PresentationTheme;
}

export function Slide({ theme, children, style }: { theme: PresentationTheme; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: theme.bg,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        padding: 48,
        fontFamily: theme.fontHeading,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SlideTitle({ theme, children }: { theme: PresentationTheme; children: React.ReactNode }) {
  return <h2 style={{ fontSize: 28, fontWeight: 800, color: theme.accent, marginBottom: 20 }}>{children}</h2>;
}

function whatsappHref(number: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}`;
}

function websiteHref(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
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

export function WelcomeSection({ data, texts, theme }: SectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>رسالة ترحيبية{data.clientName ? ` إلى ${data.clientName}` : ""}</SlideTitle>
      <p style={{ fontSize: 16, lineHeight: 2, color: theme.text, opacity: 0.9, whiteSpace: "pre-wrap" }}>
        <HighlightedText
          theme={theme}
          text={texts.welcome_message || "نتشرّف بتقديم هذا العرض المقترح لمشروعكم، ونتطلّع للعمل معكم على تحويل الفكرة إلى محتوى احترافي متكامل."}
        />
      </p>
      {texts.project_message && (
        <p style={{ fontSize: 14, marginTop: 20, color: theme.muted, whiteSpace: "pre-wrap" }}>
          <HighlightedText theme={theme} text={texts.project_message} />
        </p>
      )}
    </Slide>
  );
}

export function CompanyBioSection({ data, texts, theme }: SectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>نبذة عن الشركة</SlideTitle>
      <p style={{ fontSize: 15, lineHeight: 1.9, color: theme.text, opacity: 0.9, whiteSpace: "pre-wrap", marginBottom: 20 }}>
        <HighlightedText theme={theme} text={texts.company_bio || `${data.companyName} شركة إنتاج إعلامي متخصصة في تحويل الأفكار إلى محتوى احترافي.`} />
      </p>
      {(texts.company_vision || texts.company_mission || texts.company_values) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 10 }}>
          {texts.company_vision && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent, marginBottom: 6 }}>الرؤية</div>
              <p style={{ fontSize: 13, color: theme.muted, whiteSpace: "pre-wrap" }}>
                <HighlightedText theme={theme} text={texts.company_vision} />
              </p>
            </div>
          )}
          {texts.company_mission && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent, marginBottom: 6 }}>الرسالة</div>
              <p style={{ fontSize: 13, color: theme.muted, whiteSpace: "pre-wrap" }}>
                <HighlightedText theme={theme} text={texts.company_mission} />
              </p>
            </div>
          )}
          {texts.company_values && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent, marginBottom: 6 }}>القيم</div>
              <p style={{ fontSize: 13, color: theme.muted, whiteSpace: "pre-wrap" }}>
                <HighlightedText theme={theme} text={texts.company_values} />
              </p>
            </div>
          )}
        </div>
      )}
      {texts.ceo_message && (
        <p style={{ fontSize: 13, marginTop: 24, color: theme.muted, fontStyle: "italic", whiteSpace: "pre-wrap" }}>
          « <HighlightedText theme={theme} text={texts.ceo_message} /> »
        </p>
      )}
      <CompanyContactBlock data={data} theme={theme} />
    </Slide>
  );
}

export function WhyProjectSection({ texts, theme }: SectionProps) {
  const cards = [
    { label: "المشكلة", value: texts.why_problem },
    { label: "الفرصة", value: texts.why_opportunity, highlight: true },
    { label: "الفائدة", value: texts.why_value },
  ];
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>لماذا هذا المشروع</SlideTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              background: c.highlight ? theme.accent : theme.card,
              color: c.highlight ? "#0A0A0B" : theme.text,
              borderRadius: 14,
              padding: 18,
              border: c.highlight ? "none" : `1px solid ${theme.border}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{c.label}</div>
            <p style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.9, whiteSpace: "pre-wrap" }}>
              {c.value ? <HighlightedText theme={theme} text={c.value} boldColor={c.highlight ? "#0A0A0B" : undefined} /> : "—"}
            </p>
          </div>
        ))}
      </div>
    </Slide>
  );
}

export function ObjectivesSection({ texts, theme }: SectionProps) {
  const objectives = texts.objectives ?? [];
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>أهداف المشروع</SlideTitle>
      {objectives.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لم تُضَف أهداف بعد.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {objectives.map((obj, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: theme.card, borderRadius: 12, padding: 14, border: `1px solid ${theme.border}` }}>
              <Icon name="checkCircle" size={16} className="text-muted" />
              <span style={{ fontSize: 13, lineHeight: 1.7 }}>{obj}</span>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}

export function AudienceSection({ texts, theme }: SectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الجمهور المستهدف</SlideTitle>
      <p style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: "pre-wrap", color: theme.text, opacity: 0.9 }}>
        {texts.audience ? <HighlightedText theme={theme} text={texts.audience} /> : "—"}
      </p>
    </Slide>
  );
}

export function CreativeIdeaSection({ data, texts, theme }: SectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الفكرة الإبداعية</SlideTitle>
      <p style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: "pre-wrap", color: theme.text, opacity: 0.9 }}>
        <HighlightedText theme={theme} text={texts.creative_idea || data.projectDescription || "—"} />
      </p>
    </Slide>
  );
}

export function VisualIdentitySection({ data, theme }: SectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الهوية البصرية</SlideTitle>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {data.projectCoverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.projectCoverUrl} alt="" style={{ width: 220, height: 140, objectFit: "cover", borderRadius: 12 }} />
        )}
        <div style={{ display: "flex", gap: 10 }}>
          {[theme.accent, theme.card, theme.text, theme.muted].map((c, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: c, border: `1px solid ${theme.border}` }} />
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

export function ShootingStyleSection({ texts, theme }: SectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>أسلوب التصوير</SlideTitle>
      <p style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: "pre-wrap", color: theme.text, opacity: 0.9 }}>
        {texts.shooting_style ? <HighlightedText theme={theme} text={texts.shooting_style} /> : "—"}
      </p>
    </Slide>
  );
}

export function FaqSection({ texts, theme }: SectionProps) {
  const faq = texts.faq ?? [];
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الأسئلة الشائعة</SlideTitle>
      {faq.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد أسئلة مضافة.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {faq.map((f, i) => (
            <div key={i}>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.accent }}>{f.question}</div>
              <p style={{ fontSize: 13, color: theme.text, opacity: 0.85, marginTop: 4 }}>{f.answer}</p>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}

export function TermsSection({ texts, theme }: SectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الشروط والتسليم</SlideTitle>
      <p style={{ fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap", color: theme.text, opacity: 0.85 }}>{texts.terms || "—"}</p>
    </Slide>
  );
}

export function ThanksSection({ data, texts, theme }: SectionProps) {
  return (
    <Slide theme={theme} style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, color: theme.accent }}>
        <HighlightedText theme={theme} text={texts.thanks_message || "شكراً لثقتكم بنا"} />
      </h1>
      <p style={{ fontSize: 13, color: theme.muted, marginTop: 20 }}>{data.companyName}</p>
      <CompanyContactBlock data={data} theme={theme} />
    </Slide>
  );
}
