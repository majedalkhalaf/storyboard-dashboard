"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import { useSession } from "@/app/providers/SessionProvider";
import { createClient } from "@/app/lib/supabase/client";

interface ResultItem {
  id: string;
  label: string;
  subtitle: string;
  href: string;
  icon: IconName;
}

export default function GlobalSearch() {
  const { company } = useSession();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !company?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stale results when the query no longer qualifies for search
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    const timer = setTimeout(async () => {
      const [{ data: projects }, { data: clients }, { data: episodes }] = await Promise.all([
        supabase.from("projects").select("id, name").eq("company_id", company.id).ilike("name", `%${q}%`).limit(5),
        supabase.from("clients").select("id, name").eq("company_id", company.id).ilike("name", `%${q}%`).limit(5),
        supabase
          .from("episodes")
          .select("id, title, project_id, project:projects(name)")
          .eq("company_id", company.id)
          .ilike("title", `%${q}%`)
          .limit(5),
      ]);

      if (cancelled) return;

      const items: ResultItem[] = [
        ...(projects ?? []).map((p) => ({ id: p.id, label: p.name, subtitle: "مشروع", href: `/projects/${p.id}`, icon: "projects" as const })),
        ...(clients ?? []).map((c) => ({ id: c.id, label: c.name, subtitle: "عميل", href: `/clients/${c.id}`, icon: "clients" as const })),
        ...(episodes ?? []).map((e) => {
          const project = Array.isArray(e.project) ? e.project[0] : e.project;
          return {
            id: e.id,
            label: e.title,
            subtitle: project?.name ? `حلقة · ${project.name}` : "حلقة",
            href: `/projects/${e.project_id}/episodes/${e.id}`,
            icon: "episodes" as const,
          };
        }),
      ];
      setResults(items);
      setLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, company?.id]);

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div style={{ position: "relative", flex: 1, maxWidth: 480 }}>
      <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
        <Icon name="search" size={16} />
      </span>
      <input
        ref={inputRef}
        className="input-field"
        style={{ paddingInlineStart: 40, paddingInlineEnd: 56, background: "var(--bg-primary)" }}
        placeholder="ابحث في المشاريع، الحلقات، العملاء..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <span
        style={{
          position: "absolute",
          insetInlineEnd: 10,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 11,
          color: "var(--text-muted)",
          border: "1px solid var(--border)",
          borderRadius: 5,
          padding: "2px 6px",
          pointerEvents: "none",
        }}
      >
        ⌘K
      </span>

      {open && query.trim().length >= 2 && (
        <div
          className="card animate-fade-in"
          style={{ position: "absolute", top: "calc(100% + 8px)", insetInlineStart: 0, right: 0, zIndex: 100, padding: 6, maxHeight: 360, overflowY: "auto" }}
        >
          {loading ? (
            <div style={{ padding: 14, fontSize: 13, color: "var(--text-muted)" }}>جارٍ البحث...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: 14, fontSize: 13, color: "var(--text-muted)" }}>لا توجد نتائج</div>
          ) : (
            results.map((r) => (
              <button
                key={`${r.icon}-${r.id}`}
                onClick={() => goTo(r.href)}
                className="sidebar-link"
                style={{ width: "100%", textAlign: "right" }}
              >
                <Icon name={r.icon} size={15} />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{r.subtitle}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
