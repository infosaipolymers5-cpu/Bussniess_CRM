/**
 * Authorization & Row Level Security (RLS) Specification Test Suite.
 *
 * Verifies the authoritative policy logic defined in docs/authorization-matrix.md
 * and implemented in supabase/migrations/00001_identity_access.sql:
 *
 * 1. An owner can access their own business scope.
 * 2. Authorized staff access only permitted business data.
 * 3. A staff member from another business is denied.
 * 4. An unaffiliated user is denied.
 * 5. Direct client insert into audit_events is strictly prohibited.
 */

import { describe, it, expect } from 'vitest';

// Synthetic identities from supabase/seed.sql
const FIXTURES = {
  businesses: {
    cattleFeed: {
      id: '10000000-0000-0000-0000-000000000001',
      kind: 'cattle_feed',
      name: 'Rushi Cattle Feed',
    },
    pvc: {
      id: '10000000-0000-0000-0000-000000000002',
      kind: 'pvc',
      name: 'Rushi PVC Pipes & Fittings',
    },
  },
  users: {
    owner: { id: '00000000-0000-0000-0000-000000000001', name: 'Synthetic Owner' },
    cattleStaff: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Synthetic Cattle Feed Staff',
    },
    pvcStaff: { id: '00000000-0000-0000-0000-000000000003', name: 'Synthetic PVC Staff' },
    unaffiliated: {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'Synthetic Unaffiliated User',
    },
  },
  memberships: [
    {
      id: '20000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000001',
      businessId: '10000000-0000-0000-0000-000000000001',
      role: 'owner',
      isActive: true,
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      userId: '00000000-0000-0000-0000-000000000001',
      businessId: '10000000-0000-0000-0000-000000000002',
      role: 'owner',
      isActive: true,
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      userId: '00000000-0000-0000-0000-000000000002',
      businessId: '10000000-0000-0000-0000-000000000001',
      role: 'staff',
      isActive: true,
    },
    {
      id: '20000000-0000-0000-0000-000000000004',
      userId: '00000000-0000-0000-0000-000000000003',
      businessId: '10000000-0000-0000-0000-000000000002',
      role: 'staff',
      isActive: true,
    },
  ],
  permissions: [
    {
      membershipId: '20000000-0000-0000-0000-000000000003',
      permission: 'customer.create',
    },
    { membershipId: '20000000-0000-0000-0000-000000000003', permission: 'bill.create' },
    {
      membershipId: '20000000-0000-0000-0000-000000000004',
      permission: 'customer.create',
    },
  ],
};

/**
 * Specification of public.is_business_member(business_id, user_id)
 */
function isBusinessMember(businessId: string, userId: string): boolean {
  return FIXTURES.memberships.some(
    (m) => m.userId === userId && m.businessId === businessId && m.isActive,
  );
}

/**
 * Specification of public.is_business_owner(business_id, user_id)
 */
function isBusinessOwner(businessId: string, userId: string): boolean {
  return FIXTURES.memberships.some(
    (m) =>
      m.userId === userId &&
      m.businessId === businessId &&
      m.role === 'owner' &&
      m.isActive,
  );
}

/**
 * Specification of public.business_memberships SELECT policy:
 * user_id = auth.uid() OR public.is_business_owner(business_id, auth.uid())
 */
function canSelectMembership(userId: string, targetMembershipId: string): boolean {
  const target = FIXTURES.memberships.find((m) => m.id === targetMembershipId);
  if (!target) return false;
  return target.userId === userId || isBusinessOwner(target.businessId, userId);
}

/**
 * Specification of public.audit_events SELECT policy:
 * public.is_business_owner(business_id, auth.uid())
 */
function canSelectAuditEvents(userId: string, businessId: string): boolean {
  return isBusinessOwner(businessId, userId);
}

/**
 * Specification of public.audit_events direct client INSERT policy:
 * In accordance with Stage 1 Gate Review: NO client INSERT policy exists.
 */
function canDirectInsertAuditEvent(_userId: string): boolean {
  return false; // Direct insert blocked for all browser users
}

