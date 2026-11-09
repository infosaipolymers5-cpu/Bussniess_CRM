import { describe, it, expect } from 'vitest';
import { getFinancialYear } from '@/lib/dates';
import { rupeesToPaise, paiseToRupees, formatPaise, sumPaise } from '@/lib/money';
import {
  productFormSchema,
  customerRateSchema,
  billItemFormSchema,
  billFormSchema,
  paymentFormSchema,
  billCancellationSchema,
  khateUtaraFilterSchema,
} from '@/lib/validation';

describe('Stage 3 — Customer Financial Engine Unit Tests', () => {
  describe('Financial Year Computation (April 1 Boundary in Asia/Kolkata)', () => {
    it('computes FY for dates on or after April 1', () => {
      expect(getFinancialYear('2026-04-01T00:00:00+05:30')).toBe('2026-27');
      expect(getFinancialYear('2026-05-15T12:00:00+05:30')).toBe('2026-27');
      expect(getFinancialYear('2026-11-08T15:00:00+05:30')).toBe('2026-27');
      expect(getFinancialYear('2026-12-31T23:59:59+05:30')).toBe('2026-27');
    });

    it('computes previous FY for dates prior to April 1 (Jan - Mar)', () => {
      expect(getFinancialYear('2026-03-31T23:59:59+05:30')).toBe('2025-26');
      expect(getFinancialYear('2026-01-01T00:00:00+05:30')).toBe('2025-26');
      expect(getFinancialYear('2026-02-28T12:00:00+05:30')).toBe('2025-26');
    });

    it('handles year rolls accurately across decades', () => {
      expect(getFinancialYear('2029-04-01')).toBe('2029-30');
      expect(getFinancialYear('2030-03-31')).toBe('2029-30');
    });
  });

  describe('Integer Paise Math & Financial Accuracy', () => {
    it('converts decimal rupees into integer paise without floating point loss', () => {
      expect(rupeesToPaise(1250.5)).toBe(125050);
      expect(rupeesToPaise(12.34)).toBe(1234);
      expect(rupeesToPaise(0.01)).toBe(1);
      expect(rupeesToPaise(0)).toBe(0);
    });

    it('calculates bill line item total accurately in paise', () => {
      const quantity = 3.5; // 3.5 quintals or bags
      const unitPriceRupees = 1420.75;
      const unitPricePaise = rupeesToPaise(unitPriceRupees); // 142075 paise
      const lineTotalPaise = Math.round(quantity * unitPricePaise); // 497263 paise (₹4972.63)

      expect(lineTotalPaise).toBe(497263);
      expect(paiseToRupees(lineTotalPaise)).toBe(4972.63);
      expect(formatPaise(lineTotalPaise)).toMatch(/₹\s*4,972\.63/);
    });

    it('sums invoice subtotal, applies discount, and computes net balance due in paise', () => {
      const line1Paise = Math.round(10 * rupeesToPaise(1200.0)); // 10 bags @ ₹1200 = 1200000 paise (₹12,000)
      const line2Paise = Math.round(5 * rupeesToPaise(850.5)); // 5 bags @ ₹850.50 = 425250 paise (₹4,252.50)

      const subtotalPaise = sumPaise([line1Paise, line2Paise]); // 1625250 paise (₹16,252.50)
      expect(subtotalPaise).toBe(1625250);

      const discountRupees = 252.5;
      const discountPaise = rupeesToPaise(discountRupees); // 25250 paise

      const totalAmountPaise = Math.max(0, subtotalPaise - discountPaise); // 1600000 paise (₹16,000.00)
      expect(totalAmountPaise).toBe(1600000);

      const paidNowRupees = 6000.0;
      const paidNowPaise = rupeesToPaise(paidNowRupees); // 600000 paise
      const balanceDuePaise = Math.max(0, totalAmountPaise - paidNowPaise); // 1000000 paise (₹10,000.00)

      expect(balanceDuePaise).toBe(1000000);
      expect(paiseToRupees(balanceDuePaise)).toBe(10000.0);
    });
  });

  describe('FIFO Payment Allocation Algorithm', () => {
    interface SimulatedBill {
      id: string;
      billNumber: string;
      balanceDuePaise: number;
      status: 'issued' | 'partially_paid' | 'paid';
    }

    function simulateFifoPayment(bills: SimulatedBill[], paymentAmountPaise: number) {
      let remainingPayment = paymentAmountPaise;
      const allocations: { billId: string; allocatedPaise: number }[] = [];

      for (const bill of bills) {
        if (remainingPayment <= 0) break;
        if (bill.balanceDuePaise <= 0) continue;

        const toAllocate = Math.min(remainingPayment, bill.balanceDuePaise);
        allocations.push({ billId: bill.id, allocatedPaise: toAllocate });

        bill.balanceDuePaise -= toAllocate;
        bill.status = bill.balanceDuePaise === 0 ? 'paid' : 'partially_paid';
        remainingPayment -= toAllocate;
      }

      return {
        allocations,
        advanceCreditPaise: remainingPayment,
        updatedBills: bills,
      };
    }

    it('allocates partial payment to the oldest open bill', () => {
      const openBills: SimulatedBill[] = [
        {
          id: 'b1',
          billNumber: 'CF-2026-27-0001',
          balanceDuePaise: 100000,
          status: 'issued',
        }, // ₹1,000 due
        {
          id: 'b2',
          billNumber: 'CF-2026-27-0002',
          balanceDuePaise: 250000,
          status: 'issued',
        }, // ₹2,500 due
      ];

      const result = simulateFifoPayment(openBills, 60000); // Payment of ₹600.00

      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0]?.billId).toBe('b1');
      expect(result.allocations[0]?.allocatedPaise).toBe(60000);
      expect(result.advanceCreditPaise).toBe(0);

      expect(openBills[0]?.balanceDuePaise).toBe(40000); // ₹400 remaining
      expect(openBills[0]?.status).toBe('partially_paid');
      expect(openBills[1]?.balanceDuePaise).toBe(250000);
      expect(openBills[1]?.status).toBe('issued');
    });

    it('cascades allocation across multiple open bills and stores excess as advance credit', () => {
      const openBills: SimulatedBill[] = [
        {
          id: 'b1',
          billNumber: 'CF-2026-27-0001',
          balanceDuePaise: 100000,
          status: 'partially_paid',
        }, // ₹1,000 due
        {
          id: 'b2',
          billNumber: 'CF-2026-27-0002',
          balanceDuePaise: 150000,
          status: 'issued',
        }, // ₹1,500 due
      ];

      // Payment of ₹3,000.00 (300,000 paise): should fully pay b1 (₹1,000), fully pay b2 (₹1,500), and leave ₹500 advance credit
      const result = simulateFifoPayment(openBills, 300000);

      expect(result.allocations).toHaveLength(2);
      expect(result.allocations[0]?.billId).toBe('b1');
      expect(result.allocations[0]?.allocatedPaise).toBe(100000);
      expect(result.allocations[1]?.billId).toBe('b2');
      expect(result.allocations[1]?.allocatedPaise).toBe(150000);

      expect(openBills[0]?.balanceDuePaise).toBe(0);
      expect(openBills[0]?.status).toBe('paid');

      expect(openBills[1]?.balanceDuePaise).toBe(0);
      expect(openBills[1]?.status).toBe('paid');

      expect(result.advanceCreditPaise).toBe(50000); // ₹500.00 surplus stored as advance credit
    });
  });

  describe('Validation Schemas (Financial Engine)', () => {
    it('validates product form schema', () => {
      const valid = {
        name: 'Gauri Cattle Feed 50kg',
        code: 'CF-GAURI-50',
        unit: 'bag',
        defaultPriceRupees: 1350.0,
        isActive: true,
      };
      expect(productFormSchema.safeParse(valid).success).toBe(true);

      const invalid = {
        name: '',
        unit: 'bag',
        defaultPriceRupees: -50,
      };
      expect(productFormSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates customer rate override schema', () => {
      const valid = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        specialPriceRupees: 1280.0,
        notes: 'Special wholesale volume discount',
      };
      expect(customerRateSchema.safeParse(valid).success).toBe(true);

      const invalid = {
        productId: 'not-a-uuid',
        specialPriceRupees: -10,
      };
      expect(customerRateSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates bill item form schema', () => {
      const valid = {
        productName: 'Wheat Bran 50kg',
        unit: 'bag',
        quantity: 5,
        unitPriceRupees: 950.0,
      };
      expect(billItemFormSchema.safeParse(valid).success).toBe(true);

      const invalid = {
        productName: '',
        unit: 'bag',
        quantity: -1,
        unitPriceRupees: 950.0,
      };
      expect(billItemFormSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates bill form schema', () => {
      const valid = {
        customerId: 'cust-123',
        billDate: '2026-11-08',
        dueDate: '2026-11-22',
        items: [
          {
            productName: 'Super Feed 50kg',
            unit: 'bag',
            quantity: 10,
            unitPriceRupees: 1400.0,
          },
        ],
        discountRupees: 200.0,
        paidNowRupees: 5000.0,
      };
      expect(billFormSchema.safeParse(valid).success).toBe(true);

      // Requires at least one line item
      const noItems = {
        customerId: 'cust-123',
        billDate: '2026-11-08',
        items: [],
      };
      expect(billFormSchema.safeParse(noItems).success).toBe(false);
    });

    it('validates payment form schema', () => {
      const valid = {
        customerId: 'cust-123',
        amountRupees: 5000.0,
        paymentMethod: 'upi',
        paymentDate: '2026-11-08',
        referenceDetails: 'UPI-REF-987654321',
      };
      expect(paymentFormSchema.safeParse(valid).success).toBe(true);

      // Rejects non-positive payment amount
      const zeroAmount = {
        customerId: 'cust-123',
        amountRupees: 0,
        paymentMethod: 'cash',
        paymentDate: '2026-11-08',
      };
      expect(paymentFormSchema.safeParse(zeroAmount).success).toBe(false);
    });

    it('validates bill cancellation reason schema', () => {
      expect(
        billCancellationSchema.safeParse({ reason: 'Customer requested order change' })
          .success,
      ).toBe(true);
      expect(billCancellationSchema.safeParse({ reason: 'ab' }).success).toBe(false); // min 3 chars
      expect(billCancellationSchema.safeParse({ reason: '' }).success).toBe(false);
    });

    it('validates Khate Utara statement filter schema', () => {
      const valid = {
        customerId: 'cust-123',
        fromDate: '2026-04-01',
        toDate: '2026-11-08',
      };
      expect(khateUtaraFilterSchema.safeParse(valid).success).toBe(true);

      const invalidDate = {
        customerId: 'cust-123',
        fromDate: '01-04-2026', // invalid format
        toDate: '2026-11-08',
      };
      expect(khateUtaraFilterSchema.safeParse(invalidDate).success).toBe(false);
    });
  });
});
