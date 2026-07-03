"use client";

import { memo } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { SIDEBAR_NAV, isActiveHref, type SidebarLeaf } from "@/app/lib/sidebar-nav";

const NavLink = memo(function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
  indent,
}: {
  item: SidebarLeaf;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  indent?: boolean;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`sidebar-link${active ? " active" : ""}`}
      title={collapsed ? item.label : undefined}
      style={indent ? { paddingRight: 34 } : undefined}
    >
      <Icon name={item.icon} size={20} className="nav-icon" />
      {!collapsed && (
        <span className="sidebar-text" style={{ flex: 1 }}>
          {item.label}
        </span>
      )}
    </Link>
  );
});

const NavGroup = memo(function NavGroup({
  label,
  icon,
  items,
  expanded,
  active,
  collapsed,
  onToggle,
  pathname,
  onNavigate,
}: {
  label: string;
  icon: SidebarLeaf["icon"];
  items: SidebarLeaf[];
  expanded: boolean;
  active: boolean;
  collapsed: boolean;
  onToggle: () => void;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`sidebar-link sidebar-group-header${active ? " active" : ""}`}
        title={collapsed ? label : undefined}
        style={{ width: "100%", cursor: "pointer" }}
      >
        <Icon name={icon} size={20} className="nav-icon" />
        {!collapsed && (
          <>
            <span className="sidebar-text" style={{ flex: 1 }}>
              {label}
            </span>
            <span className="sidebar-text" style={{ display: "inline-flex", transition: "transform 200ms ease", transform: expanded ? "rotate(-90deg)" : "rotate(0deg)" }}>
              <Icon name="chevronLeft" size={14} />
            </span>
          </>
        )}
      </button>

      {!collapsed && (
        <div
          className="sidebar-group-body"
          style={{
            maxHeight: expanded ? items.length * 40 + 8 : 0,
            opacity: expanded ? 1 : 0,
            overflow: "hidden",
            transition: "max-height 220ms ease, opacity 180ms ease",
          }}
        >
          {items.map((it) => (
            <NavLink key={it.href} item={it} active={isActiveHref(pathname, it.href)} collapsed={false} onNavigate={onNavigate} indent />
          ))}
        </div>
      )}
    </div>
  );
});

export default function SidebarNavList({
  pathname,
  collapsed,
  isAdmin,
  expandedGroups,
  onToggleGroup,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  isAdmin: boolean;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, overflowY: "auto", overflowX: "hidden" }}>
      {SIDEBAR_NAV.map((entry) => {
        if (entry.type === "link") {
          if (entry.adminOnly && !isAdmin) return null;
          return <NavLink key={entry.href} item={entry} active={isActiveHref(pathname, entry.href)} collapsed={collapsed} onNavigate={onNavigate} />;
        }

        const items = entry.items.filter((it) => !it.adminOnly || isAdmin);
        if (items.length === 0) return null;
        const groupActive = items.some((it) => isActiveHref(pathname, it.href));
        const expanded = collapsed ? false : (expandedGroups[entry.key] ?? groupActive);

        return (
          <NavGroup
            key={entry.key}
            label={entry.label}
            icon={entry.icon}
            items={items}
            expanded={expanded}
            active={groupActive}
            collapsed={collapsed}
            onToggle={() => onToggleGroup(entry.key)}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}
