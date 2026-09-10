// Shared configuration for Omnis Edge Functions.
// Import from: import { SUPER_ADMIN_EMAILS, isSuperAdmin } from "../_shared/admin-config.ts";
//
// Single source of truth for global admin policy.
// Both admin-operations and email-submit import from here.

/**
 * Super-admin emails — these accounts have unrestricted global access.
 * They cannot be deleted, suspended, or demoted.
 * This list is the ONLY source for global admin determination.
 */
export const SUPER_ADMIN_EMAILS: string[] = [
  "takunda@industrial-exchange.group",
  "zaranyika.rt@gmail.com",
];

/**
 * Check if an email belongs to a super-admin.
 * Super-admins bypass all system/company scope restrictions.
 */
export function isSuperAdmin(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes((email || "").toLowerCase());
}

/**
 * Check if caller has access to a given system based on their access record.
 * Returns true if the caller's systems list includes the target system,
 * OR if the caller is a super-admin.
 */
export function hasSystemAccess(
  callerSystems: string[],
  callerEmail: string,
  targetSystem: string
): boolean {
  if (isSuperAdmin(callerEmail)) return true;
  return callerSystems.includes(targetSystem);
}
