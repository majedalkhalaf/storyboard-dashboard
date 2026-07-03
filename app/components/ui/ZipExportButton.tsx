"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import type { ZipProgress } from "@/app/lib/zip-export";

/**
 * زر تصدير ZIP عام — يعرض شريط تقدم فوق نافذة مصغّرة أثناء التوليد (الذي يحدث بالكامل
 * داخل المتصفح، لا يوجد عامل خلفي/طابور مهام حقيقي على الخادم لهذا التطبيق)، ثم رسالة
 * نجاح أو خطأ. يُستخدم لتصدير الحلقة وتصدير المشروع بنفس الشكل.
 */
export default function ZipExportButton({
  label,
  icon = "export",
  run,
  variant = "outline",
}: {
  label: string;
  icon?: "export" | "archive" | "folderUp";
  run: (onProgress: (p: ZipProgress) => void) => Promise<void>;
  variant?: "outline" | "gold";
}) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<ZipProgress>({ stage: "", percent: 0 });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function start() {
    setOpen(true);
    setError(null);
    setDone(false);
    setProgress({ stage: "جاري البدء...", percent: 0 });
    try {
      await run((p) => setProgress(p));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر إنشاء ملف ZIP");
    }
  }

  return (
    <>
      <button type="button" className={`btn btn-${variant}`} style={{ padding: "9px 14px", fontSize: 12 }} onClick={start}>
        <Icon name={icon} size={14} /> {label}
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => (done || error) && setOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 380, padding: 20, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            {error ? (
              <>
                <span style={{ color: "var(--danger)", display: "inline-flex" }}>
                  <Icon name="alert" size={28} />
                </span>
                <div style={{ fontWeight: 700, marginTop: 10, marginBottom: 4 }}>تعذّر التصدير</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>{error}</div>
                <button className="btn btn-outline" style={{ width: "100%" }} onClick={() => setOpen(false)}>
                  إغلاق
                </button>
              </>
            ) : done ? (
              <>
                <span style={{ color: "var(--success)", display: "inline-flex" }}>
                  <Icon name="checkCircle" size={28} filled />
                </span>
                <div style={{ fontWeight: 700, marginTop: 10, marginBottom: 4 }}>تم التصدير بنجاح</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>بدأ تنزيل الملف تلقائياً</div>
                <button className="btn btn-gold" style={{ width: "100%" }} onClick={() => setOpen(false)}>
                  حسناً
                </button>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>{progress.stage}</div>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div className="progress-fill" style={{ width: `${progress.percent}%`, transition: "width .2s" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{progress.percent}%</div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
