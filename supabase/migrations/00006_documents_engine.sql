-- Migration: 00006_documents_engine
-- Documents Engine for Rushi CRM Platform v2.0
--
-- Features 7, 11, 20, 27, 31:
-- 1. document_templates (Branding, firm identity, bank/UPI details, footer text)
-- 2. document_versions (Immutable audit versions of bills, statements, POs with snapshots & checksums)
-- 3. generated_posters (Canvas marketing posters and festive greetings)
-- 4. RLS policies with strict PVC isolation from cattle feed bills/POs

-- ============================================================================
-- 1. DOCUMENT TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('bill', 'khate_utara', 'purchase_order', 'poster')),
  template_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT true,
  firm_name TEXT,
  firm_tagline TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  upi_id TEXT,
  bank_name TEXT,
  bank_account_no TEXT,
  bank_ifsc TEXT,
  logo_url TEXT,
  footer_text TEXT,
  disclaimer TEXT,
  default_language TEXT NOT NULL DEFAULT 'mr' CHECK (default_language IN ('mr', 'en')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_document_template UNIQUE (business_id, document_type, template_name)
);

CREATE INDEX IF NOT EXISTS idx_document_templates_business ON public.document_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON public.document_templates(business_id, document_type);

-- ============================================================================
-- 2. DOCUMENT VERSIONS (Immutable snapshots & audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('commercial_bill', 'revised_bill', 'khate_utara', 'purchase_order', 'poster')),
  reference_id UUID,
  document_number TEXT NOT NULL,
  version_number INT NOT NULL DEFAULT 1 CHECK (version_number >= 1),
  is_revised BOOLEAN NOT NULL DEFAULT false,
  storage_path TEXT,
  checksum TEXT NOT NULL,
  rendering_snapshot JSONB NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (file_size_bytes >= 0),
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_versions_business ON public.document_versions(business_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_ref ON public.document_versions(reference_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc_num ON public.document_versions(business_id, document_number);

-- ============================================================================
-- 3. GENERATED POSTERS (Canvas marketing and greeting presets)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.generated_posters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('festival', 'product_promo', 'cattle_feed_announcement', 'pvc_promo', 'custom')),
  aspect_ratio TEXT NOT NULL DEFAULT '1:1' CHECK (aspect_ratio IN ('1:1', '9:16', '16:9')),
  template_config JSONB NOT NULL,
  image_data_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_posters_business ON public.generated_posters(business_id);
CREATE INDEX IF NOT EXISTS idx_generated_posters_category ON public.generated_posters(business_id, category);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_posters ENABLE ROW LEVEL SECURITY;

-- Document Templates:
-- Members of the business can read templates
CREATE POLICY "Members can view document templates"
  ON public.document_templates
  FOR SELECT
  TO authenticated
  USING (public.has_business_membership(business_id, auth.uid()));

-- Only owners can insert/update/delete document templates
CREATE POLICY "Owners can manage document templates"
  ON public.document_templates
  FOR ALL
  TO authenticated
  USING (public.is_business_owner(business_id, auth.uid()))
  WITH CHECK (public.is_business_owner(business_id, auth.uid()));

-- Document Versions:
-- Commercial Bills, Revised Bills, Khate Utara, and POs are strictly Cattle Feed.
-- PVC members are strictly prohibited from viewing cattle feed documents.
CREATE POLICY "Members can view document versions"
  ON public.document_versions
  FOR SELECT
  TO authenticated
  USING (
    public.has_business_membership(business_id, auth.uid())
    AND (
      -- If poster, both business kinds can view
      document_type = 'poster'
      -- If finance/procurement document, business MUST be cattle feed
      OR public.is_cattle_feed_business(business_id)
    )
  );

CREATE POLICY "Authorized members can create document versions"
  ON public.document_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_business_membership(business_id, auth.uid())
    AND (
      document_type = 'poster'
      OR public.is_cattle_feed_business(business_id)
    )
  );

-- Generated Posters:
-- Available to both Cattle Feed and PVC business members
CREATE POLICY "Members can view generated posters"
  ON public.generated_posters
  FOR SELECT
  TO authenticated
  USING (public.has_business_membership(business_id, auth.uid()));

CREATE POLICY "Members can create generated posters"
  ON public.generated_posters
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_business_membership(business_id, auth.uid()));

CREATE POLICY "Members can update their own generated posters"
  ON public.generated_posters
  FOR UPDATE
  TO authenticated
  USING (public.has_business_membership(business_id, auth.uid()))
  WITH CHECK (public.has_business_membership(business_id, auth.uid()));

CREATE POLICY "Owners can delete generated posters"
  ON public.generated_posters
  FOR DELETE
  TO authenticated
  USING (public.is_business_owner(business_id, auth.uid()));

-- ============================================================================
-- 5. RPC FUNCTIONS
-- ============================================================================

-- Register an immutable document version
CREATE OR REPLACE FUNCTION public.register_document_version(
  p_business_id UUID,
  p_document_type TEXT,
  p_reference_id UUID,
  p_document_number TEXT,
  p_version_number INT,
  p_is_revised BOOLEAN,
  p_checksum TEXT,
  p_rendering_snapshot JSONB,
  p_file_size_bytes BIGINT DEFAULT 0,
  p_storage_path TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_id UUID;
BEGIN
  -- Verify membership
  IF NOT public.has_business_membership(p_business_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: caller is not a member of this business';
  END IF;

  -- Verify cattle feed restriction if document is financial
  IF p_document_type IN ('commercial_bill', 'revised_bill', 'khate_utara', 'purchase_order') THEN
    IF NOT public.is_cattle_feed_business(p_business_id) THEN
      RAISE EXCEPTION 'Access denied: document type % is restricted to Cattle Feed businesses', p_document_type;
    END IF;
  END IF;

  INSERT INTO public.document_versions (
    business_id,
    document_type,
    reference_id,
    document_number,
    version_number,
    is_revised,
    storage_path,
    checksum,
    rendering_snapshot,
    file_size_bytes,
    mime_type,
    created_by
  ) VALUES (
    p_business_id,
    p_document_type,
    p_reference_id,
    p_document_number,
    p_version_number,
    p_is_revised,
    p_storage_path,
    p_checksum,
    p_rendering_snapshot,
    p_file_size_bytes,
    'application/pdf',
    auth.uid()
  )
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$;

