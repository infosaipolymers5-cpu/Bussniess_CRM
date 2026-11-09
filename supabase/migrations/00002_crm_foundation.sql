-- Migration: 00002_crm_foundation
-- CRM & Marketing Foundation for Rushi CRM Platform v2.0
--
-- Tables:
-- 1. customers (business-scoped profiles, display_phone, normalized_phone, DOB, area, notes)
-- 2. customer_preferences (opt-out suppression list, communication channels)
-- 3. customer_notes (call notes, promise-to-pay date with audit tracking)
-- 4. customer_groups & customer_group_members (many-to-many business-scoped groups)
-- 5. tags & customer_tags (business-scoped customer tags)
-- 6. duplicate_reviews (phone collision review queue, never auto-merge)
-- 7. opening_balance_imports (provenance-tagged opening balances from imports)
-- 8. public_qr_registrations (public sign-up capture with recorded consent)

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Indian Mobile Phone Normalizer (strips non-digits, extracts 10 digits)
CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_phone IS NULL THEN
    RETURN NULL;
  END IF;
  v_digits := regexp_replace(p_phone, '\D', '', 'g');
  IF char_length(v_digits) = 12 AND v_digits LIKE '91%' THEN
    v_digits := substring(v_digits from 3);
  ELSIF char_length(v_digits) = 11 AND v_digits LIKE '0%' THEN
    v_digits := substring(v_digits from 2);
  END IF;
  IF char_length(v_digits) <> 10 THEN
    RETURN v_digits; -- Fallback to digits
  END IF;
  RETURN v_digits;
END;
$$;

-- ============================================================================
-- 1. CUSTOMERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 200),
  display_phone TEXT NOT NULL CHECK (char_length(trim(display_phone)) >= 10),
  normalized_phone TEXT NOT NULL CHECK (char_length(normalized_phone) >= 10),
  date_of_birth DATE,
  area TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_business ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(business_id, normalized_phone);
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(business_id, is_active) WHERE is_active = true;

-- ============================================================================
-- 2. CUSTOMER PREFERENCES & OPT-OUT SUPPRESSION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  opted_out_marketing BOOLEAN NOT NULL DEFAULT false,
  opted_out_transactional BOOLEAN NOT NULL DEFAULT false,
  preferred_channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (preferred_channel IN ('whatsapp', 'sms', 'call')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id)
);

CREATE INDEX IF NOT EXISTS idx_preferences_marketing ON public.customer_preferences(customer_id, opted_out_marketing);

-- ============================================================================
-- 3. CUSTOMER NOTES & PROMISE-TO-PAY FOLLOW-UPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL CHECK (char_length(trim(content)) >= 1),
  call_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  promise_to_pay_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_customer ON public.customer_notes(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_promise ON public.customer_notes(promise_to_pay_date) WHERE promise_to_pay_date IS NOT NULL;

-- ============================================================================
-- 4. CUSTOMER GROUPS (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

CREATE TABLE IF NOT EXISTS public.customer_group_members (
  group_id UUID NOT NULL REFERENCES public.customer_groups(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_cust ON public.customer_group_members(customer_id);

-- ============================================================================
-- 5. TAGS & CUSTOMER TAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 50),
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

CREATE TABLE IF NOT EXISTS public.customer_tags (
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  PRIMARY KEY (tag_id, customer_id)
);

-- ============================================================================
-- 6. DUPLICATE REVIEWS (Phone collisions review queue; no auto-merge)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.duplicate_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  normalized_phone TEXT NOT NULL,
  existing_customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  incoming_customer_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved_distinct', 'skipped')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duplicate_reviews ON public.duplicate_reviews(business_id, status);

-- ============================================================================
-- 7. OPENING BALANCE IMPORTS (Provenance-tracked opening dues; no invented history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.opening_balance_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  provenance_file TEXT NOT NULL,
  provenance_row INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opening_balances_cust ON public.opening_balance_imports(customer_id);

-- ============================================================================
-- 8. PUBLIC QR REGISTRATIONS (Public sign-up capture; no internal data leak)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.public_qr_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1),
  whatsapp_phone TEXT NOT NULL,
  normalized_phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  category_interest TEXT,
  consent_recorded BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'converted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- 1. Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select_member" ON public.customers
  FOR SELECT USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "customers_insert_member" ON public.customers
  FOR INSERT WITH CHECK (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "customers_update_member" ON public.customers
  FOR UPDATE USING (public.is_business_member(business_id, auth.uid()));

-- 2. Customer Preferences
ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preferences_select_member" ON public.customer_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_preferences.customer_id
        AND public.is_business_member(c.business_id, auth.uid())
    )
  );

CREATE POLICY "preferences_insert_member" ON public.customer_preferences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_preferences.customer_id
        AND public.is_business_member(c.business_id, auth.uid())
    )
  );

