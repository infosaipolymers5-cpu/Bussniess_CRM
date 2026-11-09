/**
 * Unit Tests for Stage 6 Documents Engine.
 * Tests:
 * 1. Cattle Feed Commercial Bill PDF generation, revisions, finish dates, WhatsApp text
 * 2. Khate Utara running ledger statement PDF generation, bilingual modes, English digits
 * 3. Purchase Order PDF generation, gate-pass rate masking, disclosure warning logic
 * 4. SimplePDFBuilder A4 pagination, multi-page repeating headers, page numbering, PDF-1.4 format
 * 5. Marketing poster templates and canvas presets
 * 6. SHA-256 snapshot checksum calculation
 */

import { describe, it, expect } from 'vitest';
import {
  SimplePDFBuilder,
  generateBillPdf,
  buildBillWhatsAppText,
  generateStatementPdf,
  buildStatementWhatsAppText,
  generatePurchaseOrderPdf,
  checkPoRateDisclosureSafety,
  computeSha256,
  type BillDocumentSnapshot,
  type KhateUtaraDocumentSnapshot,
  type PurchaseOrderDocumentSnapshot,
} from '@/lib/pdf';
import { POSTER_TEMPLATES } from '@/features/posters';

describe('Stage 6: Documents Engine', () => {
  // Test Fixture: Commercial Bill Snapshot
  const mockBillSnapshot: BillDocumentSnapshot = {
    firm: {
      name: 'Rushi Agro Cattle Feed',
      tagline: 'Premium Feed & Dairy Solutions',
      address: 'Shop 12, APMC Market, Sangamner',
      phone: '9876543210',
      gstin: '27AABCR1234F1Z5',
      upi_id: 'rushiagro@upi',
      bank_name: 'State Bank of India',
      bank_account_no: '1234567890',
      bank_ifsc: 'SBIN0001234',
    },
    bill: {
      id: 'b1111111-1111-1111-1111-111111111111',
      bill_number: 'CF-2026-0042',
      financial_year: '2026-2027',
      bill_date: '2026-11-08',
      due_date: '2026-11-20',
      status: 'partially_paid',
      is_revised: false,
      revision_number: 1,
    },
    customer: {
      id: 'c1111111-1111-1111-1111-111111111111',
      name: 'Eknath Shinde',
      display_phone: '9822001122',
      area: 'Talegaon',
    },
    items: [
      {
        product_name: 'Makka Chuni (Yellow Maize)',
        unit: 'bag',
        quantity: 20,
        unit_price_paise: 269000, // ₹2,690.00
        total_paise: 5380000, // ₹53,800.00
      },
      {
        product_name: 'Wheat Bhusa (Super)',
        unit: 'bag',
        quantity: 10,
        unit_price_paise: 229000, // ₹2,290.00
        total_paise: 2290000, // ₹22,900.00
      },
    ],
    totals: {
      subtotal_paise: 7670000, // ₹76,700.00
      discount_paise: 70000, // ₹700.00
      total_amount_paise: 7600000, // ₹76,000.00
      paid_now_paise: 2000000, // ₹20,000.00
      balance_due_paise: 5600000, // ₹56,000.00
      previous_outstanding_paise: 1500000, // ₹15,000.00
      total_outstanding_paise: 7100000, // ₹71,000.00
    },
    material_alert: {
      estimated_duration_days: 25,
      expected_finish_date: '2026-12-03',
    },
    notice: 'This is a computer generated commercial bill, not a tax invoice.',
    generated_at: '2026-11-08T10:00:00Z',
  };

  describe('Commercial Bill PDF Generator', () => {
    it('generates a valid PDF-1.4 binary stream with correct header and trailer', async () => {
      const { bytes, checksum } = await generateBillPdf(mockBillSnapshot);

      expect(bytes.byteLength).toBeGreaterThan(500);
      expect(bytes.constructor.name).toBe('Uint8Array');

      const text = new TextDecoder().decode(bytes);
      expect(text.startsWith('%PDF-1.4')).toBe(true);
      expect(text).toContain('%%EOF');
      expect(text).toContain('startxref');
      expect(text).toContain('trailer');

      expect(checksum).toBeDefined();
      expect(checksum.length).toBe(64); // SHA-256 hex length
    });

    it('embeds firm branding, bill number, and items in bill PDF stream', async () => {
      const { bytes } = await generateBillPdf(mockBillSnapshot);
      const text = new TextDecoder().decode(bytes);

      expect(text).toContain('Rushi Agro Cattle Feed');
      expect(text).toContain('CF-2026-0042');
      expect(text).toContain('Eknath Shinde');
      expect(text).toContain('Makka Chuni');
      expect(text).toContain('COMMERCIAL BILL');
    });

    it('renders prominent REVISED badge when bill is revised', async () => {
      const revisedSnapshot: BillDocumentSnapshot = {
        ...mockBillSnapshot,
        bill: {
          ...mockBillSnapshot.bill,
          is_revised: true,
          revision_number: 2,
        },
      };

      const { bytes } = await generateBillPdf(revisedSnapshot);
      const text = new TextDecoder().decode(bytes);

      expect(text).toContain('REVISED');
    });

    it('renders CANCELLED notice when bill is cancelled', async () => {
      const cancelledSnapshot: BillDocumentSnapshot = {
        ...mockBillSnapshot,
        bill: {
          ...mockBillSnapshot.bill,
          status: 'cancelled',
          cancellation_reason: 'Entered incorrect bag count',
        },
      };

      const { bytes } = await generateBillPdf(cancelledSnapshot);
      const text = new TextDecoder().decode(bytes);

      expect(text).toContain('CANCELLED');
    });

    it('generates structured manual WhatsApp text with correct math', () => {
      const waText = buildBillWhatsAppText(mockBillSnapshot);

      expect(waText).toContain('Rushi Agro Cattle Feed — व्यापारी बिल');
      expect(waText).toContain('बिल नं: CF-2026-0042');
      expect(waText).toContain('ग्राहक: Eknath Shinde');
      expect(waText).toContain('एकूण रक्कम: ₹76,000.00');
      expect(waText).toContain('रोख जमा: ₹20,000.00');
      expect(waText).toContain('या बिलाची शिल्लक: ₹56,000.00');
      expect(waText).toContain('मागील बाकी: ₹15,000.00');
      expect(waText).toContain('एकूण येणे बाकी: ₹71,000.00');
      expect(waText).toContain('चारा संपण्याचा अंदाज: 3 Dec 2026');
      expect(waText).toContain('Google Pay / PhonePe (UPI): rushiagro@upi');
    });
  });

  describe('Khate Utara (Customer Statement) Generator', () => {
    const mockStatementSnapshot: KhateUtaraDocumentSnapshot = {
      firm: {
        name: 'Rushi Agro Cattle Feed',
        address: 'APMC Market, Sangamner',
        phone: '9876543210',
        upi_id: 'rushiagro@upi',
      },
      customer: {
        id: 'c1111111-1111-1111-1111-111111111111',
        name: 'Suresh Patil',
        display_phone: '9890123456',
        area: 'Nimgaon',
      },
      period: {
        from_date: '2026-10-01',
        to_date: '2026-10-31',
        generated_date: '2026-11-08',
      },
      language: 'mr',
      opening_balance_paise: 2500000, // ₹25,000.00
      entries: [
        {
          date: '2026-10-05',
          voucher_number: 'CF-2026-0010',
          particulars: 'Purchase of 10 bags Makka Chuni',
          debit_paise: 2690000,
          credit_paise: 0,
          running_balance_paise: 5190000,
        },
        {
          date: '2026-10-15',
          voucher_number: 'PAY-2026-0005',
          particulars: 'Cash Payment at store',
          debit_paise: 0,
          credit_paise: 2000000,
          running_balance_paise: 3190000,
        },
      ],
      total_debit_paise: 2690000,
      total_credit_paise: 2000000,
      closing_balance_paise: 3190000,
      notice: 'संगणकीकृत लेजर खाते उतारा.',
      generated_at: '2026-11-08T10:00:00Z',
    };

    it('generates bilingual Marathi/English statement with English digits in Marathi mode', async () => {
      const { bytes, checksum } = await generateStatementPdf(mockStatementSnapshot);

      expect(bytes.byteLength).toBeGreaterThan(500);
      expect(bytes.constructor.name).toBe('Uint8Array');
      expect(checksum).toBeDefined();

      const text = new TextDecoder().decode(bytes);
      expect(text).toContain('KHATE UTARA');
      expect(text).toContain('Suresh Patil');
      // Must use standard English digits for numeric balances
      expect(text).toContain('25,000.00');
      expect(text).toContain('31,900.00');
      expect(text).toContain('26,900.00');
      expect(text).toContain('20,000.00');
    });

    it('generates statement in English mode when selected', async () => {
      const englishSnapshot: KhateUtaraDocumentSnapshot = {
        ...mockStatementSnapshot,
        language: 'en',
      };

      const { bytes } = await generateStatementPdf(englishSnapshot);
      const text = new TextDecoder().decode(bytes);

      expect(text).toContain('CUSTOMER ACCOUNT STATEMENT');
      expect(text).toContain('Opening Balance');
      expect(text).toContain('Closing Net Balance');
    });

    it('builds WhatsApp statement summary text', () => {
      const waText = buildStatementWhatsAppText(mockStatementSnapshot);

      expect(waText).toContain('Rushi Agro Cattle Feed — खाते उतारा');
      expect(waText).toContain('ग्राहक: Suresh Patil');
      expect(waText).toContain('आरंभीची शिल्लक: ₹25,000.00');
      expect(waText).toContain('एकूण खरेदी (नावे): ₹26,900.00');
      expect(waText).toContain('एकूण जमा (भरणा): ₹20,000.00');
      expect(waText).toContain('अखेरची शिल्लक (एकूण येणे): ₹31,900.00');
      expect(waText).toContain('Google Pay / PhonePe (UPI): rushiagro@upi');
    });
  });

  describe('Purchase Order & Gate Pass Generator', () => {
    const mockPoSnapshot: PurchaseOrderDocumentSnapshot = {
      firm: {
        name: 'Rushi Agro',
        address: 'APMC Market, Sangamner',
        phone: '9876543210',
        gstin: '27AABCR1234F1Z5',
      },
      po: {
        id: 'po-1111-2222',
        order_number: 'PO-2026-0005',
        financial_year: '2026-2027',
        order_date: '2026-11-08',
        expected_delivery_date: '2026-11-12',
        status: 'ordered',
        show_rates: true,
        is_gate_pass: false,
      },
      supplier: {
        id: 'supp-1111',
        name: 'Godrej Agrovet Ltd',
        phone: '9988776655',
        address: 'MIDC Chakan, Pune',
        gstin: '27AAACG0000A1Z5',
      },
      items: [
        {
          product_name: 'Godrej Dairy Special Feed (50kg)',
          unit: 'bag',
          quantity: 200,
          customer_reference: 'Cust: Eknath Shinde',
          unit_price_paise: 215000, // ₹2,150.00
          total_paise: 43000000, // ₹4,30,000.00
        },
      ],
      total_amount_paise: 43000000,
      notes: 'Please dispatch morning batch.',
      terms_and_conditions: ['Payment in 15 days upon physical bag receipt.'],
      notice: 'Official Purchase Order',
      generated_at: '2026-11-08T10:00:00Z',
    };

    it('generates full PO with purchase rates and total order value', async () => {
      const { bytes } = await generatePurchaseOrderPdf(mockPoSnapshot);
      const text = new TextDecoder().decode(bytes);

      expect(text).toContain('PURCHASE ORDER');
      expect(text).toContain('PO-2026-0005');
      expect(text).toContain('Godrej Agrovet Ltd');
      expect(text).toContain('4,30,000.00');
      expect(text).toContain('2,150.00');
    });

    it('masks rates and totals in Gate Pass mode', async () => {
      const gatePassSnapshot: PurchaseOrderDocumentSnapshot = {
        ...mockPoSnapshot,
        po: {
          ...mockPoSnapshot.po,
          show_rates: false,
          is_gate_pass: true,
        },
        items: [
          {
            product_name: 'Godrej Dairy Special Feed (50kg)',
            unit: 'bag',
            quantity: 200,
            customer_reference: 'Cust: Eknath Shinde',
            unit_price_paise: undefined,
            total_paise: undefined,
          },
        ],
        total_amount_paise: null,
      };

      const { bytes } = await generatePurchaseOrderPdf(gatePassSnapshot);
      const text = new TextDecoder().decode(bytes);

      expect(text).toContain('GATE PASS / CHALLAN');
      expect(text).toContain('DELIVERY CHALLAN / GATE PASS');
      expect(text).not.toContain('4,30,000.00');
      expect(text).not.toContain('2,150.00');
      expect(text).toContain('200'); // Quantity is preserved
    });

    it('enforces selling-rate disclosure warning when rates are exposed', () => {
      const unsafeCheck = checkPoRateDisclosureSafety(mockPoSnapshot);
      expect(unsafeCheck.isSafe).toBe(false);
      expect(unsafeCheck.warningMessage).toContain('Selling Rate Disclosure Warning');

      const safeSnapshot: PurchaseOrderDocumentSnapshot = {
        ...mockPoSnapshot,
        po: {
          ...mockPoSnapshot.po,
          show_rates: false,
          is_gate_pass: true,
        },
      };

      const safeCheck = checkPoRateDisclosureSafety(safeSnapshot);
      expect(safeCheck.isSafe).toBe(true);
      expect(safeCheck.warningMessage).toBeNull();
    });
  });

  describe('SimplePDFBuilder Core Engine', () => {
    it('sets A4 dimensions and margins properly', () => {
      const builder = new SimplePDFBuilder();
      expect(builder.pageWidth).toBeCloseTo(595.28, 1);
      expect(builder.pageHeight).toBeCloseTo(841.89, 1);
      expect(builder.margin).toBe(36);
    });

    it('automatically breaks page and numbers pages in multi-page tables', () => {
      const builder = new SimplePDFBuilder({ title: 'Multi-Page Test' });

      // Generate 50 rows which exceed one A4 page
      const columns = [
        { header: '#', width: 40 },
        { header: 'Description', width: 300 },
        { header: 'Amount', width: 150, align: 'right' as const },
      ];
      const rows = Array.from({ length: 50 }, (_, i) => [
        i + 1,
        `Sample item row description ${i + 1}`,
        `₹${(i + 1) * 100}`,
      ]);

      builder.renderTable(columns, rows, builder.getY());
      builder.finalizePageFooters('Verified Statement');

      const bytes = builder.buildBytes();
      const text = new TextDecoder().decode(bytes);

      // Should have generated more than 1 page
      expect(text).toContain('/Count 2');
      expect(text).toContain('Page 1 of 2');
      expect(text).toContain('Page 2 of 2');
    });
  });

  describe('Marketing Poster Presets', () => {
    it('provides all 5 agribusiness template presets with valid branding fields', () => {
      expect(POSTER_TEMPLATES.length).toBeGreaterThanOrEqual(5);

      POSTER_TEMPLATES.forEach((tmpl) => {
        expect(tmpl.id).toBeDefined();
        expect(tmpl.title).toBeDefined();
        expect(tmpl.headline.length).toBeGreaterThan(5);
        expect(tmpl.highlights.length).toBeGreaterThanOrEqual(3);
        expect(tmpl.theme.bg_gradient.length).toBe(2);
        expect(tmpl.theme.accent_color.startsWith('#')).toBe(true);
      });
    });

    it('includes specific essential agribusiness templates', () => {
      const ids = POSTER_TEMPLATES.map((t) => t.id);
      expect(ids).toContain('cattle-feed-fresh-batch');
      expect(ids).toContain('milk-yield-booster');
      expect(ids).toContain('festival-diwali');
      expect(ids).toContain('festival-pola');
      expect(ids).toContain('pvc-irrigation-promo');
    });
  });

  describe('SHA-256 Checksum Calculation', () => {
    it('computes deterministic 64-character hex hash for document snapshots', async () => {
      const input = JSON.stringify({ document: 'CF-2026-0001', amount: 500000 });
      const hash1 = await computeSha256(input);
      const hash2 = await computeSha256(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
