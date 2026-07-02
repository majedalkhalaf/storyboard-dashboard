import type { ClientPermissions } from "./types";

export function canClient(permissions: ClientPermissions | null | undefined, key: keyof ClientPermissions): boolean {
  if (!permissions) return false;
  return Boolean(permissions[key]);
}

export const INTERNAL_ADMIN_ROLES = ["super_admin", "company_owner", "admin"] as const;

export function isInternalAdmin(role: string | null | undefined): boolean {
  return Boolean(role && (INTERNAL_ADMIN_ROLES as readonly string[]).includes(role));
}

export function isInternalRole(role: string | null | undefined): boolean {
  return Boolean(role && role !== "client");
}
