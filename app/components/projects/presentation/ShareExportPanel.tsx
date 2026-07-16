"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { setPresentationSharing, type PresentationBundle } from "@/app/lib/presentation-builder";
import { getPresentationTheme } from "@/app/lib/presentation-themes";
import { buildPresentationPptx } from "@/app/lib/presentation-pptx";

export default function ShareExportPanel({
  bundle,
  onBundleChange,
  projectId,
}: {
  bundle: PresentationBundle;
  onBundleChange: (b: PresentationBundle) => void;
  projectId: string;
}) {
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [buildingPptx, setBuildingPptx] = useState(false);
  const [pptxError, setPptxError] = useState<string | null>(null);
  const { presentation } = bundle;

  const shareUrl = presentation.share_token ? `${window.location.origin}/present/${presentation.share_token}` : null;

  async function toggleShare() {
    setToggling(true);
    const token = await setPresentationSharing(presentation.id, !presentation.share_enabled, presentation.share_token);
    onBundleChange({ ...bundle, presentation: { ...presentation, share_enabled: !presentation.share_enabled, share_token: token } });
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
      const theme = getPresentationTheme(bundle.presentation.template, bundle.data);
      await buildPresentationPptx(bundle.data, bundle.presentation, theme);
    } catch {
      setPptxError("تعذّر إنشاء ملف PowerPoint. حاول مجدداً.");
    } finally {
      setBuildingPptx(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>النسخة التفاعلية عبر الويب</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>رابط مباشر يعرض العرض الحالي دون الحاجة لتسجيل دخول، ويتحدّث تلقائياً مع أي تعديل لاحق.</p>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={presentation.share_enabled} onChange={toggleShare} disabled={toggling} />
            <span style={{ fontSize: 13 }}>{presentation.share_enabled ? "مفعّلة" : "معطّلة"}</span>
          </label>
        </div>

        {presentation.share_enabled && shareUrl && (
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
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>احصل على نسخة قابلة للتنزيل أو الطباعة من نفس محتوى العرض الحالي.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href={`/projects/${projectId}/presentation/print`}
            target="_blank"
            className="btn btn-outline"
            style={{ justifyContent: "flex-start", gap: 10 }}
          >
            <Icon name="export" size={16} /> فتح نسخة الطباعة / تصدير PDF
          </Link>

          <button className="btn btn-outline" style={{ justifyContent: "flex-start", gap: 10 }} onClick={downloadPptx} disabled={buildingPptx}>
            <Icon name="proposals" size={16} /> {buildingPptx ? "جارٍ الإنشاء..." : "تنزيل PowerPoint"}
          </button>
          {pptxError && <p style={{ fontSize: 12, color: "var(--danger, #EF4444)" }}>{pptxError}</p>}

          <a href={`/api/presentation/${projectId}/html`} className="btn btn-outline" style={{ justifyContent: "flex-start", gap: 10 }}>
            <Icon name="fileUp" size={16} /> تنزيل HTML
          </a>
        </div>
      </div>
    </div>
  );
}
