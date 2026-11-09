-- Migration: 00007_communication_engine
-- Communication & WhatsApp Automation Engine for Rushi CRM Platform v2.0
--
-- Features 6, 12, 13, 14, 21, 22, 23, 24, 25, 28:
-- 1. message_mode_settings (Business-scoped transport mode and recurrence settings)
-- 2. reminder_rules (Customer-level 7-day recurrence overrides, promise dates, suppression)
-- 3. material_alerts (5-day pre-finish Cattle Feed consumption alerts)
-- 4. message_templates (Bilingual server-owned templates)
-- 5. message_jobs (Centralized durable queue with unique idempotency keys)
-- 6. message_attempts (Audit log of transmissions and handoffs)
-- 7. campaigns & campaign_recipients (Targeted broadcasts, cross-business isolation)
-- 8. delivery_trips & delivery_trip_stops (Logistics planning without auto-billing)
-- 9. Non-recursive RLS policies and RPC functions

-- ============================================================================
-- 1. MESSAGE MODE SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_mode_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payment_reminders_mode TEXT NOT NULL DEFAULT 'manual_handoff' CHECK (payment_reminders_mode IN ('manual_handoff', 'official_api')),
  birthdays_mode TEXT NOT NULL DEFAULT 'manual_handoff' CHECK (birthdays_mode IN ('manual_handoff', 'official_api')),
  festival_wishes_mode TEXT NOT NULL DEFAULT 'manual_handoff' CHECK (festival_wishes_mode IN ('manual_handoff', 'official_api')),
  delivery_announcements_mode TEXT NOT NULL DEFAULT 'manual_handoff' CHECK (delivery_announcements_mode IN ('manual_handoff', 'official_api')),
  custom_campaigns_mode TEXT NOT NULL DEFAULT 'manual_handoff' CHECK (custom_campaigns_mode IN ('manual_handoff', 'official_api')),
  default_payment_reminder_interval_days INT NOT NULL DEFAULT 7 CHECK (default_payment_reminder_interval_days >= 1),
  material_alert_days_before INT NOT NULL DEFAULT 5 CHECK (material_alert_days_before >= 1),
  official_api_configured BOOLEAN NOT NULL DEFAULT false,
  official_api_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_mode_settings_business UNIQUE (business_id)
);

CREATE INDEX IF NOT EXISTS idx_message_mode_settings_business ON public.message_mode_settings(business_id);

-- ============================================================================
-- 2. REMINDER RULES & OVERRIDES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  interval_days INT NOT NULL DEFAULT 7 CHECK (interval_days >= 1),
  promise_date DATE,
  is_suppressed BOOLEAN NOT NULL DEFAULT false,
  suppression_reason TEXT,
  notes TEXT,
  last_reminded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_reminder_rules_customer UNIQUE (business_id, customer_id),
  CONSTRAINT reminder_rules_cattle_feed_only CHECK (public.is_cattle_feed_business(business_id))
);

CREATE INDEX IF NOT EXISTS idx_reminder_rules_business ON public.reminder_rules(business_id);
CREATE INDEX IF NOT EXISTS idx_reminder_rules_customer ON public.reminder_rules(customer_id);

-- ============================================================================
-- 3. MATERIAL ALERTS (Feed-Finish Alerts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.material_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity_bags NUMERIC(10, 2) NOT NULL CHECK (quantity_bags > 0),
  herd_size INT NOT NULL DEFAULT 1 CHECK (herd_size >= 1),
  daily_feeding_rate_kg NUMERIC(6, 2) NOT NULL DEFAULT 5.0 CHECK (daily_feeding_rate_kg > 0),
  estimated_duration_days INT NOT NULL CHECK (estimated_duration_days >= 1),
  bill_date DATE NOT NULL,
  expected_finish_date DATE NOT NULL,
  alert_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'suppressed', 'superseded')),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT material_alerts_cattle_feed_only CHECK (public.is_cattle_feed_business(business_id))
);

CREATE INDEX IF NOT EXISTS idx_material_alerts_business ON public.material_alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_material_alerts_customer ON public.material_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_material_alerts_dates ON public.material_alerts(alert_date, status);

-- ============================================================================
-- 4. MESSAGE TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN (
    'payment_reminder',
    'material_finish',
    'birthday',
    'festival',
    'delivery_notice',
    'custom_broadcast',
    'pvc_promo'
  )),
  language TEXT NOT NULL DEFAULT 'mr' CHECK (language IN ('mr', 'en')),
  template_title TEXT NOT NULL,
  template_body TEXT NOT NULL,
  is_system_default BOOLEAN NOT NULL DEFAULT true,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_template UNIQUE (business_id, workflow_type, language, template_title)
);

