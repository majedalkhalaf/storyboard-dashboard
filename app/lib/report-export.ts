"use client";

import type { MonthlyReportData, AnnualReportData } from "@/app/lib/finance-reports";
import { fmtMoney, fmtDate } from "@/app/components/finance/format";

// تصدير التقارير المالية (شهري/سنوي) إلى Excel وWord — يعمل بالكامل داخل المتصفح
// (لا خادم توليد ملفات)، بنفس أسلوب app/lib/zip-export.ts.

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

interface ReportSection {
  title: string;
  rows: (string | number)[][]; // الصف الأول عناوين الأعمدة
}

interface ReportExportShape {
  title: string;
  subtitle: string;
  sections: ReportSection[];
}

function buildReportShape(report: MonthlyReportData | AnnualReportData): ReportExportShape {
  if (report.type === "monthly") {
    const sections: ReportSection[] = [
      {
        title: "الملخص المالي",
        rows: [
          ["البند", "القيمة"],
          ["الإيرادات", fmtMoney(report.summary.revenue)],
          ["المصروفات", fmtMoney(report.summary.expenses)],
          ["صافي الربح", fmtMoney(report.summary.profit)],
          ["إجمالي الفواتير", fmtMoney(report.summary.invoicedTotal)],
          ["نسبة التحصيل", `${Math.round(report.summary.collectionRate)}%`],
        ],
      },
      {
        title: "التدفق النقدي الأسبوعي",
        rows: [["الفترة", "الإيرادات", "المصروفات"], ...report.cashFlow.map((c) => [c.label, fmtMoney(c.revenue), fmtMoney(c.expenses)])],
      },
      {
        title: "الفواتير",
        rows: [
          ["الرقم", "المشروع", "العميل", "المبلغ", "الحالة", "تاريخ الإصدار"],
          ...report.invoices.map((i) => [i.number, i.projectName, i.clientName ?? "—", fmtMoney(i.amount), i.status, fmtDate(i.issueDate)]),
        ],
      },
      {
        title: "الدفعات",
        rows: [
          ["المشروع", "المبلغ", "الحالة", "تاريخ الاستحقاق", "تاريخ السداد"],
          ...report.payments.map((p) => [p.projectName, fmtMoney(p.amount), p.status, fmtDate(p.dueDate), fmtDate(p.paidDate)]),
        ],
      },
      {
        title: "المستحقات",
        rows: [
          ["النوع", "المشروع", "العميل", "المبلغ", "تاريخ الاستحقاق"],
          ...report.dues.map((d) => [d.kind === "invoice" ? "فاتورة" : "دفعة", d.projectName, d.clientName ?? "—", fmtMoney(d.amount), fmtDate(d.dueDate)]),
        ],
      },
      {
        title: "أداء المشاريع",
        rows: [
          ["المشروع", "الإيرادات", "المصروفات", "الربح"],
          ...report.projectPerformance.map((p) => [p.projectName, fmtMoney(p.revenue), fmtMoney(p.expenses), fmtMoney(p.profit)]),
        ],
      },
      {
        title: "التوصيات",
        rows: [["#", "التوصية"], ...report.recommendations.map((r, i) => [i + 1, r])],
      },
    ];
    return { title: "التقرير المالي الشهري", subtitle: `${report.monthLabel} ${report.year}`, sections };
  }

  const sections: ReportSection[] = [
    {
      title: "الإجماليات السنوية",
      rows: [
        ["البند", "القيمة"],
        ["الإيرادات", fmtMoney(report.totals.revenue)],
        ["المصروفات", fmtMoney(report.totals.expenses)],
        ["صافي الربح", fmtMoney(report.totals.profit)],
        ["عدد العقود", report.totals.contracts],
        ["عدد الفواتير", report.totals.invoices],
      ],
    },
    {
      title: "الأداء الشهري",
      rows: [["الشهر", "الإيرادات", "المصروفات", "الربح"], ...report.monthly.map((m) => [m.label, fmtMoney(m.revenue), fmtMoney(m.expenses), fmtMoney(m.profit)])],
    },
    {
      title: "مقارنة شهر بشهر",
      rows: [
        ["الشهر", "الإيرادات", "التغيّر عن الشهر السابق"],
        ...report.momComparison.map((m) => [m.label, fmtMoney(m.revenue), m.revenueChangePct == null ? "—" : `${Math.round(m.revenueChangePct)}%`]),
      ],
    },
    {
      title: "الأداء حسب المشروع",
      rows: [["المشروع", "الإيرادات", "المصروفات", "الربح"], ...report.byProject.map((p) => [p.projectName, fmtMoney(p.revenue), fmtMoney(p.expenses), fmtMoney(p.profit)])],
    },
    {
      title: "الأداء حسب العميل",
      rows: [["العميل", "الربح"], ...report.byClient.map((c) => [c.clientName, fmtMoney(c.profit)])],
    },
    {
      title: "المقارنة السنوية",
      rows: report.yoy.hasPreviousYear
        ? [
            ["البند", "التغيّر"],
            ["الإيرادات", `${Math.round(report.yoy.revenueChangePct ?? 0)}%`],
            ["المصروفات", `${Math.round(report.yoy.expensesChangePct ?? 0)}%`],
            ["الربح", `${Math.round(report.yoy.profitChangePct ?? 0)}%`],
          ]
        : [["ملاحظة"], ["لا تتوفر بيانات للسنة السابقة للمقارنة"]],
    },
    {
      title: "الملخص التنفيذي",
      rows: [["الملخص"], [report.executiveSummary]],
    },
  ];
  return { title: "التقرير المالي السنوي", subtitle: String(report.year), sections };
}

export async function exportReportExcel(report: MonthlyReportData | AnnualReportData, filename: string) {
  const ExcelJS = (await import("exceljs")).default;
  const shape = buildReportShape(report);
  const wb = new ExcelJS.Workbook();
  wb.creator = "TAJ PROJECT";
  wb.created = new Date();

  for (const section of shape.sections) {
    const ws = wb.addWorksheet(section.title.slice(0, 31));
    const [header, ...rows] = section.rows;
    if (header) {
      const headerRow = ws.addRow(header);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F2EC" } };
      });
    }
    rows.forEach((r) => ws.addRow(r));
    ws.columns.forEach((col) => {
      col.width = 24;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  triggerBlobDownload(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

export async function exportReportWord(report: MonthlyReportData | AnnualReportData, filename: string) {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } = await import("docx");
  const shape = buildReportShape(report);

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({ text: shape.title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: shape.subtitle, spacing: { after: 300 } }),
  ];

  for (const section of shape.sections) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 120 } }));
    const tableRows = section.rows.map(
      (row, rowIndex) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                width: { size: 100 / Math.max(row.length, 1), type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: String(cell), bold: rowIndex === 0 })] })],
              })
          ),
        })
    );
    children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, filename);
}
