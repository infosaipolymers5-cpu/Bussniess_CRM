-- Migration: 00005_profit_expense
-- Profit & Expense Engine for Rushi CRM Platform v2.0 (Cattle Feed Exclusive, Owner-Only)
--
-- Features 35-37:
-- 1. sale_cost_snapshots (Immutable cost and profit snapshots per bill item)
-- 2. expense_categories (Operating expense categories)
-- 3. expenses (Categorized operating expenses with double-counting guard)
-- 4. owner_pin_settings (Optional security PIN to view sensitive profit metrics)

-- ============================================================================
-- 1. SALE COST SNAPSHOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sale_cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  bill_item_id UUID NOT NULL REFERENCES public.bill_items(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  realized_selling_rate_paise BIGINT NOT NULL CHECK (realized_selling_rate_paise >= 0),
  effective_cost_paise BIGINT NOT NULL CHECK (effective_cost_paise >= 0),
  unit_profit_paise BIGINT NOT NULL,
  total_profit_paise BIGINT NOT NULL,
  cost_source TEXT NOT NULL DEFAULT 'latest_purchase_cost'
    CHECK (cost_source IN ('purchase_order_line', 'latest_purchase_cost', 'default_catalogue_cost')),
  source_order_item_id UUID REFERENCES public.purchase_order_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sale_cost_snapshot_item UNIQUE (bill_item_id),
  CONSTRAINT snapshots_cattle_feed_only CHECK (public.is_cattle_feed_business(business_id))
);

CREATE INDEX IF NOT EXISTS idx_sale_cost_snapshots_business ON public.sale_cost_snapshots(business_id);
CREATE INDEX IF NOT EXISTS idx_sale_cost_snapshots_bill ON public.sale_cost_snapshots(bill_id);
CREATE INDEX IF NOT EXISTS idx_sale_cost_snapshots_product ON public.sale_cost_snapshots(product_id);

-- ============================================================================
-- 2. EXPENSE CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_expense_category_business_name UNIQUE (business_id, name),
  CONSTRAINT expense_cat_cattle_feed_only CHECK (public.is_cattle_feed_business(business_id))
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_business ON public.expense_categories(business_id);

-- ============================================================================
-- 3. EXPENSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  load_reference TEXT,
  is_load_allocated BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT expenses_cattle_feed_only CHECK (public.is_cattle_feed_business(business_id))
);

CREATE INDEX IF NOT EXISTS idx_expenses_business_date ON public.expenses(business_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_customer ON public.expenses(customer_id);

-- ============================================================================
-- 4. OWNER PIN SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.owner_pin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_owner_pin_business UNIQUE (business_id)
);

-- ============================================================================
-- 5. STORED PROCEDURES
-- ============================================================================