CREATE INDEX IF NOT EXISTS idx_message_templates_lookup ON public.message_templates(business_id, workflow_type, language);

-- ============================================================================
-- 5. CENTRALIZED MESSAGE JOBS QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN (
    'payment_reminder',
    'material_finish',
    'birthday',
    'festival',
    'delivery_notice',
    'custom_broadcast',
    'pvc_promo'
  )),
  transport_mode TEXT NOT NULL DEFAULT 'manual_handoff' CHECK (transport_mode IN ('manual_handoff', 'official_api')),
  scheduled_date DATE NOT NULL,
  idempotency_key TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_owner_action' CHECK (status IN (
    'queued',
    'awaiting_owner_action',
    'prepared',
    'opened',
    'owner_marked_sent',
    'submitted_to_provider',
    'sent',
    'delivered',
    'failed',
    'cancelled',
    'suppressed'
  )),
  context_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  opened_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_job_idempotency UNIQUE (business_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_message_jobs_business_status ON public.message_jobs(business_id, status);
CREATE INDEX IF NOT EXISTS idx_message_jobs_scheduled ON public.message_jobs(business_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_message_jobs_customer ON public.message_jobs(customer_id);

-- ============================================================================
-- 6. MESSAGE ATTEMPTS AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.message_jobs(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('opened_handoff', 'marked_sent', 'api_submit', 'webhook_delivered', 'failed', 'cancelled')),
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attempts_job ON public.message_attempts(job_id);

-- ============================================================================
-- 7. CAMPAIGNS & BROADCAST RECIPIENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('festival', 'cattle_feed_launch', 'pvc_promo', 'custom')),
  target_audience_type TEXT NOT NULL CHECK (target_audience_type IN ('all_active', 'group', 'area', 'selected_ids')),
  target_group_id UUID REFERENCES public.customer_groups(id) ON DELETE SET NULL,
  target_area TEXT,
  message_template TEXT NOT NULL,
  total_recipients INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_business ON public.campaigns(business_id);

CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  job_id UUID REFERENCES public.message_jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'failed', 'suppressed', 'opted_out')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_campaign_recipient UNIQUE (campaign_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);

-- ============================================================================
-- 8. DELIVERY TRIPS & LOGISTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  trip_number TEXT NOT NULL,
  trip_date DATE NOT NULL,
  driver_name TEXT,
  vehicle_number TEXT,
  area TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_transit', 'completed', 'cancelled')),
  total_stops INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_delivery_trip_number UNIQUE (business_id, trip_number)
);

CREATE INDEX IF NOT EXISTS idx_delivery_trips_business ON public.delivery_trips(business_id);