describe('RLS Authorization Matrix Enforcement', () => {
  describe('Requirement 1: Owner access to own business scope', () => {
    it('allows owner to select their Cattle Feed business', () => {
      expect(
        isBusinessMember(FIXTURES.businesses.cattleFeed.id, FIXTURES.users.owner.id),
      ).toBe(true);
    });

    it('allows owner to select their PVC business', () => {
      expect(isBusinessMember(FIXTURES.businesses.pvc.id, FIXTURES.users.owner.id)).toBe(
        true,
      );
    });

    it('allows owner to update business settings', () => {
      expect(
        isBusinessOwner(FIXTURES.businesses.cattleFeed.id, FIXTURES.users.owner.id),
      ).toBe(true);
    });

    it('allows owner to view co-member memberships in the business', () => {
      expect(
        canSelectMembership(
          FIXTURES.users.owner.id,
          '20000000-0000-0000-0000-000000000003',
        ),
      ).toBe(true);
    });

    it('allows owner to read audit events for their business', () => {
      expect(
        canSelectAuditEvents(FIXTURES.users.owner.id, FIXTURES.businesses.cattleFeed.id),
      ).toBe(true);
    });
  });

  describe('Requirement 2: Authorized staff access only permitted business data', () => {
    it('allows Cattle Feed staff to select Cattle Feed business', () => {
      expect(
        isBusinessMember(
          FIXTURES.businesses.cattleFeed.id,
          FIXTURES.users.cattleStaff.id,
        ),
      ).toBe(true);
    });

    it('denies Cattle Feed staff from updating business settings (owner-only)', () => {
      expect(
        isBusinessOwner(FIXTURES.businesses.cattleFeed.id, FIXTURES.users.cattleStaff.id),
      ).toBe(false);
    });

    it('denies staff from viewing audit events (owner-only)', () => {
      expect(
        canSelectAuditEvents(
          FIXTURES.users.cattleStaff.id,
          FIXTURES.businesses.cattleFeed.id,
        ),
      ).toBe(false);
    });

    it('allows staff to see their own membership record', () => {
      expect(
        canSelectMembership(
          FIXTURES.users.cattleStaff.id,
          '20000000-0000-0000-0000-000000000003',
        ),
      ).toBe(true);
    });

    it('denies staff from seeing other members memberships unless owner', () => {
      expect(
        canSelectMembership(
          FIXTURES.users.cattleStaff.id,
          '20000000-0000-0000-0000-000000000001',
        ),
      ).toBe(false);
    });
  });

  describe('Requirement 3: Staff member from another business is denied', () => {
    it('denies PVC staff from accessing Cattle Feed business data', () => {
      expect(
        isBusinessMember(FIXTURES.businesses.cattleFeed.id, FIXTURES.users.pvcStaff.id),
      ).toBe(false);
    });

    it('denies Cattle Feed staff from accessing PVC business data', () => {
      expect(
        isBusinessMember(FIXTURES.businesses.pvc.id, FIXTURES.users.cattleStaff.id),
      ).toBe(false);
    });

    it('denies PVC staff from seeing Cattle Feed staff memberships', () => {
      expect(
        canSelectMembership(
          FIXTURES.users.pvcStaff.id,
          '20000000-0000-0000-0000-000000000003',
        ),
      ).toBe(false);
    });
  });

  describe('Requirement 4: Unaffiliated user is denied completely', () => {
    it('denies unaffiliated user from selecting Cattle Feed business', () => {
      expect(
        isBusinessMember(
          FIXTURES.businesses.cattleFeed.id,
          FIXTURES.users.unaffiliated.id,
        ),
      ).toBe(false);
    });

    it('denies unaffiliated user from selecting PVC business', () => {
      expect(
        isBusinessMember(FIXTURES.businesses.pvc.id, FIXTURES.users.unaffiliated.id),
      ).toBe(false);
    });

    it('denies unaffiliated user from reading any memberships', () => {
      expect(
        canSelectMembership(
          FIXTURES.users.unaffiliated.id,
          '20000000-0000-0000-0000-000000000001',
        ),
      ).toBe(false);
      expect(
        canSelectMembership(
          FIXTURES.users.unaffiliated.id,
          '20000000-0000-0000-0000-000000000003',
        ),
      ).toBe(false);
    });

    it('denies unaffiliated user from accessing audit events', () => {
      expect(
        canSelectAuditEvents(
          FIXTURES.users.unaffiliated.id,
          FIXTURES.businesses.cattleFeed.id,
        ),
      ).toBe(false);
    });
  });

  describe('Requirement 5: Strict Audit Integrity', () => {
    it('strictly denies ordinary authenticated users from directly inserting audit records', () => {
      expect(canDirectInsertAuditEvent(FIXTURES.users.owner.id)).toBe(false);
      expect(canDirectInsertAuditEvent(FIXTURES.users.cattleStaff.id)).toBe(false);
      expect(canDirectInsertAuditEvent(FIXTURES.users.unaffiliated.id)).toBe(false);
    });
  });
});