-- Function to record sale cost snapshot at bill creation
CREATE OR REPLACE FUNCTION public.create_sale_cost_snapshot(
  p_business_id UUID,
  p_bill_id UUID,
  p_bill_item_id UUID,
  p_product_id UUID,
  p_product_name TEXT,
  p_quantity NUMERIC,
  p_realized_selling_rate_paise BIGINT,
  p_source_order_item_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_effective_cost_paise BIGINT := 0;
  v_cost_source TEXT := 'latest_purchase_cost';
  v_unit_profit_paise BIGINT;
  v_total_profit_paise BIGINT;
  v_snapshot_id UUID;
BEGIN
  -- 1. Try linked purchase order item
  IF p_source_order_item_id IS NOT NULL THEN
    SELECT effective_cost_paise INTO v_effective_cost_paise
    FROM public.purchase_order_items
    WHERE id = p_source_order_item_id;

    IF FOUND THEN
      v_cost_source := 'purchase_order_line';
    END IF;
  END IF;

  -- 2. If not found, lookup latest confirmed purchase order effective cost
  IF v_effective_cost_paise = 0 AND p_product_id IS NOT NULL THEN
    SELECT poi.effective_cost_paise INTO v_effective_cost_paise
    FROM public.purchase_order_items poi
    JOIN public.purchase_orders po ON po.id = poi.order_id
    WHERE poi.product_id = p_product_id
      AND po.status IN ('ordered', 'dispatched', 'received')
    ORDER BY po.order_date DESC, po.created_at DESC
    LIMIT 1;

    IF FOUND THEN
      v_cost_source := 'latest_purchase_cost';
    END IF;
  END IF;

  -- 3. If still zero, fallback to default catalogue price
  IF v_effective_cost_paise = 0 AND p_product_id IS NOT NULL THEN
    SELECT default_price_paise INTO v_effective_cost_paise
    FROM public.products
    WHERE id = p_product_id;

    IF FOUND THEN
      v_cost_source := 'default_catalogue_cost';
    END IF;
  END IF;

  -- 4. Compute profit
  v_unit_profit_paise := p_realized_selling_rate_paise - v_effective_cost_paise;
  v_total_profit_paise := ROUND(v_unit_profit_paise * p_quantity)::BIGINT;

  INSERT INTO public.sale_cost_snapshots (
    business_id, bill_id, bill_item_id, product_id, product_name,
    quantity, realized_selling_rate_paise, effective_cost_paise,
    unit_profit_paise, total_profit_paise, cost_source, source_order_item_id
  ) VALUES (
    p_business_id, p_bill_id, p_bill_item_id, p_product_id, p_product_name,
    p_quantity, p_realized_selling_rate_paise, v_effective_cost_paise,
    v_unit_profit_paise, v_total_profit_paise, v_cost_source, p_source_order_item_id
  )
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

-- Function to compute Authoritative Owner Profit Dashboard Metrics
CREATE OR REPLACE FUNCTION public.get_owner_profit_metrics(
  p_business_id UUID,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_net_sales_paise BIGINT := 0;
  v_cogs_paise BIGINT := 0;
  v_gross_profit_paise BIGINT := 0;
  v_collections_paise BIGINT := 0;
  v_operating_expenses_paise BIGINT := 0;
  v_net_profit_paise BIGINT := 0;
  v_total_receivables_paise BIGINT := 0;
  v_total_payables_paise BIGINT := 0;
  v_expected_profit_paise BIGINT := 0;
  v_product_margins JSONB := '[]'::JSONB;
BEGIN
  -- Net Sales from confirmed valid bills (status != 'cancelled') in period
  SELECT COALESCE(SUM(total_amount_paise), 0)
  INTO v_net_sales_paise
  FROM public.bills
  WHERE business_id = p_business_id
    AND status != 'cancelled'
    AND (p_from_date IS NULL OR bill_date >= p_from_date)
    AND (p_to_date IS NULL OR bill_date <= p_to_date);

  -- COGS and Gross Profit from sale_cost_snapshots of valid bills
  SELECT
    COALESCE(SUM(ROUND(scs.effective_cost_paise * scs.quantity)::BIGINT), 0),
    COALESCE(SUM(scs.total_profit_paise), 0)
  INTO v_cogs_paise, v_gross_profit_paise
  FROM public.sale_cost_snapshots scs
  JOIN public.bills b ON b.id = scs.bill_id
  WHERE scs.business_id = p_business_id
    AND b.status != 'cancelled'
    AND (p_from_date IS NULL OR b.bill_date >= p_from_date)
    AND (p_to_date IS NULL OR b.bill_date <= p_to_date);

  -- Collections in period from customer_payments
  SELECT COALESCE(SUM(amount_paise), 0)
  INTO v_collections_paise
  FROM public.customer_payments
  WHERE business_id = p_business_id
    AND (p_from_date IS NULL OR payment_date::date >= p_from_date)
    AND (p_to_date IS NULL OR payment_date::date <= p_to_date);

  -- Operating expenses in period (excluding freight already absorbed into COGS)
  SELECT COALESCE(SUM(amount_paise), 0)
  INTO v_operating_expenses_paise
  FROM public.expenses
  WHERE business_id = p_business_id
    AND is_load_allocated = false
    AND (p_from_date IS NULL OR expense_date >= p_from_date)
    AND (p_to_date IS NULL OR expense_date <= p_to_date);

  -- Net Profit = Gross Profit - Non-allocated Operating Expenses
  v_net_profit_paise := v_gross_profit_paise - v_operating_expenses_paise;

  -- Total Outstanding Customer Receivables (from customer ledger)
  SELECT COALESCE(SUM(debit_paise) - SUM(credit_paise), 0)
  INTO v_total_receivables_paise
  FROM public.customer_ledger_entries
  WHERE business_id = p_business_id;

  -- Total Outstanding Supplier Payables (from supplier ledger)
  SELECT COALESCE(SUM(credit_paise) - SUM(debit_paise), 0)
  INTO v_total_payables_paise
  FROM public.supplier_ledger_entries
  WHERE business_id = p_business_id;

  -- Expected Profit: separately labelled projection
  SELECT COALESCE(SUM(scs.total_profit_paise), 0)
  INTO v_expected_profit_paise
  FROM public.sale_cost_snapshots scs
  JOIN public.bills b ON b.id = scs.bill_id
  WHERE scs.business_id = p_business_id
    AND b.status IN ('issued', 'partially_paid');

  -- Product Margin Breakdown
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'product_name', p_name,
      'total_quantity', tot_qty,
      'total_sales_paise', tot_sales,
      'total_cogs_paise', tot_cogs,
      'gross_profit_paise', tot_profit,
      'margin_percent', CASE WHEN tot_sales > 0 THEN ROUND((tot_profit::numeric / tot_sales::numeric) * 100, 2) ELSE 0 END
    )
  ), '[]'::JSONB)
  INTO v_product_margins
  FROM (
    SELECT
      scs.product_name AS p_name,
      SUM(scs.quantity) AS tot_qty,
      SUM(ROUND(scs.realized_selling_rate_paise * scs.quantity)::BIGINT) AS tot_sales,
      SUM(ROUND(scs.effective_cost_paise * scs.quantity)::BIGINT) AS tot_cogs,
      SUM(scs.total_profit_paise) AS tot_profit
    FROM public.sale_cost_snapshots scs
    JOIN public.bills b ON b.id = scs.bill_id
    WHERE scs.business_id = p_business_id
      AND b.status != 'cancelled'
      AND (p_from_date IS NULL OR b.bill_date >= p_from_date)
      AND (p_to_date IS NULL OR b.bill_date <= p_to_date)
    GROUP BY scs.product_name
    ORDER BY tot_profit DESC
  ) sub;

  RETURN jsonb_build_object(
    'business_id', p_business_id,
    'from_date', p_from_date,
    'to_date', p_to_date,
    'net_sales_paise', v_net_sales_paise,
    'cogs_paise', v_cogs_paise,
    'gross_profit_paise', v_gross_profit_paise,
    'collections_paise', v_collections_paise,
    'operating_expenses_paise', v_operating_expenses_paise,
    'net_profit_paise', v_net_profit_paise,
    'total_receivables_paise', v_total_receivables_paise,
    'total_payables_paise', v_total_payables_paise,
    'expected_profit_paise', v_expected_profit_paise,
    'product_margins', v_product_margins
  );
