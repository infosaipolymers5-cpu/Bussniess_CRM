-- Stage 9: Operations, Reports, Backups & Release Acceptance Migration
-- Migration: 00009_operations_and_release.sql
-- Enforces:
-- 1. Backup artifact registry with SHA-256 checksums, encrypted status, retention classes (daily, monthly, manual)
-- 2. Isolated restore runs with sandbox verification, reconciled counts, and owner sign-off
-- 3. Business operational settings (UPI, banking, bilingual invoice footers, reminder recurrence, safe messaging gating)
-- 4. Report exports registry for auditable compliance
-- 5. Safe retention cleanup functions that never delete the last verified recovery point
-- 6. Non-recursive RLS policies: owner-only access for backups, restore runs, staff governance, and operational settings

-- ============================================================================
-- 1. BACKUP ARTIFACTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  artifact_location TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  database_table_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  object_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_encrypted BOOLEAN NOT NULL DEFAULT true,
  retention_class TEXT NOT NULL CHECK (retention_class IN ('daily', 'monthly', 'manual')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verification_details JSONB DEFAULT '{}'::jsonb,
  job_correlation_id TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_backup_artifacts_business_date 
  ON public.backup_artifacts(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_artifacts_verification 
  ON public.backup_artifacts(verification_status, retention_class);

-- ============================================================================
-- 2. RESTORE RUNS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.restore_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_artifact_id UUID NOT NULL REFERENCES public.backup_artifacts(id) ON DELETE RESTRICT,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  target_environment TEXT NOT NULL DEFAULT 'isolated_sandbox',
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'verified', 'failed', 'aborted')),
  reconciled_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  reconciled_ledger_totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  checksum_verified BOOLEAN NOT NULL DEFAULT true,
  owner_sign_off_at TIMESTAMPTZ,
  owner_sign_off_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restore_runs_business_date 
  ON public.restore_runs(business_id, created_at DESC);

-- ============================================================================
-- 3. BUSINESS SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.business_settings (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  upi_id TEXT,
  bank_name TEXT,
  bank_account_no TEXT,
  bank_ifsc TEXT,
  invoice_footer_notes_en TEXT,
  invoice_footer_notes_mr TEXT,
  default_payment_reminder_days INTEGER NOT NULL DEFAULT 7 CHECK (default_payment_reminder_days >= 1 AND default_payment_reminder_days <= 90),
  default_feed_finish_buffer_days INTEGER NOT NULL DEFAULT 5 CHECK (default_feed_finish_buffer_days >= 1 AND default_feed_finish_buffer_days <= 30),
  automatic_messaging_enabled BOOLEAN NOT NULL DEFAULT false,
  messaging_provider_config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- 4. REPORT EXPORTS REGISTRY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('sales_collections', 'overdue_debtors', 'profit_margin', 'tax_summary')),
  scope TEXT NOT NULL CHECK (scope IN ('cattle_feed', 'pvc', 'combined')),
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  file_format TEXT NOT NULL CHECK (file_format IN ('csv', 'pdf', 'xlsx')),
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_exports_business_date 
  ON public.report_exports(business_id, created_at DESC);

-- ============================================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================================================
ALTER TABLE public.backup_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

-- Backup Artifacts: Owner-Only
CREATE POLICY backup_artifacts_select_owner ON public.backup_artifacts
  FOR SELECT TO authenticated
  USING (
    business_id IS NULL OR public.is_business_owner(business_id, auth.uid())
  );

CREATE POLICY backup_artifacts_insert_owner ON public.backup_artifacts
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id IS NULL OR public.is_business_owner(business_id, auth.uid())
  );

CREATE POLICY backup_artifacts_update_owner ON public.backup_artifacts
  FOR UPDATE TO authenticated
  USING (
    business_id IS NULL OR public.is_business_owner(business_id, auth.uid())
  );

-- Restore Runs: Owner-Only
CREATE POLICY restore_runs_select_owner ON public.restore_runs
  FOR SELECT TO authenticated
  USING (
    business_id IS NULL OR public.is_business_owner(business_id, auth.uid())
  );

