-- Synthetic seed data for local development and test environments only.
-- NEVER execute this against a production database.
-- Uses fixed deterministic UUIDs for test assertions.

-- ============================================================================
-- PRODUCTION GUARD
-- ============================================================================
DO $$
BEGIN
  IF current_setting('app.environment', true) = 'production' THEN
    RAISE EXCEPTION 'CRITICAL: Synthetic seed data cannot be executed in production environment!';
  END IF;
END $$;

-- ============================================================================
-- CLEAN PREVIOUS SEED DATA
-- ============================================================================
DELETE FROM public.role_permissions WHERE granted_by IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
DELETE FROM public.business_memberships WHERE user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004');
DELETE FROM public.profiles WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004');
DELETE FROM auth.users WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004');
DELETE FROM public.businesses WHERE id IN ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');

-- ============================================================================
-- 1. SYNTHETIC AUTH USERS (Satisfies auth.users Foreign Key)
-- ============================================================
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synthetic.owner@rushicrm.test', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Synthetic Owner"}', false),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synthetic.cattle.staff@rushicrm.test', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Synthetic Cattle Feed Staff"}', false),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synthetic.pvc.staff@rushicrm.test', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Synthetic PVC Staff"}', false),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synthetic.unaffiliated@rushicrm.test', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Synthetic Unaffiliated User"}', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. SYNTHETIC BUSINESSES
-- ============================================================================
INSERT INTO public.businesses (id, kind, name, timezone) VALUES
  ('10000000-0000-0000-0000-000000000001', 'cattle_feed', 'Rushi Cattle Feed (Synthetic)', 'Asia/Kolkata'),
  ('10000000-0000-0000-0000-000000000002', 'pvc', 'Rushi PVC Pipes & Fittings (Synthetic)', 'Asia/Kolkata');

-- ============================================================================
-- 3. SYNTHETIC PROFILES
-- ============================================================================
INSERT INTO public.profiles (id, full_name, preferred_locale) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Synthetic Owner', 'en'),
  ('00000000-0000-0000-0000-000000000002', 'Synthetic Cattle Feed Staff', 'mr'),
  ('00000000-0000-0000-0000-000000000003', 'Synthetic PVC Staff', 'en'),
  ('00000000-0000-0000-0000-000000000004', 'Synthetic Unaffiliated User', 'en')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  preferred_locale = EXCLUDED.preferred_locale;

-- ============================================================================
-- 4. BUSINESS MEMBERSHIPS
-- User 1: Owner of Cattle Feed and PVC
-- User 2: Staff of Cattle Feed only
-- User 3: Staff of PVC only
-- User 4: Unaffiliated (no membership)
-- ============================================================================
INSERT INTO public.business_memberships (id, user_id, business_id, role, is_active) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', true),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'owner', true),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'staff', true),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'staff', true);

-- ============================================================================
-- 5. ROLE PERMISSIONS
-- Cattle Feed staff (User 2) has customer.create and bill.create
-- PVC staff (User 3) has customer.create
-- ============================================================================
INSERT INTO public.role_permissions (membership_id, permission, granted_by) VALUES
  ('20000000-0000-0000-0000-000000000003', 'customer.create', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'bill.create', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000004', 'customer.create', '00000000-0000-0000-0000-000000000001');
