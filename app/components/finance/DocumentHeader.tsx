/* eslint-disable @next/next/no-img-element */
import type { Company } from "@/app/lib/types";

// CSS مشترك لصفحات الطباعة (فاتورة/عقد/عرض/تقرير) — يُحقن عبر وسم <style>.
// يوفّر مظهر "ورقة بيضاء" على الشاشة ويعيد الضبط عند الطباعة.
export const printResetCss = `
.doc-page {
  max-width: 820px;
  margin: 0 auto;
  background: #ffffff;
  color: #1a1a20;
  border-radius: 12px;
  padding: 40px 44px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.25);
  line-height: 1.7;
}
.doc-page * { color: inherit; }
.doc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 2px solid #9B6C23; padding-bottom: 20px; margin-bottom: 24px; }
.doc-company-name { font-size: 20px; font-weight: 800; }
.doc-company-line { font-size: 12px; color: #555; margin-top: 3px; }
.doc-logo { max-height: 64px; max-width: 180px; object-fit: contain; }
.doc-title-wrap { text-align: left; }
.doc-title { font-size: 30px; font-weight: 800; color: #9B6C23; }
.doc-subtitle { font-size: 14px; color: #555; margin-top: 2px; }
.doc-meta { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
.doc-label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #999; margin-bottom: 4px; }
.doc-strong { font-weight: 700; font-size: 15px; }
.doc-muted { color: #666; font-size: 13px; }
.doc-row { font-size: 13px; margin-bottom: 3px; }
.doc-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
.doc-table th { background: #f4f2ec; padding: 10px 14px; font-size: 12px; color: #555; border-bottom: 2px solid #e2e0d8; }
.doc-table td { padding: 12px 14px; font-size: 14px; border-bottom: 1px solid #eee; }
.doc-totals { margin-inline-start: auto; width: 280px; margin-bottom: 24px; }
.doc-total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
.doc-grand { border-top: 2px solid #9B6C23; margin-top: 6px; padding-top: 10px; font-size: 17px; font-weight: 800; }
.doc-section { margin-bottom: 20px; }
.doc-section-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; color: #1a1a20; }
.doc-notes { background: #f9f8f4; border: 1px solid #eee; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 13px; }
.doc-clause { margin-bottom: 14px; }
.doc-clause-title { font-weight: 700; font-size: 14px; margin-bottom: 3px; }
.doc-clause-body { font-size: 13px; color: #333; white-space: pre-wrap; }
.doc-signatures { display: flex; justify-content: space-between; gap: 40px; margin-top: 48px; }
.doc-sign-box { flex: 1; text-align: center; }
.doc-sign-img { max-height: 70px; object-fit: contain; margin-bottom: 6px; }
.doc-sign-line { border-top: 1px solid #999; padding-top: 6px; font-size: 13px; color: #555; }
.doc-footer { border-top: 1px solid #e2e0d8; margin-top: 32px; padding-top: 16px; text-align: center; font-size: 12px; }
.doc-footer > div:first-child { font-weight: 700; }
@media print {
  body, main, .main-content, div { background: #ffffff !important; }
  .doc-page { box-shadow: none !important; margin: 0 !important; max-width: none !important; padding: 0 !important; border-radius: 0 !important; }
  .main-content { padding: 0 !important; }
  @page { margin: 16mm; }
}
`;

export default function DocumentHeader({
  company,
  title,
  subtitle,
}: {
  company: Company;
  title: string;
  subtitle?: string;
}) {
  // شعار المستندات الرسمية إن رُفع خصيصاً، وإلا الشعار الرئيسي — كل مستند مطبوع
  // (فاتورة/عقد/عرض) يمر من هنا فيرث التبديل تلقائياً بلا أي تعديل في كل صفحة.
  const documentLogo = company.document_logo_url || company.logo_url;

  return (
    <div className="doc-head">
      <div>
        {documentLogo ? (
          <img src={documentLogo} alt={company.name} className="doc-logo" />
        ) : (
          <div className="doc-company-name">{company.name}</div>
        )}
        {documentLogo && <div className="doc-company-name" style={{ marginTop: 6 }}>{company.name}</div>}
        {company.commercial_register && (
          <div className="doc-company-line">س.ت: {company.commercial_register}</div>
        )}
        {company.tax_number && <div className="doc-company-line">الرقم الضريبي: {company.tax_number}</div>}
        {company.address && <div className="doc-company-line">{company.address}</div>}
        <div className="doc-company-line">
          {[company.phone, company.email].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div className="doc-title-wrap">
        <div className="doc-title">{title}</div>
        {subtitle && <div className="doc-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

// التوقيع الافتراضي الذي اختارته الشركة (إعدادات الشركة ← التوقيع والختم) —
// يُستخدم في كل مستند مطبوع بدل الاعتماد دائماً على "توقيع المدير" فقط.
export function defaultSignatureUrl(company: Company): string | null {
  switch (company.default_signature_key) {
    case "executive":
      return company.signature_executive_url || company.signature_url;
    case "accountant":
      return company.signature_accountant_url || company.signature_url;
    case "project_manager":
      return company.signature_pm_url || company.signature_url;
    default:
      return company.signature_url;
  }
}
