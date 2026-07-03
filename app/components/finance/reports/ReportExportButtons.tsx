"use client";

import Icon from "@/app/components/ui/Icon";
import PrintButton from "@/app/components/finance/PrintButton";
import { exportReportExcel, exportReportWord } from "@/app/lib/report-export";
import type { MonthlyReportData, AnnualReportData } from "@/app/lib/finance-reports";

export default function ReportExportButtons({ report, filenameBase }: { report: MonthlyReportData | AnnualReportData; filenameBase: string }) {
  return (
    <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", marginBottom: 16 }}>
      <button className="btn btn-outline" onClick={() => void exportReportExcel(report, `${filenameBase}.xlsx`)}>
        <Icon name="export" size={16} /> تصدير Excel
      </button>
      <button className="btn btn-outline" onClick={() => void exportReportWord(report, `${filenameBase}.docx`)}>
        <Icon name="fileUp" size={16} /> تصدير Word
      </button>
      <PrintButton label="تصدير PDF" />
    </div>
  );
}
