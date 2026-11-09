/**
 * Permission checking utilities.
 * These are client-side helpers for UI visibility only.
 * The server (RLS + functions) is always the authority.
 */

import type { MemberRole } from '../database.types';

/** Known permission strings for staff role_permissions */
export const PERMISSIONS = {
  CUSTOMER_CREATE: 'customer.create',
  CUSTOMER_UPDATE: 'customer.update',
  CUSTOMER_CALL_NOTES: 'customer.call_notes',
  BILL_CREATE: 'bill.create',
  BILL_EDIT: 'bill.edit',
  PAYMENT_RECORD: 'payment.record',
  MESSAGE_PREPARE: 'message.prepare',
  MESSAGE_BROADCAST: 'message.broadcast',
  DELIVERY_MANAGE: 'delivery.manage',
  REPORT_VIEW: 'report.view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Check if a role is owner */
export function isOwner(role: MemberRole | undefined): boolean {
  return role === 'owner';
}

/** Check if a role has a minimum access level */
export function hasMinRole(role: MemberRole | undefined, minRole: MemberRole): boolean {
  const hierarchy: Record<MemberRole, number> = {
    viewer: 0,
    staff: 1,
    owner: 2,
  };
  if (!role) return false;
  return hierarchy[role] >= hierarchy[minRole];
}

/**
 * Check if a user has a specific permission.
 * Owners implicitly have all permissions.
 * Staff need explicit grants in role_permissions.
 */
export function hasPermission(
  role: MemberRole | undefined,
  grantedPermissions: string[],
  requiredPermission: Permission,
): boolean {
  if (!role) return false;
  if (role === 'owner') return true;
  return grantedPermissions.includes(requiredPermission);
}

/**
 * Owner-only data categories — supplier, cost, expense, profit.
 * Staff and viewers must be denied in RLS, UI, and API.
 */
export function isOwnerOnlyFeature(feature: string): boolean {
  const ownerOnly = [
    'suppliers',
    'purchase-orders',
    'supplier-accounts',
    'purchase-history',
    'expenses',
    'profit',
  ];
  return ownerOnly.includes(feature);
}
