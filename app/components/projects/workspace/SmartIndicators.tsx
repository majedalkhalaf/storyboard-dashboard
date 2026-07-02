import Icon, { type IconName } from "@/app/components/ui/Icon";
import type { WorkspaceProject } from "@/app/lib/workspace-projects";

// شارات ذكية مبنية بالكامل من بيانات حقيقية (اعتماد الحلقات، حالة العقد،
// حالة الفواتير والدفعات) — لا توجد أي حالة وهمية.
export default function SmartIndicators({ project }: { project: WorkspaceProject }) {
  const badges: { icon: IconName; label: string; color: string }[] = [];

  if (project.episodesPendingClient > 0) {
    badges.push({ icon: "clock", label: "بانتظار العميل", color: "var(--warning)" });
  } else if (project.episodeCount > 0 && project.episodesApproved === project.episodeCount) {
    badges.push({ icon: "badgeCheck", label: "تم اعتماد العميل", color: "var(--success)" });
  }

  if (project.isOverdue) {
    badges.push({ icon: "warning", label: "متأخر", color: "var(--danger)" });
  }

  if (project.status === "delivered") {
    badges.push({ icon: "checkCircle", label: "تم التسليم", color: "var(--success)" });
  }

  if (project.contractStatus === "signed") {
    badges.push({ icon: "contracts", label: "العقد موقّع", color: "var(--success)" });
  }

  if (project.invoiceStatus === "paid") {
    badges.push({ icon: "fileCheck", label: "الفاتورة مدفوعة", color: "var(--success)" });
  } else if (project.hasPendingPayment) {
    badges.push({ icon: "payments", label: "دفعة مستحقة", color: "var(--warning)" });
  }

  if (badges.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {badges.map((b) => (
        <span
          key={b.label}
          className="chip"
          style={{ color: b.color, borderColor: b.color, background: `${b.color}14`, fontSize: 10.5 }}
        >
          <Icon name={b.icon} size={11} /> {b.label}
        </span>
      ))}
    </div>
  );
}
