-- Migration: 00004_supplier_cost
-- Supplier & Cost Engine for Rushi CRM Platform v2.0 (Cattle Feed Exclusive, Owner-Only)
--
-- Features 30-34:
-- 1. suppliers (Owner-only supplier records with contact details and GSTIN)
-- 2. supplier_opening_balances (Per-financial-year opening balances)
-- 3. purchase_order_sequences (Locked FY sequence counters for sequential PO numbers)
-- 4. purchase_orders (PO header with draft/ordered/dispatched/received/cancelled lifecycle)
-- 5. purchase_order_items (Line items with customer-linking, unit rates, and load cost allocation)
-- 6. purchase_order_status_history (Idempotent order status transitions with transition keys)
-- 7. purchase_load_costs (Freights/transport costs apportionable to items)
-- 8. supplier_ledger_entries (Append-only immutable supplier ledger)
-- 9. supplier_payments (Confirmed payment receipts with idempotency keys)
-- 10. supplier_payment_allocations (Allocation of payments to purchase orders)
-- 11. supplier_advance_credits (Excess payment tracking for future order offset)

-- ============================================================================
-- 1. SUPPLIERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  gstin TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_cattle_feed_only CHECK (public.is_cattle_feed_business(business_id))
);

CREATE INDEX IF NOT EXISTS idx_suppliers_business ON public.suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(business_id, name);

-- ============================================================================
-- 2. SUPPLIER OPENING BALANCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_opening_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  financial_year TEXT NOT NULL,
  amount_paise BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_supplier_opening_balance UNIQUE (supplier_id, financial_year)
);

CREATE INDEX IF NOT EXISTS idx_supplier_opening_balances_supplier ON public.supplier_opening_balances(supplier_id);

-- ============================================================================
-- 3. PURCHASE ORDER SEQUENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_order_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  financial_year TEXT NOT NULL,
  last_number INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_purchase_order_sequence UNIQUE (business_id, financial_year)
);