CREATE TABLE IF NOT EXISTS public.delivery_trip_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.delivery_trips(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  stop_order INT NOT NULL DEFAULT 1,
  load_description TEXT NOT NULL,
  bag_count INT NOT NULL DEFAULT 0,
  job_id UUID REFERENCES public.message_jobs(id) ON DELETE SET NULL,
  is_notified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'rescheduled', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_trip_customer_stop UNIQUE (trip_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_trip_stops_trip ON public.delivery_trip_stops(trip_id);

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.message_mode_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_trip_stops ENABLE ROW LEVEL SECURITY;

-- Settings: Members can view, owners can manage
CREATE POLICY "Members can view message settings"
  ON public.message_mode_settings FOR SELECT TO authenticated
  USING (public.has_business_membership(business_id, auth.uid()));

CREATE POLICY "Owners can manage message settings"
  ON public.message_mode_settings FOR ALL TO authenticated
  USING (public.is_business_owner(business_id, auth.uid()))
  WITH CHECK (public.is_business_owner(business_id, auth.uid()));

-- Reminder Rules & Material Alerts: Cattle Feed ONLY
CREATE POLICY "Members can view reminder rules"
  ON public.reminder_rules FOR SELECT TO authenticated
  USING (
    public.has_business_membership(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

CREATE POLICY "Members can manage reminder rules"
  ON public.reminder_rules FOR ALL TO authenticated
  USING (
    public.has_business_membership(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  )
  WITH CHECK (
    public.has_business_membership(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

CREATE POLICY "Members can view material alerts"
  ON public.material_alerts FOR SELECT TO authenticated
  USING (
    public.has_business_membership(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

CREATE POLICY "Members can manage material alerts"
  ON public.material_alerts FOR ALL TO authenticated
  USING (
    public.has_business_membership(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  )
  WITH CHECK (
    public.has_business_membership(business_id, auth.uid())
    AND public.is_cattle_feed_business(business_id)
  );

-- Message Jobs & Attempts
CREATE POLICY "Members can view message jobs"
  ON public.message_jobs FOR SELECT TO authenticated
  USING (public.has_business_membership(business_id, auth.uid()));

CREATE POLICY "Members can manage message jobs"
  ON public.message_jobs FOR ALL TO authenticated
  USING (public.has_business_membership(business_id, auth.uid()))
  WITH CHECK (public.has_business_membership(business_id, auth.uid()));

CREATE POLICY "Members can view message attempts"
  ON public.message_attempts FOR SELECT TO authenticated
  USING (public.has_business_membership(business_id, auth.uid()));

CREATE POLICY "Members can insert message attempts"
  ON public.message_attempts FOR INSERT TO authenticated
  WITH CHECK (public.has_business_membership(business_id, auth.uid()));

-- Templates & Campaigns
CREATE POLICY "Members can view message templates"
  ON public.message_templates FOR SELECT TO authenticated
  USING (public.has_business_membership(business_id, auth.uid()));

CREATE POLICY "Owners can manage message templates"
  ON public.message_templates FOR ALL TO authenticated
  USING (public.is_business_owner(business_id, auth.uid()))
  WITH CHECK (public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "Members can view campaigns"
  ON public.campaigns FOR SELECT TO authenticated
  USING (public.has_business_membership(business_id, auth.uid()));

CREATE POLICY "Members can manage campaigns"
  ON public.campaigns FOR ALL TO authenticated
  USING (public.has_business_membership(business_id, auth.uid()))
  WITH CHECK (public.has_business_membership(business_id, auth.uid()));

CREATE POLICY "Members can view campaign recipients"
  ON public.campaign_recipients FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_recipients.campaign_id
      AND public.has_business_membership(c.business_id, auth.uid())
  ));

CREATE POLICY "Members can manage campaign recipients"
  ON public.campaign_recipients FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_recipients.campaign_id
      AND public.has_business_membership(c.business_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_recipients.campaign_id
      AND public.has_business_membership(c.business_id, auth.uid())
  ));

-- Delivery Trips
CREATE POLICY "Members can view delivery trips"
  ON public.delivery_trips FOR SELECT TO authenticated
  USING (public.has_business_membership(business_id, auth.uid()));

CREATE POLICY "Members can manage delivery trips"
  ON public.delivery_trips FOR ALL TO authenticated
  USING (public.has_business_membership(business_id, auth.uid()))
  WITH CHECK (public.has_business_membership(business_id, auth.uid()));

CREATE POLICY "Members can view delivery trip stops"
  ON public.delivery_trip_stops FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.delivery_trips t
    WHERE t.id = delivery_trip_stops.trip_id
      AND public.has_business_membership(t.business_id, auth.uid())
  ));

CREATE POLICY "Members can manage delivery trip stops"
  ON public.delivery_trip_stops FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.delivery_trips t
    WHERE t.id = delivery_trip_stops.trip_id
      AND public.has_business_membership(t.business_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.delivery_trips t
    WHERE t.id = delivery_trip_stops.trip_id
      AND public.has_business_membership(t.business_id, auth.uid())
  ));

-- ============================================================================
-- 10. RPC FUNCTIONS
-- ============================================================================

-- Function to mark a message job as opened in WhatsApp handoff
CREATE OR REPLACE FUNCTION public.mark_message_job_opened(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_biz_id UUID;
BEGIN
  SELECT business_id INTO v_biz_id FROM public.message_jobs WHERE id = p_job_id;
  IF v_biz_id IS NULL OR NOT public.has_business_membership(v_biz_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.message_jobs
  SET status = 'opened',
      opened_at = now(),
      updated_at = now()
  WHERE id = p_job_id
    AND status IN ('queued', 'awaiting_owner_action', 'prepared');

  INSERT INTO public.message_attempts (
    job_id,
    business_id,
    action_type,
    performed_by,
    details
  ) VALUES (
    p_job_id,
    v_biz_id,
    'opened_handoff',
    auth.uid(),
    jsonb_build_object('timestamp', now())
  );
END;
$$;

-- Function to mark a message job as human-confirmed sent
CREATE OR REPLACE FUNCTION public.mark_message_job_sent(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_biz_id UUID;
BEGIN
  SELECT business_id INTO v_biz_id FROM public.message_jobs WHERE id = p_job_id;
  IF v_biz_id IS NULL OR NOT public.has_business_membership(v_biz_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.message_jobs
  SET status = 'owner_marked_sent',
      sent_at = now(),
      updated_at = now()
  WHERE id = p_job_id
    AND status IN ('opened', 'prepared', 'awaiting_owner_action');

  INSERT INTO public.message_attempts (
    job_id,
    business_id,
    action_type,
    performed_by,
    details
  ) VALUES (
    p_job_id,
    v_biz_id,
    'marked_sent',
    auth.uid(),
    jsonb_build_object('timestamp', now())
  );
END;
$$;

