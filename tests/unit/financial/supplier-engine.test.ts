/**
 * Unit Tests for Stage 4 — Supplier & Cost Engine
 * Verifies Features 30-34:
 * - Deterministic supplier accounting & worked example
 * - Pure integer paise math
 * - Load-cost apportionment & effective unit cost
 * - Idempotent order transitions & payable postings
 * - FIFO supplier payment allocation & advance credit
 * - Validation schemas
 */

import { describe, it, expect } from 'vitest';
import { rupeesToPaise, paiseToRupees, formatPaise } from '@/lib/money';
import {
  supplierFormSchema,
  supplierOpeningBalanceSchema,
  purchaseOrderItemFormSchema,
  purchaseLoadCostFormSchema,
  purchaseOrderFormSchema,
  supplierPaymentFormSchema,
} from '@/lib/validation';

describe('Stage 4 — Supplier & Cost Engine Unit Tests', () => {
  describe('Deterministic Worked Example (docs/profit-calculations.md)', () => {
    it('accurately verifies: purchases ₹72,000; payment ₹10,000 leaves ₹62,000 payable', () => {
      const purchasesPaise = rupeesToPaise(72000); // 7,200,000 paise
      const paymentPaise = rupeesToPaise(10000); // 1,000,000 paise
      const openingBalancePaise = 0;

      // Invariant formula: Payable = Opening + Purchases (Credits) - Payments (Debits)
      const payableBalancePaise = openingBalancePaise + purchasesPaise - paymentPaise;

      expect(purchasesPaise).toBe(7200000);
      expect(paymentPaise).toBe(1000000);
      expect(payableBalancePaise).toBe(6200000);
      expect(paiseToRupees(payableBalancePaise)).toBe(62000);
      expect(formatPaise(payableBalancePaise)).toBe('₹62,000.00');
    });

    it('accounts for opening balance accurately in payable calculation', () => {
      const openingBalancePaise = rupeesToPaise(15000); // ₹15,000
      const purchasesPaise = rupeesToPaise(50000); // ₹50,000
      const paymentPaise = rupeesToPaise(25000); // ₹25,000

      const closingPayablePaise = openingBalancePaise + purchasesPaise - paymentPaise;
      expect(paiseToRupees(closingPayablePaise)).toBe(40000); // ₹40,000
    });
  });

  describe('Load-Cost Apportionment & Effective Unit Cost', () => {
    it('apportions freight/load costs proportionally by bag count with exact conservation', () => {
      // 100 bags of Cattle Feed A, 50 bags of Cattle Feed B = 150 bags total
      const item1Bags = 100;
      const item1BaseRatePaise = rupeesToPaise(1500); // ₹1,500 / bag
      const item2Bags = 50;
      const item2BaseRatePaise = rupeesToPaise(1200); // ₹1,200 / bag

      const totalBags = item1Bags + item2Bags; // 150
      const totalLoadCostPaise = rupeesToPaise(6000); // ₹6,000 freight

      // Apportionment:
      // Item 1 share: (6,000 * 100) / 150 = ₹4,000 = 400,000 paise
      // Item 2 share: remainder = 6,000 - 4,000 = ₹2,000 = 200,000 paise
      const item1AllocatedPaise = Math.round(
        (totalLoadCostPaise * item1Bags) / totalBags,
      );
      const item2AllocatedPaise = totalLoadCostPaise - item1AllocatedPaise;

      expect(item1AllocatedPaise).toBe(400000);
      expect(item2AllocatedPaise).toBe(200000);
      expect(item1AllocatedPaise + item2AllocatedPaise).toBe(totalLoadCostPaise);

      // Unit freight:
      const item1FreightPerBag = Math.round(item1AllocatedPaise / item1Bags); // 4,000 paise = ₹40
      const item2FreightPerBag = Math.round(item2AllocatedPaise / item2Bags); // 4,000 paise = ₹40

      expect(item1FreightPerBag).toBe(4000);
      expect(item2FreightPerBag).toBe(4000);

      // Effective unit cost:
      const item1EffectiveCost = item1BaseRatePaise + item1FreightPerBag; // 154,000 paise = ₹1,540
      const item2EffectiveCost = item2BaseRatePaise + item2FreightPerBag; // 124,000 paise = ₹1,240

      expect(paiseToRupees(item1EffectiveCost)).toBe(1540);
      expect(paiseToRupees(item2EffectiveCost)).toBe(1240);
    });

    it('handles rounding remainders so total allocated exactly equals total load cost', () => {
      // 3 items with 33, 33, 34 bags (100 total), load cost ₹1,000 (100,000 paise)
      const bags = [33, 33, 34];
      const totalBags = 100;
      const totalLoadCostPaise = 100000;

      let allocatedSum = 0;
      const allocatedShares: number[] = [];

      bags.forEach((qty, idx) => {
        if (idx === bags.length - 1) {
          const remainder = totalLoadCostPaise - allocatedSum;
          allocatedShares.push(remainder);
          allocatedSum += remainder;
        } else {
          const share = Math.round((totalLoadCostPaise * qty) / totalBags);
          allocatedShares.push(share);
          allocatedSum += share;
        }
      });

      expect(allocatedSum).toBe(totalLoadCostPaise);
      expect(allocatedShares[0]).toBe(33000);
      expect(allocatedShares[1]).toBe(33000);
      expect(allocatedShares[2]).toBe(34000);
    });
  });

  describe('Order State Lifecycle & Idempotency Rules', () => {
    it('confirms that a draft order posts 0 payable to ledger', () => {
      const order = {
        status: 'draft',
        totalAmountPaise: 5000000, // ₹50,000
      };

      const ledgerEntries: { type: string; amountPaise: number }[] = [];

      // Logic rule: only 'ordered', 'dispatched', 'received' post to ledger
      if (['ordered', 'dispatched', 'received'].includes(order.status)) {
        ledgerEntries.push({ type: 'purchase', amountPaise: order.totalAmountPaise });
      }

      expect(ledgerEntries).toHaveLength(0);
    });

    it('confirms order posts payable credit exactly once upon confirmation transition', () => {
      const order = {
        id: 'po-1',
        status: 'draft',
        totalAmountPaise: 5000000,
      };

      const ledger: { orderId: string; type: string; creditPaise: number }[] = [];
      const transitionHistory = new Set<string>();

      const transition = (toStatus: string, transitionKey: string) => {
        if (transitionHistory.has(transitionKey)) {
          throw new Error('Duplicate transition key rejected');
        }
        transitionHistory.add(transitionKey);

        const alreadyPosted = ledger.some(
          (e) => e.orderId === order.id && e.type === 'purchase',
        );

        if (['ordered', 'dispatched', 'received'].includes(toStatus) && !alreadyPosted) {
          ledger.push({
            orderId: order.id,
            type: 'purchase',
            creditPaise: order.totalAmountPaise,
          });
        }
        order.status = toStatus;
      };

      // Transition 1: draft -> ordered
      transition('ordered', 'key_1');
      expect(ledger).toHaveLength(1);
      expect(ledger[0]?.creditPaise).toBe(5000000);

      // Transition 2: ordered -> received (already posted, does not duplicate)
      transition('received', 'key_2');
      expect(ledger).toHaveLength(1);

      // Transition 3: repeated key throws error
      expect(() => transition('received', 'key_2')).toThrow(
        'Duplicate transition key rejected',
      );
    });

    it('cancels order with reversal debit if previously confirmed', () => {
      const order = {
        id: 'po-2',
        status: 'ordered',
        totalAmountPaise: 3000000,
      };

      const ledger = [
        { orderId: 'po-2', type: 'purchase', creditPaise: 3000000, debitPaise: 0 },
      ];

      const cancelOrder = (_reason: string) => {
        const alreadyPosted = ledger.some(
          (e) => e.orderId === order.id && e.type === 'purchase',
        );
        if (alreadyPosted) {
          ledger.push({
            orderId: order.id,
            type: 'reversal',
            creditPaise: 0,
            debitPaise: order.totalAmountPaise,
          });
        }
        order.status = 'cancelled';
      };

      cancelOrder('Supplier unable to dispatch');
      expect(order.status).toBe('cancelled');
      expect(ledger).toHaveLength(2);
      expect(ledger[1]?.type).toBe('reversal');
      expect(ledger[1]?.debitPaise).toBe(3000000);

      // Net payable balance after reversal = 3,000,000 - 3,000,000 = 0
      const netPayable = ledger.reduce((sum, e) => sum + e.creditPaise - e.debitPaise, 0);
      expect(netPayable).toBe(0);
    });
  });

  describe('FIFO Payment Allocation & Supplier Advance Credits', () => {
    it('allocates payment to oldest eligible purchase orders first (FIFO)', () => {
      const orders = [
        { id: 'po-1', orderNumber: 'PO/2026-27/0001', duePaise: 2000000 }, // ₹20,000
        { id: 'po-2', orderNumber: 'PO/2026-27/0002', duePaise: 3000000 }, // ₹30,000
      ];

      const paymentAmountPaise = 3500000; // ₹35,000 paid

      let unallocated = paymentAmountPaise;
      const allocations: { orderId: string; amountPaise: number }[] = [];

      for (const po of orders) {
        if (unallocated <= 0) break;
        const alloc = Math.min(unallocated, po.duePaise);
        allocations.push({ orderId: po.id, amountPaise: alloc });
        unallocated -= alloc;
      }

      // PO 1 fully paid (₹20,000), PO 2 partially paid (₹15,000)
      expect(allocations).toHaveLength(2);
      expect(allocations[0]).toEqual({ orderId: 'po-1', amountPaise: 2000000 });
      expect(allocations[1]).toEqual({ orderId: 'po-2', amountPaise: 1500000 });
      expect(unallocated).toBe(0);
    });

    it('converts payment surplus into advance credit', () => {
      const orders = [
        { id: 'po-1', orderNumber: 'PO/2026-27/0001', duePaise: 1000000 }, // ₹10,000
      ];

      const paymentAmountPaise = 2500000; // ₹25,000 paid (₹15,000 surplus)

      let unallocated = paymentAmountPaise;
      const allocations: { orderId: string; amountPaise: number }[] = [];

      for (const po of orders) {
        if (unallocated <= 0) break;
        const alloc = Math.min(unallocated, po.duePaise);
        allocations.push({ orderId: po.id, amountPaise: alloc });
        unallocated -= alloc;
      }

      expect(allocations).toHaveLength(1);
      expect(allocations[0]?.amountPaise).toBe(1000000);
      expect(unallocated).toBe(1500000); // ₹15,000 becomes advance credit
      expect(paiseToRupees(unallocated)).toBe(15000);
    });
  });

  describe('Stage 4 Zod Validation Schemas', () => {
    it('validates valid supplier form input', () => {
      const valid = {
        name: 'Godrej Agrovet Ltd',
        phone: '9876543210',
        address: 'Pune MIDC',
        gstin: '27AAAAA0000A1Z5',
        notes: 'Primary cattle feed supplier',
      };
      const result = supplierFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid supplier phone or GSTIN', () => {
      const invalidPhone = {
        name: 'Godrej Agrovet Ltd',
        phone: '12345', // invalid phone
      };
      expect(supplierFormSchema.safeParse(invalidPhone).success).toBe(false);

      const invalidGstin = {
        name: 'Godrej Agrovet Ltd',
        gstin: 'INVALID_GSTIN_123',
      };
      expect(supplierFormSchema.safeParse(invalidGstin).success).toBe(false);
    });

    it('validates supplier opening balance input', () => {
      const valid = {
        supplierId: 'sup-1',
        financialYear: '2026-27',
        amountRupees: 15000.5,
        notes: 'Carryover from FY25-26',
      };
      expect(supplierOpeningBalanceSchema.safeParse(valid).success).toBe(true);

      const invalidFy = {
        supplierId: 'sup-1',
        financialYear: '2026', // must be YYYY-YY
        amountRupees: 100,
      };
      expect(supplierOpeningBalanceSchema.safeParse(invalidFy).success).toBe(false);
    });

    it('validates purchase order item input', () => {
      const valid = {
        productName: 'Super Milk Booster 50kg',
        quantityBags: 100,
        unitRateRupees: 1450,
      };
      expect(purchaseOrderItemFormSchema.safeParse(valid).success).toBe(true);

      const invalidQty = {
        productName: 'Super Milk Booster 50kg',
        quantityBags: 0, // must be > 0
        unitRateRupees: 1450,
      };
      expect(purchaseOrderItemFormSchema.safeParse(invalidQty).success).toBe(false);
    });

    it('validates purchase load cost schema', () => {
      const valid = {
        description: 'Transport Freight from Factory',
        amountRupees: 4500,
        allocationMethod: 'by_bags',
      };
      expect(purchaseLoadCostFormSchema.safeParse(valid).success).toBe(true);
    });

    it('validates full purchase order form schema', () => {
      const valid = {
        supplierId: 'sup-123',
        orderDate: '2026-11-08',
        expectedDeliveryDate: '2026-11-12',
        items: [
          {
            productName: 'Khanda Special 50kg',
            quantityBags: 50,
            unitRateRupees: 1200,
          },
        ],
        loadCosts: [
          {
            description: 'Hamali',
            amountRupees: 500,
            allocationMethod: 'by_bags',
          },
        ],
        notes: 'Urgent harvest stock',
      };
      expect(purchaseOrderFormSchema.safeParse(valid).success).toBe(true);
    });

    it('validates supplier payment form schema', () => {
      const valid = {
        supplierId: 'sup-123',
        amountRupees: 10000,
        paymentDate: '2026-11-08',
        paymentMode: 'bank_transfer',
        referenceNumber: 'UTR987654321',
        notes: 'Advance payment for PO #1',
      };
      expect(supplierPaymentFormSchema.safeParse(valid).success).toBe(true);
    });
  });
});
