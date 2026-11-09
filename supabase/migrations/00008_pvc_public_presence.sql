-- ============================================================================
-- Migration: 00008_pvc_public_presence.sql
-- Description: PVC Catalog, Private Item Search, Brands Directory,
--              Digital Visiting Cards, and Customer Tiller Spares Profiling.
-- ============================================================================

-- 1. PVC Categories Table
CREATE TABLE IF NOT EXISTS public.pvc_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_mr TEXT NOT NULL,
  description_en TEXT,
  description_mr TEXT,
  icon_name TEXT DEFAULT 'Layers',
  sort_order INT NOT NULL DEFAULT 0,
  is_coming_later BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_pvc_category_slug UNIQUE (business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_pvc_categories_business ON public.pvc_categories(business_id, sort_order);

-- 2. Brand Records Table (with owner logo-use permission guard)
CREATE TABLE IF NOT EXISTS public.brand_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  category_id UUID REFERENCES public.pvc_categories(id) ON DELETE SET NULL,
  category_name TEXT,
  description_en TEXT,
  description_mr TEXT,
  logo_url TEXT,
  website_url TEXT,
  has_logo_permission BOOLEAN NOT NULL DEFAULT false,
  logo_permission_notes TEXT,
  show_on_digital_card BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_brand_logo_permission CHECK (
    (show_on_digital_card = false) OR (has_logo_permission = true)
  )
);

CREATE INDEX IF NOT EXISTS idx_brand_records_business ON public.brand_records(business_id);
CREATE INDEX IF NOT EXISTS idx_brand_records_card ON public.brand_records(business_id, show_on_digital_card, has_logo_permission);

-- 3. PVC Catalogue Items Table (indexed for 5,000+ items private search)
CREATE TABLE IF NOT EXISTS public.pvc_catalogue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.pvc_categories(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brand_records(id) ON DELETE SET NULL,
  item_code TEXT NOT NULL,
  item_name_en TEXT NOT NULL,
  item_name_mr TEXT NOT NULL,
  size_dimension TEXT,
  unit TEXT NOT NULL DEFAULT 'piece',
  reference_rate_paise BIGINT,
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(item_name_en, '') || ' ' || coalesce(item_name_mr, '') || ' ' || coalesce(item_code, '') || ' ' || coalesce(size_dimension, ''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_pvc_catalogue_code UNIQUE (business_id, item_code)
);

CREATE INDEX IF NOT EXISTS idx_pvc_items_search ON public.pvc_catalogue_items USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_pvc_items_category ON public.pvc_catalogue_items(business_id, category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pvc_items_brand ON public.pvc_catalogue_items(business_id, brand_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pvc_items_code ON public.pvc_catalogue_items(business_id, item_code);

-- 4. Business Cards Table (Digital Visiting Cards with public boundary)
CREATE TABLE IF NOT EXISTS public.business_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  card_slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  tagline_en TEXT,
  tagline_mr TEXT,
  owner_name TEXT NOT NULL,
  primary_phone TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  email TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city_or_village TEXT NOT NULL,
  pincode TEXT,
  google_maps_url TEXT,
  services_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured_brand_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme_color TEXT DEFAULT '#1E40AF',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_cards_slug ON public.business_cards(card_slug);
CREATE INDEX IF NOT EXISTS idx_business_cards_business ON public.business_cards(business_id);

-- 5. Customer Tiller Details Table (Power-tiller profile for spare-part targeting)
CREATE TABLE IF NOT EXISTS public.customer_tiller_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tiller_brand TEXT NOT NULL,
  tiller_model TEXT NOT NULL,
  year_of_purchase INT,
  hp_rating NUMERIC(4, 1),
  blade_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_customer_tiller UNIQUE (customer_id, tiller_brand, tiller_model)
);

CREATE INDEX IF NOT EXISTS idx_customer_tiller_lookup ON public.customer_tiller_details(business_id, tiller_brand, tiller_model);
CREATE INDEX IF NOT EXISTS idx_customer_tiller_customer ON public.customer_tiller_details(customer_id);

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE public.pvc_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pvc_catalogue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tiller_details ENABLE ROW LEVEL SECURITY;

-- PVC Categories Policies
CREATE POLICY "Categories viewable by tenant members"
  ON public.pvc_categories FOR SELECT
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    ) OR is_active = true
  );

CREATE POLICY "Categories manageable by tenant staff/owners"
  ON public.pvc_categories FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
  );

-- Brand Records Policies
CREATE POLICY "Brands viewable by tenant or public if published with permission"
  ON public.brand_records FOR SELECT
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
    OR (show_on_digital_card = true AND has_logo_permission = true AND is_active = true)
  );

CREATE POLICY "Brands manageable by tenant staff/owners"
  ON public.brand_records FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
  );

-- PVC Catalogue Items Policies
CREATE POLICY "Catalogue viewable by tenant members"
  ON public.pvc_catalogue_items FOR SELECT
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Catalogue manageable by tenant staff/owners"
  ON public.pvc_catalogue_items FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
  );

-- Business Cards Policies (Public Boundary)
CREATE POLICY "Public cards viewable by everyone when published"
  ON public.business_cards FOR SELECT
  USING (is_published = true OR business_id IN (
    SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
  ));

CREATE POLICY "Business cards manageable by tenant owners"
  ON public.business_cards FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin')
    )
  );

-- Customer Tiller Details Policies (Strictly Private to Tenant)
CREATE POLICY "Tiller details viewable by tenant staff/owners"
  ON public.customer_tiller_details FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Tiller details manageable by tenant staff/owners"
  ON public.customer_tiller_details FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Security-Definer RPC: Fetch Public Visiting Card Safe View
-- Strictly returns public data; never returns internal ledger, customer or rate data
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_visiting_card(p_card_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card RECORD;
  v_brands JSONB;
BEGIN
  -- 1. Fetch published card
  SELECT * INTO v_card
  FROM public.business_cards
  WHERE card_slug = p_card_slug AND is_published = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 2. Fetch associated brands that have explicit logo permission
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'brand_name', b.brand_name,
      'category_name', b.category_name,
      'logo_url', b.logo_url,
      'website_url', b.website_url,
      'description_mr', b.description_mr,
      'description_en', b.description_en
    )
  ) INTO v_brands
  FROM public.brand_records b
  WHERE b.business_id = v_card.business_id
    AND b.show_on_digital_card = true
    AND b.has_logo_permission = true
    AND b.is_active = true;

  -- 3. Construct safe public JSON payload
  RETURN jsonb_build_object(
    'card_slug', v_card.card_slug,
    'display_name', v_card.display_name,
    'tagline_en', v_card.tagline_en,
    'tagline_mr', v_card.tagline_mr,
    'owner_name', v_card.owner_name,
    'primary_phone', v_card.primary_phone,
    'whatsapp_number', v_card.whatsapp_number,
    'email', v_card.email,
    'address_line1', v_card.address_line1,
    'address_line2', v_card.address_line2,
    'city_or_village', v_card.city_or_village,
    'pincode', v_card.pincode,
    'google_maps_url', v_card.google_maps_url,
    'services_list', v_card.services_list,
    'theme_color', v_card.theme_color,
    'brands', coalesce(v_brands, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_visiting_card(TEXT) TO anon, authenticated;

