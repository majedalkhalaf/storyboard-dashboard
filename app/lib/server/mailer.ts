import nodemailer from "nodemailer";
import { createAdminClient } from "@/app/lib/supabase/admin";

// إرسال بريد حقيقي عبر SMTP مخصص للشركة (company_email_senders) — بديل بريد
// Supabase الافتراضي الموحّد لكل الشركات، يسمح بعنوان "من" مخصص لكل شركة.
// يُستخدم فقط من Route Handlers (خادم فقط)، لا يُستورد أبداً في مكوّن "use client".

export interface EmailSenderConfig {
  from_name: string;
  from_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_username: string;
  smtp_password: string;
}

export async function getDefaultEmailSender(companyId: string): Promise<EmailSenderConfig | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("company_email_senders").select("*").eq("company_id", companyId).eq("is_default", true).maybeSingle();
  return (data as EmailSenderConfig | null) ?? null;
}

export async function getEmailSenderById(companyId: string, senderId: string): Promise<EmailSenderConfig | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("company_email_senders").select("*").eq("company_id", companyId).eq("id", senderId).maybeSingle();
  return (data as EmailSenderConfig | null) ?? null;
}

export async function sendMailViaSender(sender: EmailSenderConfig, params: { to: string; subject: string; html: string; text?: string }) {
  const transport = nodemailer.createTransport({
    host: sender.smtp_host,
    port: sender.smtp_port,
    secure: sender.smtp_secure,
    auth: { user: sender.smtp_username, pass: sender.smtp_password },
  });

  await transport.sendMail({
    from: `"${sender.from_name}" <${sender.from_email}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}
