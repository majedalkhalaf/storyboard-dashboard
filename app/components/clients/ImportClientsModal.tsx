"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import Modal from "@/app/components/settings/Modal";
import { createClient } from "@/app/lib/supabase/client";
import { parseCsv } from "@/app/lib/csv";

// استيراد حقيقي عبر CSV (الأعمدة المتوقعة: name, email, phone, city, client_type) —
// وليس مجرد زر شكلي. يقبل client_type = company/individual/agency وإلا يستخدم company افتراضياً.
export default function ImportClientsModal({
  companyId,
  userId,
  onClose,
  onImported,
}: {
  companyId: string;
  userId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0 || !("name" in parsed[0])) {
      setError('لم يتم العثور على عمود "name" في الملف. الأعمدة المتوقعة: name, email, phone, city, client_type');
      setRows(null);
      return;
    }
    setRows(parsed);
  }

  async function runImport() {
    if (!rows || rows.length === 0) return;
    setImporting(true);
    try {
      const validTypes = new Set(["company", "individual", "agency"]);
      const payload = rows
        .filter((r) => r.name?.trim())
        .map((r) => ({
          company_id: companyId,
          created_by: userId,
          name: r.name.trim(),
          email: r.email?.trim() || null,
          phone: r.phone?.trim() || null,
          city: r.city?.trim() || null,
          client_type: validTypes.has(r.client_type?.trim()) ? r.client_type.trim() : "company",
        }));
      if (payload.length > 0) await supabase.from("clients").insert(payload);
      onImported();
      onClose();
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal title="استيراد عملاء" onClose={onClose} maxWidth={480}>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
        ارفع ملف CSV بالأعمدة: <code dir="ltr">name, email, phone, city, client_type</code> — العمود <code dir="ltr">name</code> إلزامي فقط.
      </p>

      {error && (
        <div className="btn-danger" style={{ width: "100%", justifyContent: "center", marginBottom: 14, cursor: "default", fontSize: 12 }}>
          {error}
        </div>
      )}

      <label className="btn btn-outline" style={{ cursor: "pointer", width: "100%", justifyContent: "center", padding: "12px" }}>
        <Icon name="fileUp" size={16} /> اختر ملف CSV
        <input type="file" accept=".csv,text/csv" hidden onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
      </label>

      {rows && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 13, color: "var(--gold)", marginBottom: 10 }}>تم العثور على {rows.length} صف جاهز للاستيراد.</p>
          <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={runImport} disabled={importing}>
            {importing ? "جارٍ الاستيراد..." : `استيراد ${rows.length} عميل`}
          </button>
        </div>
      )}
    </Modal>
  );
}
