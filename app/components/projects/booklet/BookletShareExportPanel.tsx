"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { setBookletSharing, type BookletBundle } from "@/app/lib/booklet-builder";
import { getPresentationTheme } from "@/app/lib/presentation-themes";
import { buildBookletPptx } from "@/app/lib/booklet-pptx";
import { buildBookletPdf, type PdfExportProgress } from "@/app/lib/booklet-pdf";

export default function BookletShareExportPanel({
  bundle,
  onBundleChange,
  projectId,
}: {
  bundle: BookletBundle;
  onBundleChange: (b: BookletBundle) => void;
  projectId: string;
}) {
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [buildingPptx, setBuildingPptx] = useState(false);
  const [pptxError, setPptxError] = useState<string | null>(null);
  const [buildingPdf, setBuildingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PdfExportProgress | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { booklet } = bundle;

  const shareUrl = booklet.share_token ? `${window.location.origin}/booklet/${booklet.share_token}` : null;

  async function toggleShare() {
    setToggling(true);
    const token = await setBookletSharing(booklet.id, !booklet.share_enabled, booklet.share_token);
    onBundleChange({ ...bundle, booklet: { ...booklet, share_enabled: !booklet.share_enabled, share_token: token } });
    setToggling(false);
  }

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  async function downloadPptx() {
    setBuildingPptx(true);
    setPptxError(null);
    try {
      const theme = getPresentationTheme(bundle.booklet.template, bundle.data);
      await buildBookletPptx(bundle.data, bundle.booklet, theme);
    } catch {
      setPptxError("تعذّر إنشاء ملف PowerPoint. حاول مجدداً.");
    } finally {
      setBuildingPptx(false);
    }
  }

  async function downloadPdf() {
    setBuildingPdf(true);
    setPdfError(null);
    setPdfProgress(null);
    try {
      const theme = getPresentationTheme(bundle.booklet.template, bundle.data);
      await buildBookletPdf(bundle.data, bundle.booklet, theme, setPdfProgress);
    } catch {
      setPdfError("تعذّر إنشاء ملف PDF. حاول مجدداً.");
    } finally {
      setBuildingPdf(false);
      setPdfProgress(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>النسخة التفاعلية عبر الويب</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>رابط مباشر يعرض الكتيّب الحالي دون الحاجة لتسجيل دخول، ويتحدّث تلقائياً مع أي تعديل لاحق.</p>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={booklet.share_enabled} onChange={toggleShare} disabled={toggling} />
            <span style={{ fontSize: 13 }}>{booklet.share_enabled ? "مفعّلة" : "معطّلة"}</span>
          </label>
        </div>

        {booklet.share_enabled && shareUrl && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="input-field" readOnly value={shareUrl} dir="ltr" style={{ fontSize: 12 }} />
            <button className="btn btn-outline" style={{ padding: "9px 12px" }} onClick={copyLink}>
              <Icon name={copied ? "check" : "copy"} size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>تصدير الملفات</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>احصل على نسخة قابلة للتنزيل أو الطباعة من نفس محتوى الكتيّب الحالي.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-gold" style={{ justifyContent: "flex-start", gap: 10 }} onClick={downloadPdf} disabled={buildingPdf}>
            <Icon name="export" size={16} />
            {buildingPdf ? `جارٍ الإنشاء... (${pdfProgress ? `${pdfProgress.index}/${pdfProgress.total}` : "..."})` : "تنزيل PDF"}
          </button>
          {pdfError && <p style={{ fontSize: 12, color: "var(--danger, #EF4444)" }}>{pdfError}</p>}

          <button className="btn btn-outline" style={{ justifyContent: "flex-start", gap: 10 }} onClick={downloadPptx} disabled={buildingPptx}>
            <Icon name="fileCheck" size={16} /> {buildingPptx ? "جارٍ الإنشاء..." : "تنزيل PowerPoint"}
          </button>
          {pptxError && <p style={{ fontSize: 12, color: "var(--danger, #EF4444)" }}>{pptxError}</p>}

          <a href={`/api/booklet/${projectId}/html`} className="btn btn-outline" style={{ justifyContent: "flex-start", gap: 10 }}>
            <Icon name="fileUp" size={16} /> تنزيل HTML
          </a>

          <Link
            href={`/projects/${projectId}/booklet/print`}
            target="_blank"
            className="btn btn-ghost"
            style={{ justifyContent: "flex-start", gap: 10, fontSize: 12.5 }}
          >
            <Icon name="export" size={14} /> فتح نسخة الطباعة يدوياً (لضبط الهوامش أو الطباعة الورقية)
          </Link>
        </div>
      </div>
    </div>
  );
}
