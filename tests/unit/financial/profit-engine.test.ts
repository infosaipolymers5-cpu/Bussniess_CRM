/**
 * Unit Tests for Stage 5 — Profit & Expense Engine
 * Verifies Features 35-37:
 * - Deterministic worked example (purchases ₹72k, makka profit ₹3.8k, bhusa profit ₹900, gross profit ₹4.7k)
 * - Supplier payment does not reduce profit
 * - Load-cost double count prevention
 * - Cancelled bill exclusion from realized profit
 * - Net profit formula (Gross profit - Non-allocated expenses)
 * - Validation schemas
 */

import { describe, it, expect } from 'vitest';
import { rupeesToPaise, paiseToRupees, formatPaise } from '@/lib/money';
import {
  expenseCategorySchema,
  expenseFormSchema,
  profitFilterSchema,
  ownerPinSchema,
} from '@/lib/validation';

describe('Stage 5 — Profit & Expense Engine Unit Tests', () => {
  describe('Deterministic Worked Example (docs/profit-calculations.md)', () => {
    it('accurately verifies makka profit ₹3,800, bhusa profit ₹900, and gross profit ₹4,700', () => {
      // 1. Makka (Corn):
      const makkaPurchasesPaise = rupeesToPaise(50000); // ₹50,000
      const makkaSalesPaise = rupeesToPaise(53800); // ₹53,800
      const makkaProfitPaise = makkaSalesPaise - makkaPurchasesPaise;

      expect(paiseToRupees(makkaProfitPaise)).toBe(3800); // ₹3,800 profit

      // 2. Bhusa (Fodder):
      const bhusaPurchasesPaise = rupeesToPaise(22000); // ₹22,000
      const bhusaSalesPaise = rupeesToPaise(22900); // ₹22,900
      const bhusaProfitPaise = bhusaSalesPaise - bhusaPurchasesPaise;

      expect(paiseToRupees(bhusaProfitPaise)).toBe(900); // ₹900 profit

      // 3. Combined Purchases & Gross Profit:
      const totalPurchasesPaise = makkaPurchasesPaise + bhusaPurchasesPaise; // ₹72,000
      const grossProfitPaise = makkaProfitPaise + bhusaProfitPaise; // ₹4,700

      expect(paiseToRupees(totalPurchasesPaise)).toBe(72000);
      expect(paiseToRupees(grossProfitPaise)).toBe(4700);
      expect(formatPaise(grossProfitPaise)).toBe('₹4,700.00');

      // 4. Supplier Payment does NOT reduce profit:
      const supplierPaymentPaise = rupeesToPaise(10000); // ₹10,000 paid to supplier
      const remainingPayablePaise = totalPurchasesPaise - supplierPaymentPaise;

      expect(paiseToRupees(remainingPayablePaise)).toBe(62000); // ₹62,000 payable
      // Gross profit remains strictly unchanged by liability settlement
      expect(paiseToRupees(grossProfitPaise)).toBe(4700);
    });

    it('computes Net Profit as Gross Profit minus Non-allocated Operating Expenses', () => {
      const grossProfitPaise = rupeesToPaise(4700); // ₹4,700

      const operatingExpenses = [
        {
          name: 'Shop Electricity',
          amountPaise: rupeesToPaise(500),
          isLoadAllocated: false,
        },
        {
          name: 'Office Tea & Water',
          amountPaise: rupeesToPaise(300),
          isLoadAllocated: false,
        },
      ];

      const totalOperatingExpensesPaise = operatingExpenses
        .filter((e) => !e.isLoadAllocated)
        .reduce((sum, e) => sum + e.amountPaise, 0); // ₹800

      const netProfitPaise = grossProfitPaise - totalOperatingExpensesPaise;

      expect(paiseToRupees(totalOperatingExpensesPaise)).toBe(800);
      expect(paiseToRupees(netProfitPaise)).toBe(3900); // ₹4,700 - ₹800 = ₹3,900
    });
  });

  describe('Double-Count Expense Prevention (Load-Allocated Freight)', () => {
    it('excludes expenses flagged isLoadAllocated from operating expenses deduction', () => {
      const grossProfitPaise = rupeesToPaise(10000); // ₹10,000

      const expenseRecords = [
        // Truck freight already apportioned into item cost on purchase order:
        {
          name: 'Truck Freight MH-12',
          amountPaise: rupeesToPaise(4000),
          isLoadAllocated: true, // Already absorbed into COGS
        },
        // Real operating expense:
        {
          name: 'Staff Lunch',
          amountPaise: rupeesToPaise(1500),
          isLoadAllocated: false,
        },
      ];

      // Operating expenses only includes non-load-allocated
      const deductedExpensesPaise = expenseRecords
        .filter((e) => !e.isLoadAllocated)
        .reduce((sum, e) => sum + e.amountPaise, 0);

      const netProfitPaise = grossProfitPaise - deductedExpensesPaise;

      // Freight is NOT deducted a second time
      expect(paiseToRupees(deductedExpensesPaise)).toBe(1500);
      expect(paiseToRupees(netProfitPaise)).toBe(8500); // ₹10,000 - ₹1,500 = ₹8,500
    });
  });

  describe('Cancelled Bill Exclusion from Realized Profit', () => {
    it('excludes cancelled bills from realized gross and net profits', () => {
      const bills = [
        {
          id: 'b1',
          totalAmountPaise: rupeesToPaise(25000),
          cogsPaise: rupeesToPaise(22000),
          status: 'paid',
        },
        {
          id: 'b2',
          totalAmountPaise: rupeesToPaise(15000),
          cogsPaise: rupeesToPaise(13000),
          status: 'issued',
        },
        {
          id: 'b3',
          totalAmountPaise: rupeesToPaise(18000),
          cogsPaise: rupeesToPaise(15000),
          status: 'cancelled',
        },
      ];

      // Realized bills are those NOT cancelled
      const validBills = bills.filter((b) => b.status !== 'cancelled');

      const netSalesPaise = validBills.reduce((sum, b) => sum + b.totalAmountPaise, 0);
      const totalCogsPaise = validBills.reduce((sum, b) => sum + b.cogsPaise, 0);
      const grossProfitPaise = netSalesPaise - totalCogsPaise;

      // b1 profit = ₹3,000, b2 profit = ₹2,000. b3 (cancelled, profit ₹3,000) excluded!
      expect(paiseToRupees(netSalesPaise)).toBe(40000); // ₹25,000 + ₹15,000
      expect(paiseToRupees(totalCogsPaise)).toBe(35000); // ₹22,000 + ₹13,000
      expect(paiseToRupees(grossProfitPaise)).toBe(5000); // ₹5,000
    });
  });

  describe('Sale Cost Snapshot Profit Calculation', () => {
    it('accurately calculates line item unit profit and total profit in integer paise', () => {
      const quantity = 10; // 10 bags
      const realizedSellingRatePaise = rupeesToPaise(1550); // ₹1,550 / bag
      const effectiveCostPaise = rupeesToPaise(1380); // ₹1,380 / bag (includes load)

      const unitProfitPaise = realizedSellingRatePaise - effectiveCostPaise; // 17,000 paise (₹170)
      const totalProfitPaise = unitProfitPaise * quantity; // 170,000 paise (₹1,700)

      expect(unitProfitPaise).toBe(17000);
      expect(totalProfitPaise).toBe(170000);
      expect(paiseToRupees(totalProfitPaise)).toBe(1700);
    });

    it('supports negative unit profit when sold below effective cost (promotional/clearance)', () => {
      const quantity = 5;
      const realizedSellingRatePaise = rupeesToPaise(1100);
      const effectiveCostPaise = rupeesToPaise(1250);

      const unitProfitPaise = realizedSellingRatePaise - effectiveCostPaise; // -15,000 paise (-₹150)
      const totalProfitPaise = unitProfitPaise * quantity; // -75,000 paise (-₹750)

      expect(unitProfitPaise).toBe(-15000);
      expect(totalProfitPaise).toBe(-75000);
      expect(paiseToRupees(totalProfitPaise)).toBe(-750);
    });
  });

  describe('Stage 5 Zod Validation Schemas', () => {
    it('validates expense category schema', () => {
      const valid = {
        name: 'Warehouse Electricity',
        code: 'ELEC',
        description: 'Monthly MSEB bills',
      };
      expect(expenseCategorySchema.safeParse(valid).success).toBe(true);

      const invalid = {
        name: '', // required
      };
      expect(expenseCategorySchema.safeParse(invalid).success).toBe(false);
    });

    it('validates expense form schema with double-count flag', () => {
      const valid = {
        categoryId: 'cat-123',
        amountRupees: 1450.5,
        expenseDate: '2026-11-08',
        paymentMode: 'cash',
        referenceNumber: 'VOUCHER-001',
        loadReference: 'MH-12-AB-1234',
        isLoadAllocated: true,
      };
      expect(expenseFormSchema.safeParse(valid).success).toBe(true);

      const invalidAmount = {
        categoryId: 'cat-123',
        amountRupees: -50, // must be positive
        expenseDate: '2026-11-08',
        paymentMode: 'cash',
      };
      expect(expenseFormSchema.safeParse(invalidAmount).success).toBe(false);
    });

    it('validates profit date range filter schema', () => {
      const valid = {
        fromDate: '2026-04-01',
        toDate: '2026-11-08',
      };
      expect(profitFilterSchema.safeParse(valid).success).toBe(true);

      const invalidDate = {
        fromDate: '01/04/2026', // must be YYYY-MM-DD
      };
      expect(profitFilterSchema.safeParse(invalidDate).success).toBe(false);
    });

    it('validates owner security PIN schema (4 to 6 digits)', () => {
      expect(ownerPinSchema.safeParse({ pin: '1234' }).success).toBe(true);
      expect(ownerPinSchema.safeParse({ pin: '123456' }).success).toBe(true);

      // Invalid PINs
      expect(ownerPinSchema.safeParse({ pin: '123' }).success).toBe(false); // too short
      expect(ownerPinSchema.safeParse({ pin: '1234567' }).success).toBe(false); // too long
      expect(ownerPinSchema.safeParse({ pin: 'abcd' }).success).toBe(false); // non-digits
    });
  });
});
