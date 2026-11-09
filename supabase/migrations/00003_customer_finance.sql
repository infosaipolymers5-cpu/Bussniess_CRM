-- Migration: 00003_customer_finance
-- Customer Financial Engine for Rushi CRM Platform v2.0 (Cattle Feed Exclusive)
--
-- Tables:
-- 1. products (Cattle Feed product catalogue with pricing in integer paise)
-- 2. customer_rates (Customer-specific price overrides)
-- 3. bill_sequences (Locked FY sequence counters for sequential bill numbers)
-- 4. bills (Cattle Feed bills with line items, due dates, paise arithmetic)
-- 5. bill_items (Immutable snapshot of product, unit, quantity, unit price)
-- 6. bill_revisions (Audit trail of bill adjustments)
-- 7. customer_ledger_entries (Append-only immutable customer ledger)
-- 8. customer_payments (Payment receipts with payment mode)
-- 9. payment_allocations (FIFO allocation against open bills)
-- 10. advance_credits (Excess payment tracking for future invoices)

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if business is cattle feed
CREATE OR REPLACE FUNCTION public.is_cattle_feed_business(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id AND kind = 'cattle_feed'
  );
$$;

-- Compute Indian Financial Year (1 April - 31 March) in Asia/Kolkata
CREATE OR REPLACE FUNCTION public.get_financial_year(p_date TIMESTAMPTZ DEFAULT now())
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_local_date DATE;
  v_year INT;
  v_month INT;
  v_start_year INT;
  v_next_year_suffix TEXT;
