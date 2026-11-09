/**
 * Database Types for Rushi CRM Platform v2.0
 * Includes Stage 1 Identity/Access & Stage 2 CRM & Marketing Foundation.
 */

/** Business kind discriminator */
export type BusinessKind = 'cattle_feed' | 'pvc';

/** Role within a business */
export type MemberRole = 'owner' | 'staff' | 'viewer';

/** Communication channel */
export type CommunicationChannel = 'whatsapp' | 'sms' | 'call';

/** Duplicate review resolution status */
export type DuplicateReviewStatus = 'pending' | 'approved_distinct' | 'skipped';

/** QR Registration status */
export type QrRegistrationStatus = 'pending_review' | 'converted' | 'rejected';

/** Stage 3 Customer Financial Types */
export type ProductUnit = 'bag' | 'kg' | 'quintal' | 'unit' | 'other';
export type BillStatus = 'issued' | 'partially_paid' | 'paid' | 'revised' | 'cancelled';
export type LedgerEntryType =
  | 'opening_balance'
  | 'bill_charge'
  | 'payment'
  | 'advance_applied'
  | 'bill_cancellation'
  | 'revision_delta';
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
export type AdvanceCreditStatus = 'available' | 'exhausted';

/** Stage 4 Supplier & Cost Types */
export type PurchaseOrderStatus =
  'draft' | 'ordered' | 'dispatched' | 'received' | 'cancelled';
export type SupplierLedgerEntryType =
  'opening_balance' | 'purchase' | 'payment' | 'advance' | 'adjustment' | 'reversal';
export type LoadCostAllocationMethod = 'by_bags' | 'by_value';

/** Stage 1 Identity Tables */
export type Business = {
  id: string;
  kind: BusinessKind;
  name: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  preferred_locale: string;
  created_at: string;
  updated_at: string;
};