-- ============================================================================
-- 4. PURCHASE ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  order_number TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'dispatched', 'received', 'cancelled')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  total_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_amount_paise >= 0),
  total_load_cost_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_load_cost_paise >= 0),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_purchase_order_number UNIQUE (business_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_business ON public.purchase_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(business_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON public.purchase_orders(business_id, order_date DESC);

-- ============================================================================
-- 5. PURCHASE ORDER ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  quantity_bags INT NOT NULL CHECK (quantity_bags > 0),
  unit_rate_paise BIGINT NOT NULL CHECK (unit_rate_paise >= 0),
  total_paise BIGINT NOT NULL CHECK (total_paise >= 0),
  allocated_load_cost_paise BIGINT NOT NULL DEFAULT 0 CHECK (allocated_load_cost_paise >= 0),
  effective_cost_paise BIGINT NOT NULL DEFAULT 0 CHECK (effective_cost_paise >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON public.purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON public.purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_customer ON public.purchase_order_items(customer_id);

-- ============================================================================
-- 6. PURCHASE ORDER STATUS HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  transition_key TEXT NOT NULL UNIQUE,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_status_history_order ON public.purchase_order_status_history(order_id);

-- ============================================================================
-- 7. PURCHASE LOAD COSTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_load_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  allocation_method TEXT NOT NULL DEFAULT 'by_bags' CHECK (allocation_method IN ('by_bags', 'by_value')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_load_costs_order ON public.purchase_load_costs(order_id);

-- ============================================================================
-- 8. SUPPLIER LEDGER ENTRIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('opening_balance', 'purchase', 'payment', 'advance', 'adjustment', 'reversal')),
  reference_type TEXT CHECK (reference_type IN ('purchase_order', 'supplier_payment', 'manual')),
  reference_id UUID,
  debit_paise BIGINT NOT NULL DEFAULT 0 CHECK (debit_paise >= 0),
  credit_paise BIGINT NOT NULL DEFAULT 0 CHECK (credit_paise >= 0),
  entry_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT supplier_entry_non_zero CHECK (debit_paise > 0 OR credit_paise > 0),
  CONSTRAINT supplier_entry_single_sided CHECK (
    (debit_paise = 0 AND credit_paise > 0) OR
    (credit_paise = 0 AND debit_paise > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supplier_date ON public.supplier_ledger_entries(supplier_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_business ON public.supplier_ledger_entries(business_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_reference ON public.supplier_ledger_entries(reference_type, reference_id);

-- ============================================================================
-- 9. SUPPLIER PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  payment_number TEXT NOT NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  idempotency_key TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON public.supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_business ON public.supplier_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON public.supplier_payments(business_id, payment_date DESC);

-- ============================================================================
-- 10. SUPPLIER PAYMENT ALLOCATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.supplier_payments(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_allocations_payment ON public.supplier_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_supplier_allocations_order ON public.supplier_payment_allocations(purchase_order_id);

-- ============================================================================
-- 11. SUPPLIER ADVANCE CREDITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_advance_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES public.supplier_payments(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  remaining_paise BIGINT NOT NULL CHECK (remaining_paise >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_advances_supplier ON public.supplier_advance_credits(supplier_id);

-- ============================================================================
-- 12. STORED PROCEDURES
-- ============================================================================

-- Allocate sequential PO Number under row-lock
CREATE OR REPLACE FUNCTION public.allocate_purchase_order_number(
  p_business_id UUID,
  p_financial_year TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_num INT;
  v_formatted TEXT;
BEGIN
  -- Row lock or insert
  INSERT INTO public.purchase_order_sequences (business_id, financial_year, last_number)
  VALUES (p_business_id, p_financial_year, 1)
  ON CONFLICT (business_id, financial_year)
  DO UPDATE SET
    last_number = public.purchase_order_sequences.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next_num;

  v_formatted := 'PO/' || p_financial_year || '/' || lpad(v_next_num::TEXT, 4, '0');
  RETURN v_formatted;
END;
$$;

-- Transition PO Status (Draft -> Ordered -> Dispatched -> Received -> Cancelled)
-- Crucial rule: A draft order is never a payable. Confirmation posts payable. Cancelled posts reversal.
CREATE OR REPLACE FUNCTION public.transition_purchase_order_status(
  p_order_id UUID,
  p_to_status TEXT,
  p_transition_key TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_already_posted BOOLEAN;
BEGIN
  -- Fetch order with lock
  SELECT * INTO v_order
  FROM public.purchase_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_order_id;
  END IF;

  -- Record transition history with idempotency key
  INSERT INTO public.purchase_order_status_history (
    order_id, from_status, to_status, transition_key, notes, changed_by
  ) VALUES (
    p_order_id, v_order.status, p_to_status, p_transition_key, p_notes, auth.uid()
  );

  -- Update order status
  UPDATE public.purchase_orders
  SET
    status = p_to_status,
    updated_at = now()
  WHERE id = p_order_id;

  -- Check if payable was already posted
  SELECT EXISTS (
    SELECT 1 FROM public.supplier_ledger_entries
    WHERE reference_type = 'purchase_order'
      AND reference_id = p_order_id
      AND entry_type = 'purchase'
  ) INTO v_already_posted;

  -- Post payable credit when order is confirmed (ordered, dispatched, or received) if not already posted
  IF p_to_status IN ('ordered', 'dispatched', 'received') AND NOT v_already_posted THEN
    IF v_order.total_amount_paise > 0 THEN
      INSERT INTO public.supplier_ledger_entries (
        business_id, supplier_id, entry_type, reference_type, reference_id,
        debit_paise, credit_paise, entry_date, description
      ) VALUES (
        v_order.business_id,
        v_order.supplier_id,
        'purchase',
        'purchase_order',
        v_order.id,
        0,
        v_order.total_amount_paise,
        v_order.order_date::timestamptz,
        'Purchase Order ' || v_order.order_number
      );
    END IF;
  END IF;

  -- Post reversal debit when order is cancelled after having been confirmed
  IF p_to_status = 'cancelled' AND v_already_posted THEN
    INSERT INTO public.supplier_ledger_entries (
      business_id, supplier_id, entry_type, reference_type, reference_id,
      debit_paise, credit_paise, entry_date, description
    ) VALUES (
      v_order.business_id,
      v_order.supplier_id,
      'reversal',
      'purchase_order',
      v_order.id,
      v_order.total_amount_paise,
      0,
      now(),
      'Cancellation reversal for ' || v_order.order_number || COALESCE(': ' || p_notes, '')
    );
  END IF;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'from_status', v_order.status,
    'to_status', p_to_status,
    'transition_key', p_transition_key
  );
END;
$$;

-- Record Supplier Payment
-- Posts debit entry to supplier ledger; supplier payments are NOT expenses.
CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  p_business_id UUID,
  p_supplier_id UUID,
  p_amount_paise BIGINT,
  p_payment_date TIMESTAMPTZ DEFAULT now(),
  p_payment_mode TEXT DEFAULT 'cash',
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment_id UUID;
  v_payment_number TEXT;
  v_fy TEXT;
  v_unallocated BIGINT;
  v_order RECORD;
  v_alloc_amount BIGINT;
  v_order_paid BIGINT;
  v_order_due BIGINT;
BEGIN
  IF p_amount_paise <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF NOT public.is_cattle_feed_business(p_business_id) THEN
    RAISE EXCEPTION 'Payments are only supported for Cattle Feed businesses';
  END IF;

  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_payment_id
    FROM public.supplier_payments
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'payment_id', v_payment_id,
        'status', 'already_processed'
      );
    END IF;
  END IF;

  v_fy := public.get_financial_year(p_payment_date);
  v_payment_number := 'SPAY/' || v_fy || '/' || substr(md5(random()::TEXT), 1, 6);

  -- Insert payment
  INSERT INTO public.supplier_payments (
    business_id, supplier_id, payment_number, amount_paise,
    payment_date, payment_mode, reference_number, notes, idempotency_key, created_by
  ) VALUES (
    p_business_id, p_supplier_id, v_payment_number, p_amount_paise,
    p_payment_date, p_payment_mode, p_reference_number, p_notes, p_idempotency_key, auth.uid()
  )
  RETURNING id INTO v_payment_id;

  -- Post debit to supplier ledger (reduces payable balance)
  INSERT INTO public.supplier_ledger_entries (
    business_id, supplier_id, entry_type, reference_type, reference_id,
    debit_paise, credit_paise, entry_date, description
  ) VALUES (
    p_business_id,
    p_supplier_id,
    'payment',
    'supplier_payment',
    v_payment_id,
    p_amount_paise,
    0,
    p_payment_date,
    'Payment ' || v_payment_number || ' (' || p_payment_mode || ')'
  );

  -- Allocate to open confirmed purchase orders FIFO
  v_unallocated := p_amount_paise;

  FOR v_order IN
    SELECT po.id, po.total_amount_paise
    FROM public.purchase_orders po
    WHERE po.business_id = p_business_id
      AND po.supplier_id = p_supplier_id
      AND po.status IN ('ordered', 'dispatched', 'received')
    ORDER BY po.order_date ASC, po.created_at ASC
  LOOP
    EXIT WHEN v_unallocated <= 0;

    -- Calculate amount already allocated to this PO
    SELECT COALESCE(SUM(amount_paise), 0)
    INTO v_order_paid
    FROM public.supplier_payment_allocations
    WHERE purchase_order_id = v_order.id;

    v_order_due := v_order.total_amount_paise - v_order_paid;

    IF v_order_due > 0 THEN
      v_alloc_amount := LEAST(v_unallocated, v_order_due);

      INSERT INTO public.supplier_payment_allocations (
        payment_id, purchase_order_id, amount_paise
      ) VALUES (
        v_payment_id, v_order.id, v_alloc_amount
      );

      v_unallocated := v_unallocated - v_alloc_amount;
    END IF;
  END LOOP;

  -- Convert surplus into advance credit
  IF v_unallocated > 0 THEN
    INSERT INTO public.supplier_advance_credits (
      business_id, supplier_id, payment_id, amount_paise, remaining_paise
    ) VALUES (
      p_business_id, p_supplier_id, v_payment_id, v_unallocated, v_unallocated
    );
  END IF;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'payment_number', v_payment_number,
    'allocated_paise', p_amount_paise - v_unallocated,
    'advance_credit_paise', v_unallocated
  );
END;
$$;

-- Supplier Account Statement (Khata)
CREATE OR REPLACE FUNCTION public.get_supplier_account_statement(
  p_business_id UUID,
  p_supplier_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_opening_balance_paise BIGINT := 0;
  v_period_debits_paise BIGINT := 0;
  v_period_credits_paise BIGINT := 0;
  v_closing_balance_paise BIGINT := 0;
  v_entries JSONB := '[]'::JSONB;
BEGIN
  -- Opening balance from explicit table or pre-period ledger entries
  IF p_from_date IS NOT NULL THEN
    SELECT COALESCE(SUM(credit_paise) - SUM(debit_paise), 0)
    INTO v_opening_balance_paise
    FROM public.supplier_ledger_entries
    WHERE business_id = p_business_id
      AND supplier_id = p_supplier_id
      AND entry_date < p_from_date;
  END IF;

  -- Period entries
  SELECT
    COALESCE(SUM(debit_paise), 0),
    COALESCE(SUM(credit_paise), 0),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'entry_date', entry_date,
        'entry_type', entry_type,
        'reference_type', reference_type,
        'reference_id', reference_id,
        'description', description,
        'debit_paise', debit_paise,
        'credit_paise', credit_paise
      ) ORDER BY entry_date ASC, created_at ASC
    ), '[]'::JSONB)
  INTO
    v_period_debits_paise,
    v_period_credits_paise,
    v_entries
  FROM public.supplier_ledger_entries
  WHERE business_id = p_business_id
    AND supplier_id = p_supplier_id
    AND (p_from_date IS NULL OR entry_date >= p_from_date)
    AND (p_to_date IS NULL OR entry_date <= p_to_date);

  -- Closing balance = opening + credits (purchases) - debits (payments)
  v_closing_balance_paise := v_opening_balance_paise + v_period_credits_paise - v_period_debits_paise;

  RETURN jsonb_build_object(
    'supplier_id', p_supplier_id,
    'from_date', p_from_date,
    'to_date', p_to_date,
    'opening_balance_paise', v_opening_balance_paise,
    'total_purchases_paise', v_period_credits_paise,
    'total_payments_paise', v_period_debits_paise,
    'closing_balance_paise', v_closing_balance_paise,
    'entries', v_entries
  );
END;
$$;

-- ============================================================================
-- 13. OWNER-ONLY ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Cattle Feed Exclusive and Owner Only
-- ============================================================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_opening_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_load_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_advance_credits ENABLE ROW LEVEL SECURITY;

-- 1. Suppliers
CREATE POLICY "suppliers_owner_all" ON public.suppliers
  FOR ALL TO authenticated
  USING (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  )
  WITH CHECK (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  );

-- 2. Supplier Opening Balances
CREATE POLICY "supplier_opening_balances_owner_all" ON public.supplier_opening_balances
  FOR ALL TO authenticated
  USING (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  )
  WITH CHECK (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  );

-- 3. Purchase Order Sequences
CREATE POLICY "purchase_order_sequences_owner_all" ON public.purchase_order_sequences
  FOR ALL TO authenticated
  USING (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  )
  WITH CHECK (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  );

-- 4. Purchase Orders
CREATE POLICY "purchase_orders_owner_all" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  )
  WITH CHECK (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  );

-- 5. Purchase Order Items (Linked via order_id -> purchase_orders)
CREATE POLICY "purchase_order_items_owner_all" ON public.purchase_order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.order_id
        AND public.is_cattle_feed_business(po.business_id)
        AND public.is_business_owner(po.business_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.order_id
        AND public.is_cattle_feed_business(po.business_id)
        AND public.is_business_owner(po.business_id, auth.uid())
    )
  );

-- 6. Purchase Order Status History
CREATE POLICY "purchase_order_status_history_owner_all" ON public.purchase_order_status_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_status_history.order_id
        AND public.is_cattle_feed_business(po.business_id)
        AND public.is_business_owner(po.business_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_status_history.order_id
        AND public.is_cattle_feed_business(po.business_id)
        AND public.is_business_owner(po.business_id, auth.uid())
    )
  );

-- 7. Purchase Load Costs
CREATE POLICY "purchase_load_costs_owner_all" ON public.purchase_load_costs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_load_costs.order_id
        AND public.is_cattle_feed_business(po.business_id)
        AND public.is_business_owner(po.business_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_load_costs.order_id
        AND public.is_cattle_feed_business(po.business_id)
        AND public.is_business_owner(po.business_id, auth.uid())
    )
  );

-- 8. Supplier Ledger Entries
CREATE POLICY "supplier_ledger_entries_owner_all" ON public.supplier_ledger_entries
  FOR ALL TO authenticated
  USING (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  )
  WITH CHECK (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  );

-- 9. Supplier Payments
CREATE POLICY "supplier_payments_owner_all" ON public.supplier_payments
  FOR ALL TO authenticated
  USING (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  )
  WITH CHECK (
    public.is_cattle_feed_business(business_id)
    AND public.is_business_owner(business_id, auth.uid())
  );

-- 10. Supplier Payment Allocations
CREATE POLICY "supplier_payment_allocations_owner_all" ON public.supplier_payment_allocations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_payments sp
      WHERE sp.id = supplier_payment_allocations.payment_id
        AND public.is_cattle_feed_business(sp.business_id)
        AND public.is_business_owner(sp.business_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supplier_payments sp
      WHERE sp.id = supplier_payment_allocations.payment_id
        AND public.is_cattle_feed_business(sp.business_id)
        AND public.is_business_owner(sp.business_id, auth.uid())
    )
  );

-- 11. Supplier Advance Credits
CREATE POLICY "supplier_advance_credits_owner_all" ON public.supplier_advance_credits
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
REVOKE ALL ON FUNCTION public.allocate_purchase_order_number(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_purchase_order_number(UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.transition_purchase_order_status(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_purchase_order_status(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_supplier_payment(UUID, UUID, BIGINT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment(UUID, UUID, BIGINT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_supplier_account_statement(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_supplier_account_statement(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