BEGIN
  v_local_date := (p_date AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_year := EXTRACT(YEAR FROM v_local_date)::INT;
  v_month := EXTRACT(MONTH FROM v_local_date)::INT;

  IF v_month >= 4 THEN
    v_start_year := v_year;
  ELSE
    v_start_year := v_year - 1;
  END IF;

  v_next_year_suffix := lpad(((v_start_year + 1) % 100)::TEXT, 2, '0');
  RETURN v_start_year::TEXT || '-' || v_next_year_suffix;
END;
$$;

-- ============================================================================
-- 1. PRODUCTS (Cattle Feed Catalogue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 200),
  code TEXT CHECK (code IS NULL OR (char_length(trim(code)) >= 1 AND char_length(code) <= 50)),
  unit TEXT NOT NULL CHECK (unit IN ('bag', 'kg', 'quintal', 'unit', 'other')),
  default_price_paise BIGINT NOT NULL CHECK (default_price_paise >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_business_active ON public.products(business_id, is_active);

-- ============================================================================
-- 2. CUSTOMER RATES (Customer-Specific Overrides)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  special_price_paise BIGINT NOT NULL CHECK (special_price_paise >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_customer_product UNIQUE (business_id, customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_rates_lookup ON public.customer_rates(business_id, customer_id, product_id);

-- ============================================================================
-- 3. BILL SEQUENCES (Financial Year Atomic Numbering)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bill_sequences (
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  financial_year TEXT NOT NULL,
  last_sequence_number INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, financial_year)
);

-- Sequence Allocation Function
CREATE OR REPLACE FUNCTION public.allocate_bill_number(
  p_business_id UUID,
  p_financial_year TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_seq INT;
  v_formatted TEXT;
BEGIN
  -- Insert sequence row if not present
  INSERT INTO public.bill_sequences (business_id, financial_year, last_sequence_number, updated_at)
  VALUES (p_business_id, p_financial_year, 0, now())
  ON CONFLICT (business_id, financial_year) DO NOTHING;

  -- Lock row and increment
  UPDATE public.bill_sequences
  SET last_sequence_number = last_sequence_number + 1,
      updated_at = now()
  WHERE business_id = p_business_id AND financial_year = p_financial_year
  RETURNING last_sequence_number INTO v_next_seq;

  v_formatted := 'CF-' || p_financial_year || '-' || lpad(v_next_seq::TEXT, 4, '0');
  RETURN v_formatted;
END;
$$;

-- ============================================================================
-- 4. BILLS (Cattle Feed Invoices)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  bill_number TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal_paise BIGINT NOT NULL CHECK (subtotal_paise >= 0),
  discount_paise BIGINT NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  total_amount_paise BIGINT NOT NULL CHECK (total_amount_paise >= 0),
  paid_now_paise BIGINT NOT NULL DEFAULT 0 CHECK (paid_now_paise >= 0),
  balance_due_paise BIGINT NOT NULL CHECK (balance_due_paise >= 0),
  status TEXT NOT NULL CHECK (status IN ('issued', 'partially_paid', 'paid', 'revised', 'cancelled')) DEFAULT 'issued',
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_bill_number UNIQUE (business_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_bills_customer ON public.bills(business_id, customer_id, bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(business_id, status);

-- ============================================================================
-- 5. BILL ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  unit_snapshot TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price_paise BIGINT NOT NULL CHECK (unit_price_paise >= 0),
  total_paise BIGINT NOT NULL CHECK (total_paise >= 0),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON public.bill_items(bill_id, sort_order);

-- ============================================================================
-- 6. BILL REVISIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bill_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  revision_number INT NOT NULL,
  previous_subtotal_paise BIGINT NOT NULL,
  previous_total_amount_paise BIGINT NOT NULL,
  new_total_amount_paise BIGINT NOT NULL,
  reason TEXT NOT NULL,
  revised_by UUID REFERENCES auth.users(id),
  revised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot JSONB NOT NULL
);

-- ============================================================================
-- 7. CUSTOMER LEDGER ENTRIES (Append-Only Accounting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'opening_balance',
    'bill_charge',
    'payment',
    'advance_applied',
    'bill_cancellation',
    'revision_delta'
  )),
  reference_id UUID,
  reference_number TEXT,
  debit_paise BIGINT NOT NULL DEFAULT 0 CHECK (debit_paise >= 0),
  credit_paise BIGINT NOT NULL DEFAULT 0 CHECK (credit_paise >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ledger_positive_entry CHECK (debit_paise > 0 OR credit_paise > 0)
);

CREATE INDEX IF NOT EXISTS idx_ledger_customer ON public.customer_ledger_entries(business_id, customer_id, entry_date, created_at);

-- ============================================================================
-- 8. CUSTOMER PAYMENTS (Receipts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  receipt_number TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'other')),
  reference_details TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_receipt_number UNIQUE (business_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.customer_payments(business_id, customer_id, payment_date DESC);

-- ============================================================================
-- 9. PAYMENT ALLOCATIONS (FIFO to Bills)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.customer_payments(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  allocated_paise BIGINT NOT NULL CHECK (allocated_paise > 0),
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_bill ON public.payment_allocations(bill_id);

-- ============================================================================
-- 10. ADVANCE CREDITS (Excess Payment Storage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.advance_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  source_payment_id UUID NOT NULL REFERENCES public.customer_payments(id) ON DELETE CASCADE,
  original_amount_paise BIGINT NOT NULL CHECK (original_amount_paise > 0),
  remaining_amount_paise BIGINT NOT NULL CHECK (remaining_amount_paise >= 0),
  status TEXT NOT NULL CHECK (status IN ('available', 'exhausted')) DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advance_credits_customer ON public.advance_credits(business_id, customer_id, status);

-- ============================================================================
-- TRANSACTIONAL RPC FUNCTIONS
-- ============================================================================

-- Record Payment and Distribute via FIFO
CREATE OR REPLACE FUNCTION public.record_customer_payment(
  p_business_id UUID,
  p_customer_id UUID,
  p_amount_paise BIGINT,
  p_payment_method TEXT,
  p_reference_details TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_payment_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_receipt_number TEXT;
  v_payment_id UUID;
  v_remaining_paise BIGINT;
  v_bill RECORD;
  v_to_allocate BIGINT;
  v_actor_id UUID;
  v_fy TEXT;
BEGIN
  v_actor_id := auth.uid();

  -- Verify business is Cattle Feed
  IF NOT public.is_cattle_feed_business(p_business_id) THEN
    RAISE EXCEPTION 'Payments and ledger are strictly Cattle Feed operations';
  END IF;

  -- Verify membership
  IF NOT public.is_business_member(p_business_id, v_actor_id) THEN
    RAISE EXCEPTION 'Access denied: not an active member of this business';
  END IF;

  IF p_amount_paise <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than 0';
  END IF;

  v_fy := public.get_financial_year(p_payment_date::TIMESTAMPTZ);
  v_receipt_number := 'RCP-' || v_fy || '-' || to_char(now(), 'MMDD') || '-' || substr(gen_random_uuid()::text, 1, 6);

  -- Insert payment
  INSERT INTO public.customer_payments (
    business_id,
    customer_id,
    receipt_number,
    payment_date,
    amount_paise,
    payment_method,
    reference_details,
    notes,
    created_by
  ) VALUES (
    p_business_id,
    p_customer_id,
    v_receipt_number,
    p_payment_date,
    p_amount_paise,
    p_payment_method,
    p_reference_details,
    p_notes,
    v_actor_id
  )
  RETURNING id INTO v_payment_id;

  -- Post Credit to Customer Ledger
  INSERT INTO public.customer_ledger_entries (
    business_id,
    customer_id,
    entry_date,
    entry_type,
    reference_id,
    reference_number,
    debit_paise,
    credit_paise,
    notes
  ) VALUES (
    p_business_id,
    p_customer_id,
    p_payment_date,
    'payment',
    v_payment_id,
    v_receipt_number,
    0,
    p_amount_paise,
    p_notes
  );

  -- FIFO Bill Allocation
  v_remaining_paise := p_amount_paise;

  FOR v_bill IN
    SELECT id, balance_due_paise
    FROM public.bills
    WHERE business_id = p_business_id
      AND customer_id = p_customer_id
      AND status IN ('issued', 'partially_paid')
      AND balance_due_paise > 0
    ORDER BY bill_date ASC, created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_paise <= 0;

    v_to_allocate := LEAST(v_remaining_paise, v_bill.balance_due_paise);

    -- Insert allocation
    INSERT INTO public.payment_allocations (payment_id, bill_id, allocated_paise)
    VALUES (v_payment_id, v_bill.id, v_to_allocate);

    -- Update bill balance & status
    UPDATE public.bills
    SET balance_due_paise = balance_due_paise - v_to_allocate,
        status = CASE
          WHEN balance_due_paise - v_to_allocate = 0 THEN 'paid'
          ELSE 'partially_paid'
        END,
        updated_at = now()
    WHERE id = v_bill.id;

    v_remaining_paise := v_remaining_paise - v_to_allocate;
  END LOOP;

  -- If any remaining amount, store as advance credit
  IF v_remaining_paise > 0 THEN
    INSERT INTO public.advance_credits (
      business_id,
      customer_id,
      source_payment_id,
      original_amount_paise,
      remaining_amount_paise,
      status
    ) VALUES (
      p_business_id,
      p_customer_id,
      v_payment_id,
      v_remaining_paise,
      v_remaining_paise,
      'available'
    );
  END IF;

  -- Record audit event
  PERFORM public.record_audit_event(
    p_business_id,
    'customer_payment_recorded',
    'customer_payment',
    v_payment_id::text,
    jsonb_build_object(
      'amount_paise', p_amount_paise,
      'receipt_number', v_receipt_number,
      'advance_paise', v_remaining_paise
    )
  );

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'receipt_number', v_receipt_number,
    'amount_paise', p_amount_paise,
    'allocated_paise', p_amount_paise - v_remaining_paise,
    'advance_paise', v_remaining_paise
  );
END;
$$;

-- Owner Cancellation of Cattle Feed Bill
CREATE OR REPLACE FUNCTION public.cancel_cattle_feed_bill(
  p_business_id UUID,
  p_bill_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bill RECORD;
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();

  -- Verify owner status
  IF NOT public.is_business_owner(p_business_id, v_actor_id) THEN
    RAISE EXCEPTION 'Only business owners can cancel posted bills';
  END IF;

  -- Select bill under lock
  SELECT * INTO v_bill
  FROM public.bills
  WHERE id = p_bill_id AND business_id = p_business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  IF v_bill.status = 'cancelled' THEN
    RAISE EXCEPTION 'Bill is already cancelled';
  END IF;

  -- Update bill to cancelled
  UPDATE public.bills
  SET status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_by = v_actor_id,
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_bill_id;

  -- Post Reversal Credit Entry to Customer Ledger (neutralizing the original charge)
  INSERT INTO public.customer_ledger_entries (
    business_id,
    customer_id,
    entry_date,
    entry_type,
    reference_id,
    reference_number,
    debit_paise,
    credit_paise,
    notes
  ) VALUES (
    p_business_id,
    v_bill.customer_id,
    CURRENT_DATE,
    'bill_cancellation',
    v_bill.id,
    v_bill.bill_number,
    0,
    v_bill.total_amount_paise,
    'Cancellation reason: ' || p_reason
  );

  -- Audit event
  PERFORM public.record_audit_event(
    p_business_id,
    'bill_cancelled',
    'bill',
    p_bill_id::text,
    jsonb_build_object(
      'bill_number', v_bill.bill_number,
      'reversed_amount_paise', v_bill.total_amount_paise,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'bill_id', p_bill_id,
    'status', 'cancelled',
    'bill_number', v_bill.bill_number,
    'reversed_amount_paise', v_bill.total_amount_paise
  );
END;
$$;

-- Khate Utara (Account Statement) Report Function
CREATE OR REPLACE FUNCTION public.get_customer_khate_utara(
  p_business_id UUID,
  p_customer_id UUID,
  p_from_date DATE,
  p_to_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_opening_balance_paise BIGINT;
  v_entries JSONB;
BEGIN
  -- Verify membership
  IF NOT public.is_business_member(p_business_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Compute opening balance strictly before p_from_date
  SELECT COALESCE(SUM(debit_paise - credit_paise), 0)
  INTO v_opening_balance_paise
  FROM public.customer_ledger_entries
  WHERE business_id = p_business_id
    AND customer_id = p_customer_id
    AND entry_date < p_from_date;

  -- Collect statement entries
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'entry_date', entry_date,
      'entry_type', entry_type,
      'reference_id', reference_id,
      'reference_number', reference_number,
      'debit_paise', debit_paise,
      'credit_paise', credit_paise,
      'notes', notes,
      'created_at', created_at
    ) ORDER BY entry_date ASC, created_at ASC
  )
  INTO v_entries
  FROM public.customer_ledger_entries
  WHERE business_id = p_business_id
    AND customer_id = p_customer_id
    AND entry_date >= p_from_date
    AND entry_date <= p_to_date;

  RETURN jsonb_build_object(
    'customer_id', p_customer_id,
    'from_date', p_from_date,
    'to_date', p_to_date,
    'opening_balance_paise', v_opening_balance_paise,
    'entries', COALESCE(v_entries, '[]'::jsonb)
  );
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_credits ENABLE ROW LEVEL SECURITY;

-- Products Policies (Cattle Feed Exclusive)
CREATE POLICY "products_select" ON public.products
  FOR SELECT TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

CREATE POLICY "products_update" ON public.products
  FOR UPDATE TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  )
  WITH CHECK (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

-- Customer Rates Policies
CREATE POLICY "customer_rates_all" ON public.customer_rates
  FOR ALL TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  )
  WITH CHECK (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

-- Bills Policies (Cattle Feed Exclusive)
CREATE POLICY "bills_select" ON public.bills
  FOR SELECT TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

CREATE POLICY "bills_insert" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

CREATE POLICY "bills_update" ON public.bills
  FOR UPDATE TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  )
  WITH CHECK (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

-- Bill Items Policies
CREATE POLICY "bill_items_select" ON public.bill_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_items.bill_id
        AND public.is_business_member(b.business_id, auth.uid())
        AND public.is_cattle_feed_business(b.business_id)
    )
  );

CREATE POLICY "bill_items_insert" ON public.bill_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_items.bill_id
        AND public.is_business_member(b.business_id, auth.uid())
        AND public.is_cattle_feed_business(b.business_id)
    )
  );

-- Bill Revisions Policies
CREATE POLICY "bill_revisions_select" ON public.bill_revisions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_revisions.bill_id
        AND public.is_business_member(b.business_id, auth.uid())
        AND public.is_cattle_feed_business(b.business_id)
    )
  );

CREATE POLICY "bill_revisions_insert" ON public.bill_revisions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_revisions.bill_id
        AND public.is_business_member(b.business_id, auth.uid())
        AND public.is_cattle_feed_business(b.business_id)
    )
  );

