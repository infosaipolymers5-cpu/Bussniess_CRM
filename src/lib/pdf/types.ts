/**
 * Document Snapshot & PDF Engine Types
 * Pure types for immutable document generation, audit, and verification.
 */

export type DocumentFirmBranding = {
  name: string;
  tagline?: string | null;
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
};

export type BillItemSnapshot = {
  product_name: string;
  unit: string;
  quantity: number;
  unit_price_paise: number;
  total_paise: number;
};

export type BillDocumentSnapshot = {
  firm: DocumentFirmBranding;
  bill: {
    id: string;
    bill_number: string;
    financial_year: string;
    bill_date: string;
    due_date?: string | null;
    status: string;
    is_revised: boolean;
    revision_number: number;
    cancellation_reason?: string | null;
  };
  customer: {
    id: string;
    name: string;
    display_phone: string;
    area?: string | null;
  };
  items: BillItemSnapshot[];
  totals: {
    subtotal_paise: number;
    discount_paise: number;
    total_amount_paise: number;
    paid_now_paise: number;
    balance_due_paise: number;
    previous_outstanding_paise: number;
    total_outstanding_paise: number;
  };
  material_alert?: {
    estimated_duration_days?: number | null;
    expected_finish_date?: string | null;
  };
  notice: string;
  generated_at: string;
  checksum?: string;
};

export type KhateUtaraEntrySnapshot = {
  date: string;
  voucher_number: string;
  particulars: string;
  debit_paise: number;
  credit_paise: number;
  running_balance_paise: number;
};

export type KhateUtaraDocumentSnapshot = {
  firm: DocumentFirmBranding;
  customer: {
    id: string;
    name: string;
    display_phone: string;
    area?: string | null;
  };
  period: {
    from_date: string;
    to_date: string;
    generated_date: string;
  };
  language: 'en' | 'mr';
  opening_balance_paise: number;
  entries: KhateUtaraEntrySnapshot[];
  total_debit_paise: number;
  total_credit_paise: number;
  closing_balance_paise: number;
  notice: string;
  generated_at: string;
  checksum?: string;
};

export type PurchaseOrderItemSnapshot = {
  product_name: string;
  unit: string;
  quantity: number;
  customer_reference?: string | null;
  unit_price_paise?: number; // Omitted in gate-pass mode
  total_paise?: number; // Omitted in gate-pass mode
};

export type PurchaseOrderDocumentSnapshot = {
  firm: DocumentFirmBranding;
  po: {
    id: string;
    order_number: string;
    financial_year: string;
    order_date: string;
    expected_delivery_date?: string | null;
    status: string;
    show_rates: boolean;
    is_gate_pass: boolean;
  };
  supplier: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    gstin?: string | null;
  };
  items: PurchaseOrderItemSnapshot[];
  total_amount_paise?: number | null; // Omitted in gate-pass mode
  notes?: string | null;
  terms_and_conditions: string[];
  notice: string;
  generated_at: string;
  checksum?: string;
};

export type PosterTemplatePreset = {
  id: string;
  title: string;
  category: 'festival' | 'product_promo' | 'cattle_feed_announcement' | 'pvc_promo';
  aspect_ratio: '1:1' | '9:16';
  headline: string;
  subheadline: string;
  tagline: string;
  highlights: string[];
  footer_callout: string;
  theme: {
    bg_gradient: [string, string];
    card_bg: string;
    accent_color: string;
    text_color: string;
    badge_bg: string;
    badge_text: string;
  };
};
