"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { downloadCsv } from "@/app/lib/csv";
import { CLIENT_TYPE_LABELS } from "@/app/lib/constants";
import type { ClientDirectoryRow, ClientsDirectoryStats } from "@/app/lib/clients-directory";
import type { ClientRecord } from "@/app/lib/types";
import ClientsStatsRow from "./ClientsStatsRow";
import ClientsToolbar, { type ClientsFilters, type ClientsSort } from "./ClientsToolbar";
import ClientsTable from "./ClientsTable";
import ClientFormModal from "./ClientFormModal";
import ImportClientsModal from "./ImportClientsModal";

export default function ClientsWorkspace({
  initialRows,
  stats,
  companyId,
  userId,
  teamMembers,
}: {
  initialRows: ClientDirectoryRow[];
  stats: ClientsDirectoryStats;
  companyId: string;
  userId: string;
  teamMembers: { id: string; full_name: string | null }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ClientsFilters>({ city: "", status: "", clientType: "", assignedTo: "" });
  const [sort, setSort] = useState<ClientsSort>("recent");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<ClientRecord | null>(null);

  const cities = useMemo(() => Array.from(new Set(rows.map((r) => r.city).filter((c): c is string => Boolean(c)))).sort(), [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.contact_name ?? "").toLowerCase().includes(q) && !(r.email ?? "").toLowerCase().includes(q) && !(r.phone ?? "").includes(q)) return false;
      if (filters.city && r.city !== filters.city) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.clientType && r.client_type !== filters.clientType) return false;
      if (filters.assignedTo && r.assigned_to !== filters.assignedTo) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "most_projects") return b.projectsCount - a.projectsCount;
      if (sort === "highest_revenue") return b.invoicesTotal - a.invoicesTotal;
      if (sort === "name") return a.name.localeCompare(b.name, "ar");
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
    return list;
  }, [rows, search, filters, sort]);

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(row: ClientDirectoryRow) {
    setEditing({
      id: row.id,
      company_id: companyId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      notes: null,
      client_type: row.client_type,
      city: row.city,
      logo_url: row.logo_url,
      contact_name: row.contact_name,
      assigned_to: row.assigned_to,
      status: row.status,
      created_by: null,
      created_at: "",
      updated_at: "",
      job_title: null,
      client_company_name: null,
    });
    setShowForm(true);
  }

  function handleSaved(client: ClientRecord) {
    const assignee = teamMembers.find((m) => m.id === client.assigned_to);
    setRows((prev) => {
      const exists = prev.some((r) => r.id === client.id);
      const patch: Partial<ClientDirectoryRow> = {
        name: client.name,
        client_type: client.client_type,
        city: client.city,
        logo_url: client.logo_url,
        contact_name: client.contact_name,
        email: client.email,
        phone: client.phone,
        status: client.status,
        assigned_to: client.assigned_to,
        assigned_to_name: assignee?.full_name ?? null,
      };
      if (exists) return prev.map((r) => (r.id === client.id ? { ...r, ...patch } : r));
      return [
        {
          id: client.id,
          name: client.name,
          client_type: client.client_type,
          city: client.city,
          logo_url: client.logo_url,
          contact_name: client.contact_name,
          email: client.email,
          phone: client.phone,
          status: client.status,
          assigned_to: client.assigned_to,
          assigned_to_name: assignee?.full_name ?? null,
          assigned_to_avatar: null,
          projectsCount: 0,
          activeProjects: 0,
          completedProjects: 0,
          lateProjects: 0,
          contractsValue: 0,
          invoicesTotal: 0,
          paidTotal: 0,
          remaining: 0,
          completionPct: 0,
          lastActivity: client.created_at || new Date().toISOString(),
          created_at: client.created_at || new Date().toISOString(),
        },
        ...prev,
      ];
    });
  }

  function handleDeleted(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function exportCsv() {
    downloadCsv(
      "العملاء",
      visible.map((r) => ({
        name: r.name,
        client_type: CLIENT_TYPE_LABELS[r.client_type],
        city: r.city ?? "",
        contact_name: r.contact_name ?? "",
        email: r.email ?? "",
        phone: r.phone ?? "",
        projects: r.projectsCount,
        contracts_value: r.contractsValue,
        invoices_total: r.invoicesTotal,
        paid: r.paidTotal,
        remaining: r.remaining,
        status: r.status,
      })),
      [
        { key: "name", label: "اسم العميل" },
        { key: "client_type", label: "النوع" },
        { key: "city", label: "المدينة" },
        { key: "contact_name", label: "جهة التواصل" },
        { key: "email", label: "البريد الإلكتروني" },
        { key: "phone", label: "الجوال" },
        { key: "projects", label: "عدد المشاريع" },
        { key: "contracts_value", label: "قيمة العقود" },
        { key: "invoices_total", label: "إجمالي الفواتير" },
        { key: "paid", label: "المدفوع" },
        { key: "remaining", label: "المتبقي" },
        { key: "status", label: "الحالة" },
      ]
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="animate-fade-in">
      <div>
        <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
          العملاء
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          مركز إدارة جميع عملاء الشركة: مشاريعهم وعقودهم وفواتيرهم ودفعاتهم من مكان واحد
        </p>
      </div>

      <ClientsStatsRow stats={stats} />

      <ClientsToolbar
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
        cities={cities}
        teamMembers={teamMembers}
        sort={sort}
        onSortChange={setSort}
        onNew={openNew}
        onImport={() => setShowImport(true)}
        onExport={exportCsv}
      />

      <ClientsTable rows={visible} onEdit={openEdit} onDeleted={handleDeleted} />

      {showForm && (
        <ClientFormModal
          companyId={companyId}
          userId={userId}
          teamMembers={teamMembers}
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      {showImport && (
        <ImportClientsModal companyId={companyId} userId={userId} onClose={() => setShowImport(false)} onImported={() => router.refresh()} />
      )}
    </div>
  );
}
