/**
 * BusinessProvider — manages the active business context.
 * Fetches user's business memberships and provides the active business + role.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import type { Business, BusinessMembership, MemberRole } from '@/lib/database.types';

interface BusinessContextValue {
  businesses: Business[];
  memberships: BusinessMembership[];
  activeBusiness: Business | null;
  activeRole: MemberRole | null;
  activeMembership: BusinessMembership | null;
  permissions: string[];
  loading: boolean;
  setActiveBusiness: (businessId: string) => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

const ACTIVE_BUSINESS_KEY = 'rushi-crm-active-business';

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [memberships, setMemberships] = useState<BusinessMembership[]>([]);
  const [activeBusiness, setActiveBusinessState] = useState<Business | null>(null);
  const [activeMembership, setActiveMembership] = useState<BusinessMembership | null>(
    null,
  );
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch memberships and businesses when user changes
  useEffect(() => {
    if (!user) {
      setBusinesses([]);
      setMemberships([]);
      setActiveBusinessState(null);
      setActiveMembership(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetchBusinessData = async () => {
      setLoading(true);
      try {
        // Fetch memberships
        const { data: membershipData } = await supabase
          .from('business_memberships')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);

        const mems = (membershipData ?? []) as BusinessMembership[];
        setMemberships(mems);

        if (mems.length === 0) {
          setBusinesses([]);
          setActiveBusinessState(null);
          setActiveMembership(null);
          setPermissions([]);
          setLoading(false);
          return;
        }

        // Fetch businesses
        const businessIds = mems.map((m) => m.business_id);
        const { data: businessData } = await supabase
          .from('businesses')
          .select('*')
          .in('id', businessIds);

        const bizs = (businessData ?? []) as Business[];
        setBusinesses(bizs);

        // Restore or default active business
        let savedId: string | null = null;
        try {
          savedId = localStorage.getItem(ACTIVE_BUSINESS_KEY);
        } catch {
          // Storage unavailable
        }

        const targetBiz = bizs.find((b) => b.id === savedId) ?? bizs[0] ?? null;
        setActiveBusinessState(targetBiz);

        if (targetBiz) {
          const mem = mems.find((m) => m.business_id === targetBiz.id) ?? null;
          setActiveMembership(mem);

          // Fetch permissions if staff
          if (mem && mem.role === 'staff') {
            const { data: permData } = await supabase
              .from('role_permissions')
              .select('permission')
              .eq('membership_id', mem.id);
            setPermissions(
              (permData ?? []).map((p: { permission: string }) => p.permission),
            );
          } else {
            setPermissions([]);
          }
        }
      } catch {
        // Silently handle — offline or error
      } finally {
        setLoading(false);
      }
    };

    void fetchBusinessData();
  }, [user]);

  const setActiveBusiness = useCallback(
    (businessId: string) => {
      const biz = businesses.find((b) => b.id === businessId);
      if (!biz) return;
      setActiveBusinessState(biz);
      try {
        localStorage.setItem(ACTIVE_BUSINESS_KEY, businessId);
      } catch {
        // Storage unavailable
      }
      const mem = memberships.find((m) => m.business_id === businessId) ?? null;
      setActiveMembership(mem);
    },
    [businesses, memberships],
  );

  const activeRole = activeMembership?.role ?? null;

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        memberships,
        activeBusiness,
        activeRole,
        activeMembership,
        permissions,
        loading,
        setActiveBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return ctx;
}
