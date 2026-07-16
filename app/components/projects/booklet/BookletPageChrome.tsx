import type { BookletData } from "@/app/lib/booklet-sections";
import type { PresentationTheme } from "@/app/lib/presentation-themes";

// إطار احترافي حول كل صفحة محتوى (Header باسم المشروع + Footer بمعلومات الشركة
// وحقوق النشر + ترقيم صفحات) — يُستخدم فقط في قنوات التصدير الثابتة (الطباعة/PDF
// وHTML)، وليس في المعاينة التفاعلية داخل المُنشئ أو صفحة المشاركة العامة (التي
// تُصمَّم كشرائح كاملة البروز). صفحة الغلاف مستثناة عمداً — تحمل تصميمها الخاص
// الذي يتضمّن شعار الشركة واسمها أصلاً بشكل أكبر وأبرز.
export default function BookletPageChrome({
  data,
  theme,
  pageNumber,
  totalPages,
  children,
}: {
  data: BookletData;
  theme: PresentationTheme;
  pageNumber: number;
  totalPages: number;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", background: theme.bg }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 30px",
          borderBottom: `1px solid ${theme.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {data.companyLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.companyLogoUrl} alt="" style={{ height: 18, objectFit: "contain" }} />
          )}
          <span style={{ fontSize: 11, color: theme.muted }}>{data.companyName}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: theme.accent }}>{data.projectName}</span>
      </div>

      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>{children}</div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 30px",
          borderTop: `1px solid ${theme.border}`,
          flexShrink: 0,
          fontSize: 10,
          color: theme.muted,
        }}
      >
        <span>
          © {new Date().getFullYear()} {data.companyName}
          {data.companyWebsite ? ` • ${data.companyWebsite}` : ""}
        </span>
        <span>
          {pageNumber} / {totalPages}
        </span>
      </div>
    </div>
  );
}
