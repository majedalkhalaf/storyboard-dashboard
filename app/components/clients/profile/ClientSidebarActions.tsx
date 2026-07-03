"use client";

import { useState } from "react";
import Link from "next/link";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import Modal from "@/app/components/settings/Modal";
import FilesPanel from "@/app/components/projects/FilesPanel";
import ClientInviteModal from "@/app/components/projects/ClientInviteModal";
import type { ClientRecord, Project } from "@/app/lib/types";
import ProjectPickerModal from "./ProjectPickerModal";

function whatsappLink(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "").replace(/^0/, "966").replace(/^\+/, "");
  return `https://wa.me/${digits}`;
}

// "إرسال رسالة" في الطلب الأصلي يفترض نظام مراسلة داخلي غير موجود في هذا النظام —
// بديل صادق: فتح بريد/واتساب العميل مباشرة من بيانات التواصل المعروضة فعلاً في Hero.
export default function ClientSidebarActions({ client, projects }: { client: ClientRecord; projects: Project[] }) {
  const [step, setStep] = useState<"none" | "pick-invite" | "invite" | "pick-upload" | "upload">("none");
  const [targetProjectId, setTargetProjectId] = useState<string | null>(null);
  const wa = whatsappLink(client.phone);

  const linkActions: { label: string; icon: IconName; href: string }[] = [
    { label: "مشروع جديد", icon: "projects", href: "/projects?new=1" },
    { label: "فاتورة جديدة", icon: "invoices", href: "/invoices" },
    { label: "دفعة جديدة", icon: "payments", href: "/payments" },
    { label: "عرض جديد", icon: "proposals", href: "/proposals" },
    { label: "عقد جديد", icon: "contracts", href: "/contracts" },
  ];

  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>إجراءات سريعة</h3>

      {linkActions.map((a) => (
        <Link key={a.label} href={a.href} className="btn btn-outline" style={{ justifyContent: "flex-start", fontSize: 13 }}>
          <Icon name={a.icon} size={14} /> {a.label}
        </Link>
      ))}

      <button className="btn btn-outline" style={{ justifyContent: "flex-start", fontSize: 13 }} onClick={() => setStep("pick-upload")}>
        <Icon name="upload" size={14} /> رفع ملف
      </button>
      <button className="btn btn-outline" style={{ justifyContent: "flex-start", fontSize: 13 }} onClick={() => setStep("pick-invite")}>
        <Icon name="userPlus" size={14} /> دعوة عميل لمشروع
      </button>

      <div style={{ display: "flex", gap: 6 }}>
        {client.email && (
          <a href={`mailto:${client.email}`} className="btn btn-outline" style={{ flex: 1, justifyContent: "center", fontSize: 12 }}>
            <Icon name="mail" size={13} /> بريد
          </a>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ flex: 1, justifyContent: "center", fontSize: 12, color: "#22C55E" }}>
            <Icon name="message" size={13} /> واتساب
          </a>
        )}
      </div>

      {step === "pick-upload" && (
        <ProjectPickerModal
          title="اختر مشروعاً لرفع ملف إليه"
          projects={projects}
          onClose={() => setStep("none")}
          onPick={(id) => {
            setTargetProjectId(id);
            setStep("upload");
          }}
        />
      )}
      {step === "upload" && targetProjectId && (
        <Modal title="رفع ملف" onClose={() => setStep("none")} maxWidth={520}>
          <FilesPanel projectId={targetProjectId} episodeId={null} filter="all" onChanged={() => setStep("none")} />
        </Modal>
      )}

      {step === "pick-invite" && (
        <ProjectPickerModal
          title="اختر مشروعاً لدعوة العميل إليه"
          projects={projects}
          onClose={() => setStep("none")}
          onPick={(id) => {
            setTargetProjectId(id);
            setStep("invite");
          }}
        />
      )}
      {step === "invite" && targetProjectId && (
        <ClientInviteModal projectId={targetProjectId} onClose={() => setStep("none")} onInvited={() => setStep("none")} />
      )}
    </div>
  );
}
