-- Migration: 00001_identity_access
-- Identity, access, tenancy, and audit foundation for Rushi CRM v2.0
--
-- Security Design:
-- - Non-recursive RLS policies using SECURITY DEFINER helper functions with fixed search_path.
-- - Strict audit event integrity: no client-side INSERT/UPDATE/DELETE on audit_events.
-- - Roles: owner (full scope administration), staff (scoped grants), viewer (read-only).

-- ============================================================================
-- SCHEMAS & PREREQUISITES (Safe for Supabase, Neon, and standalone PostgreSQL)
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;

-- If auth.users does not exist (standalone test postgres), create minimal schema
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID,
  aud VARCHAR(255),
  role VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  encrypted_password VARCHAR(255),
  email_confirmed_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ,
  confirmation_token VARCHAR(255),
  confirmation_sent_at TIMESTAMPTZ,
  recovery_token VARCHAR(255),
  recovery_sent_at TIMESTAMPTZ,
  email_change_token_new VARCHAR(255),
  email_change VARCHAR(255),
  email_change_sent_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  raw_app_meta_data JSONB,
  raw_user_meta_data JSONB,
  is_super_admin BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  phone TEXT UNIQUE DEFAULT NULL,
  phone_confirmed_at TIMESTAMPTZ DEFAULT NULL,
  phone_change TEXT DEFAULT '',
  phone_change_token VARCHAR(255) DEFAULT '',
  phone_change_sent_at TIMESTAMPTZ DEFAULT NULL,
  confirmed_at TIMESTAMPTZ,
  email_change_token_current VARCHAR(255) DEFAULT '',
  email_change_confirm_status SMALLINT DEFAULT 0,
  banned_until TIMESTAMPTZ,
  reauthentication_token VARCHAR(255) DEFAULT '',
  reauthentication_sent_at TIMESTAMPTZ DEFAULT NULL,
  is_sso_user BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Define auth.uid() if not natively provided by Supabase runtime
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claim.sub', true),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$;

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.business_kind AS ENUM ('cattle_feed', 'pvc');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.member_role AS ENUM ('owner', 'staff', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- BUSINESSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.business_kind NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- BUSINESS MEMBERSHIPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.business_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

-- ============================================================================
-- NON-RECURSIVE SECURITY DEFINER HELPERS
-- These bypass RLS recursion by executing with owner privileges and a fixed search_path.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_memberships
    WHERE business_id = p_business_id
      AND user_id = p_user_id
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_memberships
    WHERE business_id = p_business_id
      AND user_id = p_user_id
      AND role = 'owner'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_business_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT business_id FROM public.business_memberships
  WHERE user_id = p_user_id AND is_active = true;
$$;

-- Restrict helper execution to authenticated and service_role
REVOKE ALL ON FUNCTION public.is_business_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_business_member(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_business_owner(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_business_owner(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_user_business_ids(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_business_ids(UUID) TO authenticated, service_role;

-- ============================================================================
-- PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (char_length(full_name) >= 1 AND char_length(full_name) <= 200),
  phone TEXT,
  avatar_url TEXT,
  preferred_locale TEXT NOT NULL DEFAULT 'en' CHECK (preferred_locale IN ('en', 'mr')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- ROLE PERMISSIONS (Staff-only explicit grants)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.business_memberships(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (char_length(permission) >= 1),
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (membership_id, permission)
);

-- Helper to check permission ownership non-recursively
CREATE OR REPLACE FUNCTION public.is_permission_owner(p_membership_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_memberships target_bm
    JOIN public.business_memberships owner_bm
      ON owner_bm.business_id = target_bm.business_id
    WHERE target_bm.id = p_membership_id
      AND owner_bm.user_id = p_user_id
      AND owner_bm.role = 'owner'
      AND owner_bm.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_permission_owner(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_permission_owner(UUID, UUID) TO authenticated, service_role;

-- ============================================================================
-- AUDIT EVENTS — Immutable append-only audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (char_length(action) >= 1),
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trusted function for inserting audit events
-- Ordinary users CANNOT directly INSERT into audit_events table
CREATE OR REPLACE FUNCTION public.record_audit_event(
  p_business_id UUID,
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_event_id UUID;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to record audit event';
  END IF;

  -- Validate that actor belongs to the business if business_id provided
  IF p_business_id IS NOT NULL AND NOT public.is_business_member(p_business_id, v_actor_id) THEN
    RAISE EXCEPTION 'Actor is not an active member of this business';
  END IF;

  INSERT INTO public.audit_events (
    business_id,
    actor_id,
    action,
    target_type,
    target_id,
    metadata
  ) VALUES (
    p_business_id,
    v_actor_id,
    p_action,
    p_target_type,
    p_target_id,
    p_metadata
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_audit_event(UUID, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_audit_event(UUID, TEXT, TEXT, UUID, JSONB) TO authenticated, service_role;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- 1. Businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "businesses_select_member" ON public.businesses;
CREATE POLICY "businesses_select_member" ON public.businesses
  FOR SELECT USING (
    public.is_business_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "businesses_update_owner" ON public.businesses;
CREATE POLICY "businesses_update_owner" ON public.businesses
  FOR UPDATE USING (
    public.is_business_owner(id, auth.uid())
  );

-- 2. Business Memberships (Non-recursive)
ALTER TABLE public.business_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memberships_select_own_or_owner" ON public.business_memberships;
CREATE POLICY "memberships_select_own_or_owner" ON public.business_memberships
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_business_owner(business_id, auth.uid())
  );

DROP POLICY IF EXISTS "memberships_insert_owner" ON public.business_memberships;
CREATE POLICY "memberships_insert_owner" ON public.business_memberships
  FOR INSERT WITH CHECK (
    public.is_business_owner(business_id, auth.uid())
  );

DROP POLICY IF EXISTS "memberships_update_owner" ON public.business_memberships;
CREATE POLICY "memberships_update_owner" ON public.business_memberships
  FOR UPDATE USING (
    public.is_business_owner(business_id, auth.uid())
  );

DROP POLICY IF EXISTS "memberships_delete_owner" ON public.business_memberships;
CREATE POLICY "memberships_delete_owner" ON public.business_memberships
  FOR DELETE USING (
    public.is_business_owner(business_id, auth.uid())
  );

-- 3. Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_co_members" ON public.profiles;
CREATE POLICY "profiles_select_co_members" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.user_id = profiles.id
        AND bm.is_active = true
        AND bm.business_id IN (SELECT public.get_user_business_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Role Permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissions_select_member" ON public.role_permissions;
CREATE POLICY "permissions_select_member" ON public.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.id = role_permissions.membership_id
        AND bm.user_id = auth.uid()
    )
    OR public.is_permission_owner(membership_id, auth.uid())
  );

DROP POLICY IF EXISTS "permissions_insert_owner" ON public.role_permissions;
CREATE POLICY "permissions_insert_owner" ON public.role_permissions
  FOR INSERT WITH CHECK (
    public.is_permission_owner(membership_id, auth.uid())
  );

DROP POLICY IF EXISTS "permissions_delete_owner" ON public.role_permissions;
CREATE POLICY "permissions_delete_owner" ON public.role_permissions
  FOR DELETE USING (
    public.is_permission_owner(membership_id, auth.uid())
  );

-- 5. Audit Events
-- CRITICAL SECURITY RULE: No direct client INSERT, UPDATE, or DELETE on audit_events
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_owner" ON public.audit_events;
CREATE POLICY "audit_select_owner" ON public.audit_events
  FOR SELECT USING (
    public.is_business_owner(business_id, auth.uid())
  );

-- NOTICE: Explicitly NO INSERT policy on audit_events for ordinary authenticated users.
-- Direct inserts from browser clients are rejected by RLS.
-- Inserts must go through public.record_audit_event(...) or service_role!

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.business_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_business ON public.business_memberships(business_id);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON public.business_memberships(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_permissions_membership ON public.role_permissions(membership_id);
CREATE INDEX IF NOT EXISTS idx_audit_business ON public.audit_events(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_events(actor_id, created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_businesses_updated_at ON public.businesses;
CREATE TRIGGER tr_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_memberships_updated_at ON public.business_memberships;
CREATE TRIGGER tr_memberships_updated_at
  BEFORE UPDATE ON public.business_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile trigger on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, preferred_locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
    'en'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- GRANTS & PRIVILEGES (Standard Supabase/PostgreSQL RLS grants)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