END;
$$;

-- Verify owner PIN
CREATE OR REPLACE FUNCTION public.verify_owner_pin(
  p_business_id UUID,
  p_pin_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.owner_pin_settings
    WHERE business_id = p_business_id
      AND pin_hash = p_pin_hash
      AND is_enabled = true
  );
$$;

-- ============================================================================
-- 6. OWNER-ONLY ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Cattle Feed Exclusive and Owner Only
-- ============================================================================

ALTER TABLE public.sale_cost_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_pin_settings ENABLE ROW LEVEL SECURITY;

-- 1. Sale Cost Snapshots
CREATE POLICY "sale_cost_snapshots_owner_all" ON public.sale_cost_snapshots
  FOR ALL TO authenticated
  USING (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  )
  WITH CHECK (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  );

-- 2. Expense Categories
CREATE POLICY "expense_categories_owner_all" ON public.expense_categories
  FOR ALL TO authenticated
  USING (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  )
  WITH CHECK (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  );

-- 3. Expenses
CREATE POLICY "expenses_owner_all" ON public.expenses
  FOR ALL TO authenticated
  USING (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  )
  WITH CHECK (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  );

-- 4. Owner PIN Settings
CREATE POLICY "owner_pin_settings_owner_all" ON public.owner_pin_settings
  FOR ALL TO authenticated
  USING (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  )
  WITH CHECK (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  );

-- Revoke execute from public; grant to authenticated and service_role
REVOKE ALL ON FUNCTION public.create_sale_cost_snapshot(UUID, UUID, UUID, UUID, TEXT, NUMERIC, BIGINT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sale_cost_snapshot(UUID, UUID, UUID, UUID, TEXT, NUMERIC, BIGINT, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_owner_profit_metrics(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_profit_metrics(UUID, DATE, DATE) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.verify_owner_pin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_owner_pin(UUID, TEXT) TO authenticated, service_role;