export type BusinessMembership = {
  id: string;
  user_id: string;
  business_id: string;
  role: MemberRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RolePermission = {
  id: string;
  membership_id: string;
  permission: string;
  granted_by: string;
  created_at: string;
};

export type AuditEvent = {
  id: string;
  business_id: string | null;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

/** Stage 2 CRM Tables */
export type Customer = {
  id: string;
  business_id: string;
  name: string;
  display_phone: string;
  normalized_phone: string;
  date_of_birth: string | null;
  area: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerPreferences = {
  id: string;
  customer_id: string;
  opted_out_marketing: boolean;
  opted_out_transactional: boolean;
  preferred_channel: CommunicationChannel;
  updated_at: string;
};

export type CustomerNote = {
  id: string;
  customer_id: string;
  author_id: string;
  content: string;
  call_date: string;
  promise_to_pay_date: string | null;
  created_at: string;
};

export type CustomerGroup = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type CustomerGroupMember = {
  group_id: string;
  customer_id: string;
  added_at: string;
};

export type Tag = {
  id: string;
  business_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type CustomerTag = {
  tag_id: string;
  customer_id: string;
};

export type DuplicateReview = {
  id: string;
  business_id: string;
  normalized_phone: string;
  existing_customer_id: string;
  incoming_customer_data: Record<string, unknown>;
  status: DuplicateReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type OpeningBalanceImport = {
  id: string;
  business_id: string;
  batch_id: string;
  customer_id: string;
  amount_paise: number;
  provenance_file: string;
  provenance_row: number;
  notes: string | null;
  created_at: string;
};

export type PublicQrRegistration = {
  id: string;
  business_id: string;
  name: string;
  whatsapp_phone: string;
  normalized_phone: string;
  date_of_birth: string;
  category_interest: string | null;
  consent_recorded: boolean;
  status: QrRegistrationStatus;
  created_at: string;
};

/** Stage 3 Financial Tables */
export type Product = {
  id: string;
  business_id: string;
  name: string;
  code: string | null;
  unit: ProductUnit;
  default_price_paise: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerRate = {
  id: string;
  business_id: string;
  customer_id: string;
  product_id: string;
  special_price_paise: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BillSequence = {
  business_id: string;
  financial_year: string;
  last_sequence_number: number;
  updated_at: string;
};

export type Bill = {
  id: string;
  business_id: string;
  customer_id: string;
  bill_number: string;
  financial_year: string;
  bill_date: string;
  due_date: string | null;
  subtotal_paise: number;
  discount_paise: number;
  total_amount_paise: number;
  paid_now_paise: number;
  balance_due_paise: number;
  status: BillStatus;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BillItem = {
  id: string;
  bill_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_snapshot: string;
  quantity: number;
  unit_price_paise: number;
  total_paise: number;
  sort_order: number;
  created_at: string;
};

export type BillRevision = {
  id: string;
  bill_id: string;
  revision_number: number;
  previous_subtotal_paise: number;
  previous_total_amount_paise: number;
  new_total_amount_paise: number;
  reason: string;
  revised_by: string | null;
  revised_at: string;
  snapshot: Record<string, unknown>;
};

export type CustomerLedgerEntry = {
  id: string;
  business_id: string;
  customer_id: string;
  entry_date: string;
  entry_type: LedgerEntryType;
  reference_id: string | null;
  reference_number: string | null;
  debit_paise: number;
  credit_paise: number;
  notes: string | null;
  created_at: string;
};

export type CustomerPayment = {
  id: string;
  business_id: string;
  customer_id: string;
  receipt_number: string;
  payment_date: string;
  amount_paise: number;
  payment_method: PaymentMethod;
  reference_details: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type PaymentAllocation = {
  id: string;
  payment_id: string;
  bill_id: string;
  allocated_paise: number;
  allocated_at: string;
};

export type AdvanceCredit = {
  id: string;
  business_id: string;
  customer_id: string;
  source_payment_id: string;
  original_amount_paise: number;
  remaining_amount_paise: number;
  status: AdvanceCreditStatus;
  created_at: string;
  updated_at: string;
};

/** Stage 4 Supplier & Cost Tables */
export type Supplier = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SupplierOpeningBalance = {
  id: string;
  business_id: string;
  supplier_id: string;
  financial_year: string;
  amount_paise: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrderSequence = {
  id: string;
  business_id: string;
  financial_year: string;
  last_number: number;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrder = {
  id: string;
  business_id: string;
  supplier_id: string;
  order_number: string;
  financial_year: string;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_delivery_date: string | null;
  total_amount_paise: number;
  total_load_cost_paise: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  customer_id: string | null;
  customer_name: string | null;
  quantity_bags: number;
  unit_rate_paise: number;
  total_paise: number;
  allocated_load_cost_paise: number;
  effective_cost_paise: number;
  created_at: string;
};

export type PurchaseOrderStatusHistory = {
  id: string;
  order_id: string;
  from_status: string;
  to_status: string;
  transition_key: string;
  notes: string | null;
  changed_by: string | null;
  changed_at: string;
};

export type PurchaseLoadCost = {
  id: string;
  order_id: string;
  description: string;
  amount_paise: number;
  allocation_method: LoadCostAllocationMethod;
  created_at: string;
};

export type SupplierLedgerEntry = {
  id: string;
  business_id: string;
  supplier_id: string;
  entry_type: SupplierLedgerEntryType;
  reference_type: string | null;
  reference_id: string | null;
  debit_paise: number;
  credit_paise: number;
  entry_date: string;
  description: string;
  created_at: string;
};

export type SupplierPayment = {
  id: string;
  business_id: string;
  supplier_id: string;
  payment_number: string;
  amount_paise: number;
  payment_date: string;
  payment_mode: string;
  reference_number: string | null;
  notes: string | null;
  idempotency_key: string | null;
  created_by: string | null;
  created_at: string;
};

export type SupplierPaymentAllocation = {
  id: string;
  payment_id: string;
  purchase_order_id: string;
  amount_paise: number;
  created_at: string;
};

export type SupplierAdvanceCredit = {
  id: string;
  business_id: string;
  supplier_id: string;
  payment_id: string;
  amount_paise: number;
  remaining_paise: number;
  created_at: string;
};

/** Stage 5 Profit & Expense Types */
export type CostSource =
  'purchase_order_line' | 'latest_purchase_cost' | 'default_catalogue_cost';

export type SaleCostSnapshot = {
  id: string;
  business_id: string;
  bill_id: string;
  bill_item_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  realized_selling_rate_paise: number;
  effective_cost_paise: number;
  unit_profit_paise: number;
  total_profit_paise: number;
  cost_source: CostSource;
  source_order_item_id: string | null;
  created_at: string;
};

export type ExpenseCategory = {
  id: string;
  business_id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export type Expense = {
  id: string;
  business_id: string;
  category_id: string;
  amount_paise: number;
  expense_date: string;
  payment_mode: string;
  reference_number: string | null;
  notes: string | null;
  customer_id: string | null;
  load_reference: string | null;
  is_load_allocated: boolean;
  created_by: string | null;
  created_at: string;
};

export type OwnerPinSettings = {
  id: string;
  business_id: string;
  pin_hash: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

/** Stage 6 Document Engine Tables */
export type DocumentTemplate = {
  id: string;
  business_id: string;
  document_type: 'bill' | 'khate_utara' | 'purchase_order' | 'poster';
  template_name: string;
  is_default: boolean;
  firm_name: string | null;
  firm_tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  upi_id: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_ifsc: string | null;
  logo_url: string | null;
  footer_text: string | null;
  disclaimer: string | null;
  default_language: 'mr' | 'en';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DocumentVersion = {
  id: string;
  business_id: string;
  document_type:
    'commercial_bill' | 'revised_bill' | 'khate_utara' | 'purchase_order' | 'poster';
  reference_id: string | null;
  document_number: string;
  version_number: number;
  is_revised: boolean;
  storage_path: string | null;
  checksum: string;
  rendering_snapshot: Record<string, unknown>;
  file_size_bytes: number;
  mime_type: string;
  created_by: string | null;
  created_at: string;
};

export type GeneratedPoster = {
  id: string;
  business_id: string;
  title: string;
  category:
    'festival' | 'product_promo' | 'cattle_feed_announcement' | 'pvc_promo' | 'custom';
  aspect_ratio: '1:1' | '9:16' | '16:9';
  template_config: Record<string, unknown>;
  image_data_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Stage 7 Communication & WhatsApp Automation Engine Tables */
export type MessageTransportMode = 'manual_handoff' | 'official_api';

export type MessageJobStatus =
  | 'queued'
  | 'awaiting_owner_action'
  | 'prepared'
  | 'opened'
  | 'owner_marked_sent'
  | 'submitted_to_provider'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'suppressed';

export type WorkflowType =
  | 'payment_reminder'
  | 'material_finish'
  | 'birthday'
  | 'festival'
  | 'delivery_notice'
  | 'custom_broadcast'
  | 'pvc_promo';

export type MessageModeSettings = {
  id: string;
  business_id: string;
  payment_reminders_mode: MessageTransportMode;
  birthdays_mode: MessageTransportMode;
  festival_wishes_mode: MessageTransportMode;
  delivery_announcements_mode: MessageTransportMode;
  custom_campaigns_mode: MessageTransportMode;
  default_payment_reminder_interval_days: number;
  material_alert_days_before: number;
  official_api_configured: boolean;
  official_api_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ReminderRule = {
  id: string;
  business_id: string;
  customer_id: string;
  interval_days: number;
  promise_date: string | null;
  is_suppressed: boolean;
  suppression_reason: string | null;
  notes: string | null;
  last_reminded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MaterialAlert = {
  id: string;
  business_id: string;
  customer_id: string;
  bill_id: string;
  product_name: string;
  quantity_bags: number;
  herd_size: number;
  daily_feeding_rate_kg: number;
  estimated_duration_days: number;
  bill_date: string;
  expected_finish_date: string;
  alert_date: string;
  status: 'active' | 'resolved' | 'suppressed' | 'superseded';
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageTemplate = {
  id: string;
  business_id: string;
  workflow_type: WorkflowType;
  language: 'mr' | 'en';
  template_title: string;
  template_body: string;
  is_system_default: boolean;
  variables: string[];
  created_at: string;
  updated_at: string;
};

export type MessageJob = {
  id: string;
  business_id: string;
  customer_id: string | null;
  workflow_type: WorkflowType;
  transport_mode: MessageTransportMode;
  scheduled_date: string;
  idempotency_key: string;
  recipient_phone: string;
  recipient_name: string;
  message_text: string;
  status: MessageJobStatus;
  context_id: string | null;
  metadata: Record<string, unknown>;
  retry_count: number;
  last_error: string | null;
  opened_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageAttempt = {
  id: string;
  job_id: string;
  business_id: string;
  action_type:
    | 'opened_handoff'
    | 'marked_sent'
    | 'api_submit'
    | 'webhook_delivered'
    | 'failed'
    | 'cancelled';
  performed_by: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type CampaignType = 'festival' | 'cattle_feed_launch' | 'pvc_promo' | 'custom';

export type Campaign = {
  id: string;
  business_id: string;
  title: string;
  campaign_type: CampaignType;
  target_audience_type: 'all_active' | 'group' | 'area' | 'selected_ids';
  target_group_id: string | null;
  target_area: string | null;
  message_template: string;
  total_recipients: number;
  sent_count: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignRecipient = {
  id: string;
  campaign_id: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  job_id: string | null;
  status: 'pending' | 'queued' | 'sent' | 'failed' | 'suppressed' | 'opted_out';
  created_at: string;
};

export type DeliveryTrip = {
  id: string;
  business_id: string;
  trip_number: string;
  trip_date: string;
  driver_name: string | null;
  vehicle_number: string | null;
  area: string | null;
  notes: string | null;
  status: 'planned' | 'in_transit' | 'completed' | 'cancelled';
  total_stops: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DeliveryTripStop = {
  id: string;
  trip_id: string;
  customer_id: string;
  stop_order: number;
  load_description: string;
  bag_count: number;
  job_id: string | null;
  is_notified: boolean;
  status: 'pending' | 'delivered' | 'rescheduled' | 'cancelled';
  created_at: string;
};

export type PvcCategory = {
  id: string;
  business_id: string;
  slug: string;
  name_en: string;
  name_mr: string;
  description_en: string | null;
  description_mr: string | null;
  icon_name: string | null;
  sort_order: number;
  is_coming_later: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BrandRecord = {
  id: string;
  business_id: string;
  brand_name: string;
  category_id: string | null;
  category_name: string | null;
  description_en: string | null;
  description_mr: string | null;
  logo_url: string | null;
  website_url: string | null;
  has_logo_permission: boolean;
  logo_permission_notes: string | null;
  show_on_digital_card: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PvcCatalogueItem = {
  id: string;
  business_id: string;
  category_id: string;
  brand_id: string | null;
  item_code: string;
  item_name_en: string;
  item_name_mr: string;
  size_dimension: string | null;
  unit: string;
  reference_rate_paise: number | null;
  specifications: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BusinessCard = {
  id: string;
  business_id: string;
  card_slug: string;
  display_name: string;
  tagline_en: string | null;
  tagline_mr: string | null;
  owner_name: string;
  primary_phone: string;
  whatsapp_number: string;
  email: string | null;
  address_line1: string;
  address_line2: string | null;
  city_or_village: string;
  pincode: string | null;
  google_maps_url: string | null;
  services_list: string[];
  featured_brand_ids: string[];
  theme_color: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerTillerDetail = {
  id: string;
  business_id: string;
  customer_id: string;
  tiller_brand: string;
  tiller_model: string;
  year_of_purchase: number | null;
  hp_rating: number | null;
  blade_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicVisitingCard = {
  card_slug: string;
  display_name: string;
  tagline_en: string | null;
  tagline_mr: string | null;
  owner_name: string;
  primary_phone: string;
  whatsapp_number: string;
  email: string | null;
  address_line1: string;
  address_line2: string | null;
  city_or_village: string;
  pincode: string | null;
  google_maps_url: string | null;
  services_list: string[];
  theme_color: string | null;
  brands: Array<{
    id: string;
    brand_name: string;
    category_name: string | null;
    logo_url: string | null;
    website_url: string | null;
    description_mr: string | null;
    description_en: string | null;
  }>;
};

/** Stage 9 Operations, Reports & Backups Types */
export type RetentionClass = 'daily' | 'monthly' | 'manual';
export type BackupVerificationStatus = 'pending' | 'verified' | 'failed';
export type RestoreRunStatus = 'in_progress' | 'verified' | 'failed' | 'aborted';
export type ReportExportType =
  'sales_collections' | 'overdue_debtors' | 'profit_margin' | 'tax_summary';
export type ReportScope = 'cattle_feed' | 'pvc' | 'combined';
export type ReportFileFormat = 'csv' | 'pdf' | 'xlsx';

export type BackupArtifact = {
  id: string;
  business_id: string | null;
  artifact_location: string;
  checksum_sha256: string;
  database_table_counts: Record<string, number>;
  object_counts: Record<string, number>;
  is_encrypted: boolean;
  retention_class: RetentionClass;
  verification_status: BackupVerificationStatus;
  verification_details: Record<string, unknown>;
  job_correlation_id: string;
  size_bytes: number;
  created_at: string;
  verified_at: string | null;
};

export type RestoreRun = {
  id: string;
  backup_artifact_id: string;
  business_id: string | null;
  initiated_by: string;
  target_environment: string;
  status: RestoreRunStatus;
  reconciled_counts: Record<string, number>;
  reconciled_ledger_totals: Record<string, number>;
  checksum_verified: boolean;
  owner_sign_off_at: string | null;
  owner_sign_off_by: string | null;
  notes: string | null;
  created_at: string;
};

export type BusinessSettings = {
  business_id: string;
  upi_id: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_ifsc: string | null;
  invoice_footer_notes_en: string | null;
  invoice_footer_notes_mr: string | null;
  default_payment_reminder_days: number;
  default_feed_finish_buffer_days: number;
  automatic_messaging_enabled: boolean;
  messaging_provider_config: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
};

export type ReportExport = {
  id: string;
  business_id: string | null;
  export_type: ReportExportType;
  scope: ReportScope;
  date_range_start: string;
  date_range_end: string;
  total_records: number;
  file_format: ReportFileFormat;
  generated_by: string;
  created_at: string;
};

/** Complete Database definition for Supabase client */
export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: Business;
        Insert: {
          id?: string;
          kind: BusinessKind;
          name: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kind?: BusinessKind;
          name?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          preferred_locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          preferred_locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_memberships: {
        Row: BusinessMembership;
        Insert: {
          id?: string;
          user_id: string;
          business_id: string;
          role?: MemberRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: MemberRole;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: RolePermission;
        Insert: {
          id?: string;
          membership_id: string;
          permission: string;
          granted_by: string;
          created_at?: string;
        };
        Update: {
          permission?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: AuditEvent;
        Insert: {
          id?: string;
          business_id?: string | null;
          actor_id: string;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Record<string, unknown> | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'customer_payments_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: Customer;
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          display_phone: string;
          normalized_phone: string;
          date_of_birth?: string | null;
          area?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          display_phone?: string;
          normalized_phone?: string;
          date_of_birth?: string | null;
          area?: string | null;
          notes?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      customer_preferences: {
        Row: CustomerPreferences;
        Insert: {
          id?: string;
          customer_id: string;
          opted_out_marketing?: boolean;
          opted_out_transactional?: boolean;
          preferred_channel?: CommunicationChannel;
          updated_at?: string;
        };
        Update: {
          opted_out_marketing?: boolean;
          opted_out_transactional?: boolean;
          preferred_channel?: CommunicationChannel;
          updated_at?: string;
        };
        Relationships: [];
      };
      customer_notes: {
        Row: CustomerNote;
        Insert: {
          id?: string;
          customer_id: string;
          author_id: string;
          content: string;
          call_date?: string;
          promise_to_pay_date?: string | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          call_date?: string;
          promise_to_pay_date?: string | null;
        };
        Relationships: [];
      };
      customer_groups: {
        Row: CustomerGroup;
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      customer_group_members: {
        Row: CustomerGroupMember;
        Insert: {
          group_id: string;
          customer_id: string;
          added_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      tags: {
        Row: Tag;
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
        };
        Relationships: [];
      };
      customer_tags: {
        Row: CustomerTag;
        Insert: {
          tag_id: string;
          customer_id: string;
        };
        Update: never;
        Relationships: [];
      };
      duplicate_reviews: {
        Row: DuplicateReview;
        Insert: {
          id?: string;
          business_id: string;
          normalized_phone: string;
          existing_customer_id: string;
          incoming_customer_data: Record<string, unknown>;
          status?: DuplicateReviewStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: DuplicateReviewStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      opening_balance_imports: {
        Row: OpeningBalanceImport;
        Insert: {
          id?: string;
          business_id: string;
          batch_id: string;
          customer_id: string;
          amount_paise: number;
          provenance_file: string;
          provenance_row: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'customer_payments_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      public_qr_registrations: {
        Row: PublicQrRegistration;
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          whatsapp_phone: string;
          normalized_phone: string;
          date_of_birth: string;
          category_interest?: string | null;
          consent_recorded?: boolean;
          status?: QrRegistrationStatus;
          created_at?: string;
        };
        Update: {
          status?: QrRegistrationStatus;
        };
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          code?: string | null;
          unit: ProductUnit;
          default_price_paise: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          code?: string | null;
          unit?: ProductUnit;
          default_price_paise?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      customer_rates: {
        Row: CustomerRate;
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          product_id: string;
          special_price_paise: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          special_price_paise?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bills_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      bill_sequences: {
        Row: BillSequence;
        Insert: {
          business_id: string;
          financial_year: string;
          last_sequence_number?: number;
          updated_at?: string;
        };
        Update: {
          last_sequence_number?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      bills: {
        Row: Bill;
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          bill_number: string;
          financial_year: string;
          bill_date?: string;
          due_date?: string | null;
          subtotal_paise: number;
          discount_paise?: number;
          total_amount_paise: number;
          paid_now_paise?: number;
          balance_due_paise: number;
          status?: BillStatus;
          cancellation_reason?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          subtotal_paise?: number;
          discount_paise?: number;
          total_amount_paise?: number;
          paid_now_paise?: number;
          balance_due_paise?: number;
          status?: BillStatus;
          cancellation_reason?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bills_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      bill_items: {
        Row: BillItem;
        Insert: {
          id?: string;
          bill_id: string;
          product_id?: string | null;
          product_name_snapshot: string;
          unit_snapshot: string;
          quantity: number;
          unit_price_paise: number;
          total_paise: number;
          sort_order?: number;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'customer_payments_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      bill_revisions: {
        Row: BillRevision;
        Insert: {
          id?: string;
          bill_id: string;
          revision_number: number;
          previous_subtotal_paise: number;
          previous_total_amount_paise: number;
          new_total_amount_paise: number;
          reason: string;
          revised_by?: string | null;
          revised_at?: string;
          snapshot: Record<string, unknown>;
        };
        Update: never;
        Relationships: [];
      };
      customer_ledger_entries: {
        Row: CustomerLedgerEntry;
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          entry_date?: string;
          entry_type: LedgerEntryType;
          reference_id?: string | null;
          reference_number?: string | null;
          debit_paise?: number;
          credit_paise?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'customer_payments_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_payments: {
        Row: CustomerPayment;
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          receipt_number: string;
          payment_date?: string;
          amount_paise: number;
          payment_method: PaymentMethod;
          reference_details?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'customer_payments_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_allocations: {
        Row: PaymentAllocation;
        Insert: {
          id?: string;
          payment_id: string;
          bill_id: string;
          allocated_paise: number;
          allocated_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      advance_credits: {
        Row: AdvanceCredit;
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          source_payment_id: string;
          original_amount_paise: number;
          remaining_amount_paise: number;
          status?: AdvanceCreditStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          remaining_amount_paise?: number;
          status?: AdvanceCreditStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: Supplier;
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          gstin?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          phone?: string | null;
          address?: string | null;
          gstin?: string | null;
          notes?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      supplier_opening_balances: {
        Row: SupplierOpeningBalance;
        Insert: {
          id?: string;
          business_id: string;
          supplier_id: string;
          financial_year: string;
          amount_paise?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          amount_paise?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchase_order_sequences: {
        Row: PurchaseOrderSequence;
        Insert: {
          id?: string;
          business_id: string;
          financial_year: string;
          last_number?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          last_number?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchase_orders: {
        Row: PurchaseOrder;
        Insert: {
          id?: string;
          business_id: string;
          supplier_id: string;
          order_number: string;
          financial_year: string;
          status?: PurchaseOrderStatus;
          order_date?: string;
          expected_delivery_date?: string | null;
          total_amount_paise?: number;
          total_load_cost_paise?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: PurchaseOrderStatus;
          expected_delivery_date?: string | null;
          total_amount_paise?: number;
          total_load_cost_paise?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'purchase_orders_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
        ];
      };
      purchase_order_items: {
        Row: PurchaseOrderItem;
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          customer_id?: string | null;
          customer_name?: string | null;
          quantity_bags: number;
          unit_rate_paise: number;
          total_paise: number;
          allocated_load_cost_paise?: number;
          effective_cost_paise?: number;
          created_at?: string;
        };
        Update: {
          quantity_bags?: number;
          unit_rate_paise?: number;
          total_paise?: number;
          allocated_load_cost_paise?: number;
          effective_cost_paise?: number;
        };
        Relationships: [];
      };
      purchase_order_status_history: {
        Row: PurchaseOrderStatusHistory;
        Insert: {
          id?: string;
          order_id: string;
          from_status: string;
          to_status: string;
          transition_key: string;
          notes?: string | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      purchase_load_costs: {
        Row: PurchaseLoadCost;
        Insert: {
          id?: string;
          order_id: string;
          description: string;
          amount_paise: number;
          allocation_method?: LoadCostAllocationMethod;
          created_at?: string;
        };
        Update: {
          description?: string;
          amount_paise?: number;
          allocation_method?: LoadCostAllocationMethod;
        };
        Relationships: [];
      };
      supplier_ledger_entries: {
        Row: SupplierLedgerEntry;
        Insert: {
          id?: string;
          business_id: string;
          supplier_id: string;
          entry_type: SupplierLedgerEntryType;
          reference_type?: string | null;
          reference_id?: string | null;
          debit_paise?: number;
          credit_paise?: number;
          entry_date?: string;
          description: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      supplier_payments: {
        Row: SupplierPayment;
        Insert: {
          id?: string;
          business_id: string;
          supplier_id: string;
          payment_number: string;
          amount_paise: number;
          payment_date?: string;
          payment_mode?: string;
          reference_number?: string | null;
          notes?: string | null;
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          notes?: string | null;
          reference_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_payments_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
        ];
      };
      supplier_payment_allocations: {
        Row: SupplierPaymentAllocation;
        Insert: {
          id?: string;
          payment_id: string;
          purchase_order_id: string;
          amount_paise: number;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      supplier_advance_credits: {
        Row: SupplierAdvanceCredit;
        Insert: {
          id?: string;
          business_id: string;
          supplier_id: string;
          payment_id: string;
          amount_paise: number;
          remaining_paise: number;
          created_at?: string;
        };
        Update: {
          remaining_paise?: number;
        };
        Relationships: [];
      };
      sale_cost_snapshots: {
        Row: SaleCostSnapshot;
        Insert: {
          id?: string;
          business_id: string;
          bill_id: string;
          bill_item_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          realized_selling_rate_paise: number;
          effective_cost_paise: number;
          unit_profit_paise: number;
          total_profit_paise: number;
          cost_source?: CostSource;
          source_order_item_id?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'sale_cost_snapshots_bill_id_fkey';
            columns: ['bill_id'];
            isOneToOne: false;
            referencedRelation: 'bills';
            referencedColumns: ['id'];
          },
        ];
      };
      expense_categories: {
        Row: ExpenseCategory;
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          code?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          code?: string | null;
          description?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      expenses: {
        Row: Expense;
        Insert: {
          id?: string;
          business_id: string;
          category_id: string;
          amount_paise: number;
          expense_date?: string;
          payment_mode?: string;
          reference_number?: string | null;
          notes?: string | null;
          customer_id?: string | null;
          load_reference?: string | null;
          is_load_allocated?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          category_id?: string;
          amount_paise?: number;
          expense_date?: string;
          payment_mode?: string;
          reference_number?: string | null;
          notes?: string | null;
          customer_id?: string | null;
          load_reference?: string | null;
          is_load_allocated?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'expense_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      owner_pin_settings: {
        Row: OwnerPinSettings;
        Insert: {
          id?: string;
          business_id: string;
          pin_hash: string;
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          pin_hash?: string;
          is_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_templates: {
        Row: DocumentTemplate;
        Insert: {
          id?: string;
          business_id: string;
          document_type: 'bill' | 'khate_utara' | 'purchase_order' | 'poster';
          template_name: string;
          is_default?: boolean;
          firm_name?: string | null;
          firm_tagline?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          gstin?: string | null;
          upi_id?: string | null;
          bank_name?: string | null;
          bank_account_no?: string | null;
          bank_ifsc?: string | null;
          logo_url?: string | null;
          footer_text?: string | null;
          disclaimer?: string | null;
          default_language?: 'mr' | 'en';
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          template_name?: string;
          is_default?: boolean;
          firm_name?: string | null;
          firm_tagline?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          gstin?: string | null;
          upi_id?: string | null;
          bank_name?: string | null;
          bank_account_no?: string | null;
          bank_ifsc?: string | null;
          logo_url?: string | null;
          footer_text?: string | null;
          disclaimer?: string | null;
          default_language?: 'mr' | 'en';
          metadata?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_versions: {
        Row: DocumentVersion;
        Insert: {
          id?: string;
          business_id: string;
          document_type:
            | 'commercial_bill'
            | 'revised_bill'
            | 'khate_utara'
            | 'purchase_order'
            | 'poster';
          reference_id?: string | null;
          document_number: string;
          version_number?: number;
          is_revised?: boolean;
          storage_path?: string | null;
          checksum: string;
          rendering_snapshot: Record<string, unknown>;
          file_size_bytes?: number;
          mime_type?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          storage_path?: string | null;
          checksum?: string;
          rendering_snapshot?: Record<string, unknown>;
          file_size_bytes?: number;
        };
        Relationships: [];
      };
      generated_posters: {
        Row: GeneratedPoster;
        Insert: {
          id?: string;
          business_id: string;
          title: string;
          category:
            | 'festival'
            | 'product_promo'
            | 'cattle_feed_announcement'
            | 'pvc_promo'
            | 'custom';
          aspect_ratio?: '1:1' | '9:16' | '16:9';
          template_config: Record<string, unknown>;
          image_data_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          category?:
            | 'festival'
            | 'product_promo'
            | 'cattle_feed_announcement'
            | 'pvc_promo'
            | 'custom';
          aspect_ratio?: '1:1' | '9:16' | '16:9';
          template_config?: Record<string, unknown>;
          image_data_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      message_mode_settings: {
        Row: MessageModeSettings;
        Insert: {
          id?: string;
          business_id: string;
          payment_reminders_mode?: MessageTransportMode;
          birthdays_mode?: MessageTransportMode;
          festival_wishes_mode?: MessageTransportMode;
          delivery_announcements_mode?: MessageTransportMode;
          custom_campaigns_mode?: MessageTransportMode;
          default_payment_reminder_interval_days?: number;
          material_alert_days_before?: number;
          official_api_configured?: boolean;
          official_api_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          payment_reminders_mode?: MessageTransportMode;
          birthdays_mode?: MessageTransportMode;
          festival_wishes_mode?: MessageTransportMode;
          delivery_announcements_mode?: MessageTransportMode;
          custom_campaigns_mode?: MessageTransportMode;
          default_payment_reminder_interval_days?: number;
          material_alert_days_before?: number;
          official_api_configured?: boolean;
          official_api_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      reminder_rules: {
        Row: ReminderRule;
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          interval_days?: number;
          promise_date?: string | null;
          is_suppressed?: boolean;
          suppression_reason?: string | null;
          notes?: string | null;
          last_reminded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          interval_days?: number;
          promise_date?: string | null;
          is_suppressed?: boolean;
          suppression_reason?: string | null;
          notes?: string | null;
          last_reminded_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      material_alerts: {
        Row: MaterialAlert;
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          bill_id: string;
          product_name: string;
          quantity_bags: number;
          herd_size?: number;
          daily_feeding_rate_kg?: number;
          estimated_duration_days: number;
          bill_date: string;
          expected_finish_date: string;
          alert_date: string;
          status?: 'active' | 'resolved' | 'suppressed' | 'superseded';
          resolved_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'active' | 'resolved' | 'suppressed' | 'superseded';
          resolved_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      message_templates: {
        Row: MessageTemplate;
        Insert: {
          id?: string;
          business_id: string;
          workflow_type: WorkflowType;
          language?: 'mr' | 'en';
          template_title: string;
          template_body: string;
          is_system_default?: boolean;
          variables?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          template_title?: string;
          template_body?: string;
          is_system_default?: boolean;
          variables?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      message_jobs: {
        Row: MessageJob;
        Insert: {
          id?: string;
          business_id: string;
          customer_id?: string | null;
          workflow_type: WorkflowType;
          transport_mode?: MessageTransportMode;
          scheduled_date: string;
          idempotency_key: string;
          recipient_phone: string;
          recipient_name: string;
          message_text: string;
          status?: MessageJobStatus;
          context_id?: string | null;
          metadata?: Record<string, unknown>;
          retry_count?: number;
          last_error?: string | null;
          opened_at?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: MessageJobStatus;
          transport_mode?: MessageTransportMode;
          retry_count?: number;
          last_error?: string | null;
          opened_at?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      message_attempts: {
        Row: MessageAttempt;
        Insert: {
          id?: string;
          job_id: string;
          business_id: string;
          action_type:
            | 'opened_handoff'
            | 'marked_sent'
            | 'api_submit'
            | 'webhook_delivered'
            | 'failed'
            | 'cancelled';
          performed_by?: string | null;
          details?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          details?: Record<string, unknown>;
        };
        Relationships: [];
      };
      campaigns: {
        Row: Campaign;
        Insert: {
          id?: string;
          business_id: string;
          title: string;
          campaign_type: 'festival' | 'cattle_feed_launch' | 'pvc_promo' | 'custom';
          target_audience_type: 'all_active' | 'group' | 'area' | 'selected_ids';
          target_group_id?: string | null;
          target_area?: string | null;
          message_template: string;
          total_recipients?: number;
          sent_count?: number;
          status?: 'draft' | 'active' | 'completed' | 'cancelled';
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          message_template?: string;
          total_recipients?: number;
          sent_count?: number;
          status?: 'draft' | 'active' | 'completed' | 'cancelled';
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_recipients: {
        Row: CampaignRecipient;
        Insert: {
          id?: string;
          campaign_id: string;
          customer_id: string;
          customer_name: string;
          phone: string;
          job_id?: string | null;
          status?: 'pending' | 'queued' | 'sent' | 'failed' | 'suppressed' | 'opted_out';
          created_at?: string;
        };
        Update: {
          job_id?: string | null;
          status?: 'pending' | 'queued' | 'sent' | 'failed' | 'suppressed' | 'opted_out';
        };
        Relationships: [];
      };
      delivery_trips: {
        Row: DeliveryTrip;
        Insert: {
          id?: string;
          business_id: string;
          trip_number: string;
          trip_date: string;
          driver_name?: string | null;
          vehicle_number?: string | null;
          area?: string | null;
          notes?: string | null;
          status?: 'planned' | 'in_transit' | 'completed' | 'cancelled';
          total_stops?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          driver_name?: string | null;
          vehicle_number?: string | null;
          area?: string | null;
          notes?: string | null;
          status?: 'planned' | 'in_transit' | 'completed' | 'cancelled';
          total_stops?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      delivery_trip_stops: {
        Row: DeliveryTripStop;
        Insert: {
          id?: string;
          trip_id: string;
          customer_id: string;
          stop_order?: number;
          load_description: string;
          bag_count?: number;
          job_id?: string | null;
          is_notified?: boolean;
          status?: 'pending' | 'delivered' | 'rescheduled' | 'cancelled';
          created_at?: string;
        };
        Update: {
          stop_order?: number;
          load_description?: string;
          bag_count?: number;
          job_id?: string | null;
          is_notified?: boolean;
          status?: 'pending' | 'delivered' | 'rescheduled' | 'cancelled';
        };
        Relationships: [];
      };
      pvc_categories: {
        Row: PvcCategory;
        Insert: {
          id?: string;
          business_id: string;
          slug: string;
          name_en: string;
          name_mr: string;
          description_en?: string | null;
          description_mr?: string | null;
          icon_name?: string | null;
          sort_order?: number;
          is_coming_later?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          name_en?: string;
          name_mr?: string;
          description_en?: string | null;
          description_mr?: string | null;
          icon_name?: string | null;
          sort_order?: number;
          is_coming_later?: boolean;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      brand_records: {
        Row: BrandRecord;
        Insert: {
          id?: string;
          business_id: string;
          brand_name: string;
          category_id?: string | null;
          category_name?: string | null;
          description_en?: string | null;
          description_mr?: string | null;
          logo_url?: string | null;
          website_url?: string | null;
          has_logo_permission?: boolean;
          logo_permission_notes?: string | null;
          show_on_digital_card?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          brand_name?: string;
          category_id?: string | null;
          category_name?: string | null;
          description_en?: string | null;
          description_mr?: string | null;
          logo_url?: string | null;
          website_url?: string | null;
          has_logo_permission?: boolean;
          logo_permission_notes?: string | null;
          show_on_digital_card?: boolean;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      pvc_catalogue_items: {
        Row: PvcCatalogueItem;
        Insert: {
          id?: string;
          business_id: string;
          category_id: string;
          brand_id?: string | null;
          item_code: string;
          item_name_en: string;
          item_name_mr: string;
          size_dimension?: string | null;
          unit?: string;
          reference_rate_paise?: number | null;
          specifications?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          brand_id?: string | null;
          item_code?: string;
          item_name_en?: string;
          item_name_mr?: string;
          size_dimension?: string | null;
          unit?: string;
          reference_rate_paise?: number | null;
          specifications?: Record<string, unknown>;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_cards: {
        Row: BusinessCard;
        Insert: {
          id?: string;
          business_id: string;
          card_slug: string;
          display_name: string;
          tagline_en?: string | null;
          tagline_mr?: string | null;
          owner_name: string;
          primary_phone: string;
          whatsapp_number: string;
          email?: string | null;
          address_line1: string;
          address_line2?: string | null;
          city_or_village: string;
          pincode?: string | null;
          google_maps_url?: string | null;
          services_list?: string[];
          featured_brand_ids?: string[];
          theme_color?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          card_slug?: string;
          display_name?: string;
          tagline_en?: string | null;
          tagline_mr?: string | null;
          owner_name?: string;
          primary_phone?: string;
          whatsapp_number?: string;
          email?: string | null;
          address_line1?: string;
          address_line2?: string | null;
          city_or_village?: string;
          pincode?: string | null;
          google_maps_url?: string | null;
          services_list?: string[];
          featured_brand_ids?: string[];
          theme_color?: string | null;
          is_published?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      customer_tiller_details: {
        Row: CustomerTillerDetail;
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          tiller_brand: string;
          tiller_model: string;
          year_of_purchase?: number | null;
          hp_rating?: number | null;
          blade_type?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tiller_brand?: string;
          tiller_model?: string;
          year_of_purchase?: number | null;
          hp_rating?: number | null;
          blade_type?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      backup_artifacts: {
        Row: BackupArtifact;
        Insert: {
          id?: string;
          business_id?: string | null;
          artifact_location: string;
          checksum_sha256: string;
          database_table_counts?: Record<string, number>;
          object_counts?: Record<string, number>;
          is_encrypted?: boolean;
          retention_class: RetentionClass;
          verification_status?: BackupVerificationStatus;
          verification_details?: Record<string, unknown>;
          job_correlation_id: string;
          size_bytes?: number;
          created_at?: string;
          verified_at?: string | null;
        };
        Update: {
          artifact_location?: string;
          checksum_sha256?: string;
          database_table_counts?: Record<string, number>;
          object_counts?: Record<string, number>;
          is_encrypted?: boolean;
          retention_class?: RetentionClass;
          verification_status?: BackupVerificationStatus;
          verification_details?: Record<string, unknown>;
          job_correlation_id?: string;
          size_bytes?: number;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      restore_runs: {
        Row: RestoreRun;
        Insert: {
          id?: string;
          backup_artifact_id: string;
          business_id?: string | null;
          initiated_by: string;
          target_environment?: string;
          status?: RestoreRunStatus;
          reconciled_counts?: Record<string, number>;
          reconciled_ledger_totals?: Record<string, number>;
          checksum_verified?: boolean;
          owner_sign_off_at?: string | null;
          owner_sign_off_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          target_environment?: string;
          status?: RestoreRunStatus;
          reconciled_counts?: Record<string, number>;
          reconciled_ledger_totals?: Record<string, number>;
          checksum_verified?: boolean;
          owner_sign_off_at?: string | null;
          owner_sign_off_by?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      business_settings: {
        Row: BusinessSettings;
        Insert: {
          business_id: string;
          upi_id?: string | null;
          bank_name?: string | null;
          bank_account_no?: string | null;
          bank_ifsc?: string | null;
          invoice_footer_notes_en?: string | null;
          invoice_footer_notes_mr?: string | null;
          default_payment_reminder_days?: number;
          default_feed_finish_buffer_days?: number;
          automatic_messaging_enabled?: boolean;
          messaging_provider_config?: Record<string, unknown>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          upi_id?: string | null;
          bank_name?: string | null;
          bank_account_no?: string | null;
          bank_ifsc?: string | null;
          invoice_footer_notes_en?: string | null;
          invoice_footer_notes_mr?: string | null;
          default_payment_reminder_days?: number;
          default_feed_finish_buffer_days?: number;
          automatic_messaging_enabled?: boolean;
          messaging_provider_config?: Record<string, unknown>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      report_exports: {
        Row: ReportExport;
        Insert: {
          id?: string;
          business_id?: string | null;
          export_type: ReportExportType;
          scope: ReportScope;
          date_range_start: string;
          date_range_end: string;
          total_records?: number;
          file_format: ReportFileFormat;
          generated_by: string;
          created_at?: string;
        };
        Update: {
          total_records?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_business_member: {
        Args: { p_business_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_business_owner: {
        Args: { p_business_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_cattle_feed_business: {
        Args: { p_business_id: string };
        Returns: boolean;
      };
      get_financial_year: {
        Args: { p_date?: string };
        Returns: string;
      };
      allocate_bill_number: {
        Args: { p_business_id: string; p_financial_year: string };
        Returns: string;
      };
      record_customer_payment: {
        Args: {
          p_business_id: string;
          p_customer_id: string;
          p_amount_paise: number;
          p_payment_method: string;
          p_reference_details?: string;
          p_notes?: string;
          p_payment_date?: string;
        };
        Returns: Record<string, unknown>;
      };
      cancel_cattle_feed_bill: {
        Args: {
          p_business_id: string;
          p_bill_id: string;
          p_reason: string;
        };
        Returns: Record<string, unknown>;
      };
      get_customer_khate_utara: {
        Args: {
          p_business_id: string;
          p_customer_id: string;
          p_from_date: string;
          p_to_date: string;
        };
        Returns: Record<string, unknown>;
      };
      normalize_phone: {
        Args: { p_phone: string };
        Returns: string;
      };
      record_audit_event: {
        Args: {
          p_business_id: string;
          p_action: string;
          p_target_type?: string;
          p_target_id?: string;
          p_metadata?: Record<string, unknown>;
        };
        Returns: string;
      };
      allocate_purchase_order_number: {
        Args: {
          p_business_id: string;
          p_financial_year: string;
        };
        Returns: string;
      };
      transition_purchase_order_status: {
        Args: {
          p_order_id: string;
          p_to_status: string;
          p_transition_key: string;
          p_notes?: string;
        };
        Returns: Record<string, unknown>;
      };
      record_supplier_payment: {
        Args: {
          p_business_id: string;
          p_supplier_id: string;
          p_amount_paise: number;
          p_payment_date?: string;
          p_payment_mode?: string;
          p_reference_number?: string;
          p_notes?: string;
          p_idempotency_key?: string;
        };
        Returns: Record<string, unknown>;
      };
      get_supplier_account_statement: {
        Args: {
          p_business_id: string;
          p_supplier_id: string;
          p_from_date?: string;
          p_to_date?: string;
        };
        Returns: Record<string, unknown>;
      };
      create_sale_cost_snapshot: {
        Args: {
          p_business_id: string;
          p_bill_id: string;
          p_bill_item_id: string;
          p_product_id?: string | null;
          p_product_name: string;
          p_quantity: number;
          p_realized_selling_rate_paise: number;
          p_source_order_item_id?: string | null;
        };
        Returns: string;
      };
      get_owner_profit_metrics: {
        Args: {
          p_business_id: string;
          p_from_date?: string | null;
          p_to_date?: string | null;
        };
        Returns: Record<string, unknown>;
      };
      verify_owner_pin: {
        Args: {
          p_business_id: string;
          p_pin_hash: string;
        };
        Returns: boolean;
      };
      register_document_version: {
        Args: {
          p_business_id: string;
          p_document_type: string;
          p_reference_id?: string | null;
          p_document_number: string;
          p_version_number: number;
          p_is_revised: boolean;
          p_checksum: string;
          p_rendering_snapshot: Record<string, unknown>;
          p_file_size_bytes?: number;
          p_storage_path?: string | null;
        };
        Returns: string;
      };
      mark_message_job_opened: {
        Args: {
          p_job_id: string;
        };
        Returns: void;
      };
      mark_message_job_sent: {
        Args: {
          p_job_id: string;
        };
        Returns: void;
      };
      enforce_backup_retention: {
        Args: {
          p_business_id: string;
        };
        Returns: Record<string, unknown>;
      };
      get_public_visiting_card: {
        Args: { p_card_slug: string };
        Returns: PublicVisitingCard | null;
      };
    };
    Enums: {
      business_kind: BusinessKind;
      member_role: MemberRole;
      communication_channel: CommunicationChannel;
      duplicate_review_status: DuplicateReviewStatus;
      qr_registration_status: QrRegistrationStatus;
      product_unit: ProductUnit;
      bill_status: BillStatus;
      ledger_entry_type: LedgerEntryType;
      payment_method: PaymentMethod;
      advance_credit_status: AdvanceCreditStatus;
      purchase_order_status: PurchaseOrderStatus;
      supplier_ledger_entry_type: SupplierLedgerEntryType;
      load_cost_allocation_method: LoadCostAllocationMethod;
      cost_source: CostSource;
    };
  };
};