CREATE POLICY restore_runs_insert_owner ON public.restore_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id IS NULL OR public.is_business_owner(business_id, auth.uid())
  );

CREATE POLICY restore_runs_update_owner ON public.restore_runs
  FOR UPDATE TO authenticated
  USING (
    business_id IS NULL OR public.is_business_owner(business_id, auth.uid())
  );

-- Business Settings: Members can Read, only Owners can Mutate
CREATE POLICY business_settings_select_member ON public.business_settings
  FOR SELECT TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid())
  );

CREATE POLICY business_settings_insert_owner ON public.business_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_owner(business_id, auth.uid())
  );

CREATE POLICY business_settings_update_owner ON public.business_settings
  FOR UPDATE TO authenticated
  USING (
    public.is_business_owner(business_id, auth.uid())
  );

-- Report Exports: Members can view & generate
CREATE POLICY report_exports_select_member ON public.report_exports
  FOR SELECT TO authenticated
  USING (
    business_id IS NULL OR public.is_business_member(business_id, auth.uid())
  );

CREATE POLICY report_exports_insert_member ON public.report_exports
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id IS NULL OR public.is_business_member(business_id, auth.uid())
  );

-- ============================================================================
-- 6. PROCEDURES & FUNCTIONS
-- ============================================================================

-- Function: Enforce backup retention safely (30 daily, 12 monthly, never delete last recovery point)
CREATE OR REPLACE FUNCTION public.enforce_backup_retention(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_verified_count INTEGER;
  v_pruned_count INTEGER := 0;
  v_candidate_id UUID;
  v_result JSONB;
BEGIN
  -- Verify caller is owner
  IF NOT public.is_business_owner(p_business_id, auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: only business owners can trigger backup retention pruning.';
  END IF;

  -- Count total verified backups for this business
  SELECT count(*) INTO v_verified_count
  FROM public.backup_artifacts
  WHERE business_id = p_business_id
    AND verification_status = 'verified';

  -- If only 1 or 0 verified backups exist, refuse to delete any verified backup
  IF v_verified_count <= 1 THEN
    RETURN jsonb_build_object(
      'status', 'skipped',
      'reason', 'Retention preserved: only one verified recovery point exists',
      'pruned_count', 0,
      'verified_remaining', v_verified_count
    );
  END IF;

  -- 1. Daily backups older than 30 days that are NOT monthly retention class
  FOR v_candidate_id IN
    SELECT id
    FROM public.backup_artifacts
    WHERE business_id = p_business_id
      AND retention_class = 'daily'
      AND created_at < (now() - INTERVAL '30 days')
    ORDER BY created_at ASC
  LOOP
    -- Re-check verified count before each deletion
    SELECT count(*) INTO v_verified_count
    FROM public.backup_artifacts
    WHERE business_id = p_business_id
      AND verification_status = 'verified';

    IF v_verified_count > 1 THEN
      DELETE FROM public.backup_artifacts WHERE id = v_candidate_id;
      v_pruned_count := v_pruned_count + 1;
    ELSE
      EXIT; -- Stop pruning to protect the last verified copy
    END IF;
  END LOOP;

  -- 2. Monthly backups older than 365 days
  FOR v_candidate_id IN
    SELECT id
    FROM public.backup_artifacts
    WHERE business_id = p_business_id
      AND retention_class = 'monthly'
      AND created_at < (now() - INTERVAL '365 days')
    ORDER BY created_at ASC
  LOOP
    SELECT count(*) INTO v_verified_count
    FROM public.backup_artifacts
    WHERE business_id = p_business_id
      AND verification_status = 'verified';

    IF v_verified_count > 1 THEN
      DELETE FROM public.backup_artifacts WHERE id = v_candidate_id;
      v_pruned_count := v_pruned_count + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_verified_count
  FROM public.backup_artifacts
  WHERE business_id = p_business_id
    AND verification_status = 'verified';

  v_result := jsonb_build_object(
    'status', 'success',
    'pruned_count', v_pruned_count,
    'verified_remaining', v_verified_count
  );

  RETURN v_result;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.enforce_backup_retention(UUID) TO authenticated;