CREATE POLICY "preferences_update_member" ON public.customer_preferences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_preferences.customer_id
        AND public.is_business_member(c.business_id, auth.uid())
    )
  );

-- 3. Customer Notes
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select_member" ON public.customer_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_notes.customer_id
        AND public.is_business_member(c.business_id, auth.uid())
    )
  );

CREATE POLICY "notes_insert_member" ON public.customer_notes
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_notes.customer_id
        AND public.is_business_member(c.business_id, auth.uid())
    )
  );

-- 4. Customer Groups & Members
ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_select_member" ON public.customer_groups
  FOR SELECT USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "groups_manage_member" ON public.customer_groups
  FOR ALL USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "group_members_select_member" ON public.customer_group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_groups g
      WHERE g.id = customer_group_members.group_id
        AND public.is_business_member(g.business_id, auth.uid())
    )
  );

CREATE POLICY "group_members_manage_member" ON public.customer_group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_groups g
      WHERE g.id = customer_group_members.group_id
        AND public.is_business_member(g.business_id, auth.uid())
    )
  );

-- 5. Tags & Customer Tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select_member" ON public.tags
  FOR SELECT USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "tags_manage_member" ON public.tags
  FOR ALL USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "customer_tags_select_member" ON public.customer_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tags t
      WHERE t.id = customer_tags.tag_id
        AND public.is_business_member(t.business_id, auth.uid())
    )
  );

CREATE POLICY "customer_tags_manage_member" ON public.customer_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tags t
      WHERE t.id = customer_tags.tag_id
        AND public.is_business_member(t.business_id, auth.uid())
    )
  );

-- 6. Duplicate Reviews
ALTER TABLE public.duplicate_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "duplicates_select_member" ON public.duplicate_reviews
  FOR SELECT USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "duplicates_update_member" ON public.duplicate_reviews
  FOR UPDATE USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "duplicates_insert_member" ON public.duplicate_reviews
  FOR INSERT WITH CHECK (public.is_business_member(business_id, auth.uid()));

-- 7. Opening Balance Imports
ALTER TABLE public.opening_balance_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opening_balances_select_member" ON public.opening_balance_imports
  FOR SELECT USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "opening_balances_insert_member" ON public.opening_balance_imports
  FOR INSERT WITH CHECK (public.is_business_member(business_id, auth.uid()));

-- 8. Public QR Registrations
ALTER TABLE public.public_qr_registrations ENABLE ROW LEVEL SECURITY;

-- Business members can inspect registrations for their business
CREATE POLICY "qr_registrations_select_member" ON public.public_qr_registrations
  FOR SELECT USING (public.is_business_member(business_id, auth.uid()));

-- Unauthenticated or public users can INSERT registration only with consent recorded
CREATE POLICY "qr_registrations_insert_public" ON public.public_qr_registrations
  FOR INSERT WITH CHECK (consent_recorded = true);

-- Business members can update status (e.g. approve/convert to customer)
CREATE POLICY "qr_registrations_update_member" ON public.public_qr_registrations
  FOR UPDATE USING (public.is_business_member(business_id, auth.uid()));