-- Customer Ledger Policies (Immutable Append-Only)
CREATE POLICY "ledger_select" ON public.customer_ledger_entries
  FOR SELECT TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

CREATE POLICY "ledger_insert" ON public.customer_ledger_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

-- Customer Payments Policies
CREATE POLICY "payments_select" ON public.customer_payments
  FOR SELECT TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

CREATE POLICY "payments_insert" ON public.customer_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

-- Payment Allocations Policies
CREATE POLICY "allocations_select" ON public.payment_allocations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_payments p
      WHERE p.id = payment_allocations.payment_id
        AND public.is_business_member(p.business_id, auth.uid())
        AND public.is_cattle_feed_business(p.business_id)
    )
  );

CREATE POLICY "allocations_insert" ON public.payment_allocations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_payments p
      WHERE p.id = payment_allocations.payment_id
        AND public.is_business_member(p.business_id, auth.uid())
        AND public.is_cattle_feed_business(p.business_id)
    )
  );

-- Advance Credits Policies
CREATE POLICY "advance_credits_select" ON public.advance_credits
  FOR SELECT TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

CREATE POLICY "advance_credits_insert" ON public.advance_credits
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

CREATE POLICY "advance_credits_update" ON public.advance_credits
  FOR UPDATE TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  )
  WITH CHECK (
    public.is_business_member(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

