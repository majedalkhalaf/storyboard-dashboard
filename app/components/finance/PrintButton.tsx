"use client";

import Icon from "@/app/components/ui/Icon";

// زر يطبع الصفحة الحالية (Save as PDF عبر حوار الطباعة في المتصفح).
export default function PrintButton({ label = "تصدير PDF" }: { label?: string }) {
  return (
    <button className="btn btn-gold no-print" onClick={() => window.print()}>
      <Icon name="export" size={16} /> {label}
    </button>
  );
}
