import Icon from "@/app/components/ui/Icon";
import type { PresentationData } from "@/app/lib/presentation-sections";
import type { PresentationTheme } from "@/app/lib/presentation-themes";
import type { PresentationTexts } from "@/app/lib/types";

export interface SectionProps {
  data: PresentationData;
  texts: PresentationTexts;
  theme: PresentationTheme;
}

function Slide({ theme, children, style }: { theme: PresentationTheme; children: React.ReactNode; style?: React.CSSProperties }) {
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

function SlideTitle({ theme, children }: { theme: PresentationTheme; children: React.ReactNode }) {
  return <h2 style={{ fontSize: 28, fontWeight: 800, color: theme.accent, marginBottom: 20 }}>{children}</h2>;
}

export function CoverSection({ data, theme }: SectionProps) {
  return (
    <Slide
      theme={theme}
      style={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        backgroundImage: data.projectCoverUrl ? `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)), url(${data.projectCoverUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: data.projectCoverUrl ? "#fff" : theme.text,
      }}
    >
      {data.companyLogoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.companyLogoUrl} alt="" style={{ height: 48, marginBottom: 24, objectFit: "contain" }} />
      )}
      <div style={{ fontSize: 12, letterSpacing: 3, color: theme.accent, marginBottom: 10 }}>عرض مقترح إبداعي</div>
      <h1 style={{ fontSize: 44, fontWeight: 900 }}>{data.projectName}</h1>
      {data.clientName && <div style={{ fontSize: 16, marginTop: 16, opacity: 0.85 }}>مقدَّم إلى: {data.clientName}</div>}
      <div style={{ fontSize: 12, marginTop: 28, opacity: 0.6 }}>{data.companyName}</div>
    </Slide>
  );
}

export function WelcomeSection({ data, texts, theme }: SectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>رسالة ترحيبية{data.clientName ? ` إلى ${data.clientName}` : ""}</SlideTitle>
      <p style={{ fontSize: 16, lineHeight: 2, color: theme.text, opacity: 0.9, whiteSpace: "pre-wrap" }}>
        {texts.welcome_message || "نتشرّف بتقديم هذا العرض المقترح لمشروعكم، ونتطلّع للعمل معكم على تحويل الفكرة إلى محتوى احترافي متكامل."}
      </p>
      {texts.project_message && <p style={{ fontSize: 14, marginTop: 20, color: theme.muted, whiteSpace: "pre-wrap" }}>{texts.project_message}</p>}
    </Slide>
  );
}

export function CompanyBioSection({ data, texts, theme }: SectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>نبذة عن الشركة</SlideTitle>
      <p style={{ fontSize: 15, lineHeight: 1.9, color: theme.text, opacity: 0.9, whiteSpace: "pre-wrap", marginBottom: 20 }}>
        {texts.company_bio || `${data.companyName} شركة إنتاج إعلامي متخصصة في تحويل الأفكار إلى محتوى احترافي.`}
      </p>
      {(texts.company_vision || texts.company_values) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 10 }}>
          {texts.company_vision && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent, marginBottom: 6 }}>الرؤية</div>
              <p style={{ fontSize: 13, color: theme.muted, whiteSpace: "pre-wrap" }}>{texts.company_vision}</p>
            </div>
          )}
          {texts.company_values && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent, marginBottom: 6 }}>القيم</div>
              <p style={{ fontSize: 13, color: theme.muted, whiteSpace: "pre-wrap" }}>{texts.company_values}</p>
            </div>
          )}
        </div>
      )}
      {texts.ceo_message && (
        <p style={{ fontSize: 13, marginTop: 24, color: theme.muted, fontStyle: "italic", whiteSpace: "pre-wrap" }}>« {texts.ceo_message} »</p>
      )}
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
            <p style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.9, whiteSpace: "pre-wrap" }}>{c.value || "—"}</p>
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
      <p style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: "pre-wrap", color: theme.text, opacity: 0.9 }}>{texts.audience || "—"}</p>
    </Slide>
  );
}

export function CreativeIdeaSection({ data, texts, theme }: SectionProps) {
  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الفكرة الإبداعية</SlideTitle>
      <p style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: "pre-wrap", color: theme.text, opacity: 0.9 }}>
        {texts.creative_idea || data.projectDescription || "—"}
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
      <p style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: "pre-wrap", color: theme.text, opacity: 0.9 }}>{texts.shooting_style || "—"}</p>
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
      <h1 style={{ fontSize: 32, fontWeight: 900, color: theme.accent }}>{texts.thanks_message || "شكراً لثقتكم بنا"}</h1>
      <p style={{ fontSize: 13, color: theme.muted, marginTop: 20 }}>{data.companyName}</p>
    </Slide>
  );
}
