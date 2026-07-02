"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { SERVICES_CATALOG } from "@/app/lib/constants";

export interface PickedService {
  category: string;
  service_key: string;
  label: string;
  is_custom: boolean;
}

function keyOf(category: string, serviceKey: string) {
  return `${category}::${serviceKey}`;
}

export default function ServicesPicker({
  value,
  onChange,
}: {
  value: PickedService[];
  onChange: (next: PickedService[]) => void;
}) {
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  const selectedKeys = new Set(value.map((s) => keyOf(s.category, s.service_key)));

  function toggle(category: string, service: { key: string; label: string }) {
    const k = keyOf(category, service.key);
    if (selectedKeys.has(k)) {
      onChange(value.filter((s) => keyOf(s.category, s.service_key) !== k));
    } else {
      onChange([...value, { category, service_key: service.key, label: service.label, is_custom: false }]);
    }
  }

  function addCustom(category: string) {
    const label = (customInputs[category] ?? "").trim();
    if (!label) return;
    const service_key = `custom_${crypto.randomUUID()}`;
    onChange([...value, { category, service_key, label, is_custom: true }]);
    setCustomInputs((p) => ({ ...p, [category]: "" }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {SERVICES_CATALOG.map((group) => {
        const customInGroup = value.filter((s) => s.category === group.category && s.is_custom);
        return (
          <div key={group.category}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>{group.label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
              {group.services.map((svc) => {
                const active = selectedKeys.has(keyOf(group.category, svc.key));
                return (
                  <button
                    type="button"
                    key={svc.key}
                    onClick={() => toggle(group.category, svc)}
                    className="card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 12px",
                      cursor: "pointer",
                      textAlign: "right",
                      borderColor: active ? "var(--gold)" : "var(--border)",
                      background: active ? "rgba(201,168,76,0.1)" : "var(--bg-card)",
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: `1px solid ${active ? "var(--gold)" : "var(--border-light)"}`,
                        background: active ? "var(--gold)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {active && <Icon name="check" size={12} className="text-black" />}
                    </span>
                    <span style={{ fontSize: 13, color: active ? "var(--gold)" : "var(--text-primary)" }}>{svc.label}</span>
                  </button>
                );
              })}
            </div>

            {customInGroup.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {customInGroup.map((c) => (
                  <span key={c.service_key} className="chip chip-gold" style={{ gap: 6 }}>
                    {c.label}
                    <button
                      type="button"
                      onClick={() => onChange(value.filter((s) => s.service_key !== c.service_key))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex" }}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input
                className="input-field"
                placeholder="إضافة خدمة مخصّصة..."
                value={customInputs[group.category] ?? ""}
                onChange={(e) => setCustomInputs((p) => ({ ...p, [group.category]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom(group.category);
                  }
                }}
                style={{ fontSize: 13 }}
              />
              <button type="button" className="btn btn-outline" onClick={() => addCustom(group.category)} style={{ flexShrink: 0 }}>
                <Icon name="plus" size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
