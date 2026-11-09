import { describe, it, expect } from 'vitest';
import {
  isOwner,
  hasMinRole,
  hasPermission,
  isOwnerOnlyFeature,
  PERMISSIONS,
} from '@/lib/permissions';

describe('Permissions & Authorization Model', () => {
  it('correctly identifies owner role', () => {
    expect(isOwner('owner')).toBe(true);
    expect(isOwner('staff')).toBe(false);
    expect(isOwner('viewer')).toBe(false);
    expect(isOwner(undefined)).toBe(false);
  });

  it('evaluates role hierarchy correctly', () => {
    expect(hasMinRole('owner', 'staff')).toBe(true);
    expect(hasMinRole('owner', 'viewer')).toBe(true);
    expect(hasMinRole('staff', 'viewer')).toBe(true);
    expect(hasMinRole('staff', 'owner')).toBe(false);
    expect(hasMinRole('viewer', 'staff')).toBe(false);
  });

  it('grants all permissions implicitly to owners', () => {
    expect(hasPermission('owner', [], PERMISSIONS.BILL_CREATE)).toBe(true);
    expect(hasPermission('owner', [], PERMISSIONS.CUSTOMER_CREATE)).toBe(true);
    expect(hasPermission('owner', [], PERMISSIONS.PAYMENT_RECORD)).toBe(true);
  });

  it('requires explicit granted permissions for staff', () => {
    const granted = [PERMISSIONS.CUSTOMER_CREATE, PERMISSIONS.BILL_CREATE];
    expect(hasPermission('staff', granted, PERMISSIONS.CUSTOMER_CREATE)).toBe(true);
    expect(hasPermission('staff', granted, PERMISSIONS.BILL_CREATE)).toBe(true);
    expect(hasPermission('staff', granted, PERMISSIONS.PAYMENT_RECORD)).toBe(false);
  });

  it('denies permissions to viewers without matching grants', () => {
    expect(hasPermission('viewer', [], PERMISSIONS.CUSTOMER_CREATE)).toBe(false);
  });

  it('protects private owner-only financial features', () => {
    expect(isOwnerOnlyFeature('suppliers')).toBe(true);
    expect(isOwnerOnlyFeature('purchase-orders')).toBe(true);
    expect(isOwnerOnlyFeature('supplier-accounts')).toBe(true);
    expect(isOwnerOnlyFeature('purchase-history')).toBe(true);
    expect(isOwnerOnlyFeature('expenses')).toBe(true);
    expect(isOwnerOnlyFeature('profit')).toBe(true);
    expect(isOwnerOnlyFeature('customers')).toBe(false);
    expect(isOwnerOnlyFeature('bills')).toBe(false);
  });
});
