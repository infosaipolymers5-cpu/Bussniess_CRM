import { describe, it, expect } from 'vitest';
import {
  normalizePhoneNumber,
  isValidIndianMobile,
  customerFormSchema,
  pvcQuickAddSchema,
  customerNoteSchema,
  customerGroupSchema,
  customerTagSchema,
  publicQrRegistrationSchema,
  importRowSchema,
} from '@/lib/validation';
import { parseCsvText } from '@/features/imports/api/importService';
import { rupeesToPaise } from '@/lib/money';

describe('Stage 2 — CRM & Marketing Foundation Unit Tests', () => {
  describe('Phone Number Normalization & Validation', () => {
    it('normalizes standard 10-digit Indian phone numbers', () => {
      expect(normalizePhoneNumber('9876543210')).toBe('9876543210');
      expect(normalizePhoneNumber('8123456789')).toBe('8123456789');
      expect(normalizePhoneNumber('7012345678')).toBe('7012345678');
      expect(normalizePhoneNumber('6912345678')).toBe('6912345678');
    });

    it('strips international prefixes, leading zeroes, spaces, and hyphens', () => {
      expect(normalizePhoneNumber('+91 98765 43210')).toBe('9876543210');
      expect(normalizePhoneNumber('+91-9876543210')).toBe('9876543210');
      expect(normalizePhoneNumber('919876543210')).toBe('9876543210');
      expect(normalizePhoneNumber('09876543210')).toBe('9876543210');
      expect(normalizePhoneNumber(' 9876-543-210 ')).toBe('9876543210');
      expect(normalizePhoneNumber('(0) 98765 43210')).toBe('9876543210');
    });

    it('validates authentic Indian mobile numbers (starts with 6, 7, 8, or 9)', () => {
      expect(isValidIndianMobile('9876543210')).toBe(true);
      expect(isValidIndianMobile('+91 88765 43210')).toBe(true);
      expect(isValidIndianMobile('7876543210')).toBe(true);
      expect(isValidIndianMobile('6876543210')).toBe(true);

      // Invalid starting digits
      expect(isValidIndianMobile('5876543210')).toBe(false);
      expect(isValidIndianMobile('1234567890')).toBe(false);
      expect(isValidIndianMobile('0000000000')).toBe(false);

      // Invalid lengths
      expect(isValidIndianMobile('98765')).toBe(false);
      expect(isValidIndianMobile('9876543210123')).toBe(false);
      expect(isValidIndianMobile('')).toBe(false);
    });
  });

  describe('PVC Quick-Add Validation Schema (Feature 43)', () => {
    it('accepts valid PVC quick-add input with required Name, Phone, and DOB', () => {
      const valid = {
        name: 'Suresh Patil',
        phone: '9822334455',
        dateOfBirth: '1990-05-15',
        area: 'Chikhali',
      };
      const result = pvcQuickAddSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('accepts PVC quick-add without optional area', () => {
      const valid = {
        name: 'Ganesh Deshmukh',
        phone: '+91 9922334455',
        dateOfBirth: '1988-12-01',
      };
      const result = pvcQuickAddSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects PVC quick-add if Name is missing or empty', () => {
      const invalid = {
        name: '',
        phone: '9822334455',
        dateOfBirth: '1990-05-15',
      };
      const result = pvcQuickAddSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects PVC quick-add if DOB is missing (mandatory for PVC greeting campaigns)', () => {
      const invalid = {
        name: 'Suresh Patil',
        phone: '9822334455',
        dateOfBirth: '',
      };
      const result = pvcQuickAddSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects PVC quick-add if phone number is invalid', () => {
      const invalid = {
        name: 'Suresh Patil',
        phone: '12345',
        dateOfBirth: '1990-05-15',
      };
      const result = pvcQuickAddSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Customer Form Schema (Cattle Feed & PVC Full Profile)', () => {
    it('accepts customer without DOB or Area for general profile', () => {
      const valid = {
        name: 'Ramesh Kulkarni',
        phone: '9850123456',
        dateOfBirth: '',
        area: '',
        notes: 'Regular feed buyer',
      };
      const result = customerFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid phone numbers in general customer form', () => {
      const invalid = {
        name: 'Ramesh Kulkarni',
        phone: 'abcdefghij',
      };
      const result = customerFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Customer Groups & Tags Schemas (Feature 2)', () => {
    it('validates customer group creation schema', () => {
      expect(
        customerGroupSchema.safeParse({ name: 'Dairy Farmers Tier 1' }).success,
      ).toBe(true);
      expect(
        customerGroupSchema.safeParse({
          name: 'Wholesale Buyers',
          description: 'Minimum 50 bags per order',
        }).success,
      ).toBe(true);
      expect(customerGroupSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('validates tag schema with hex color defaults', () => {
      expect(
        customerTagSchema.safeParse({ name: 'High Value', color: '#10b981' }).success,
      ).toBe(true);
      expect(customerTagSchema.safeParse({ name: '' }).success).toBe(false);
    });
  });

  describe('Customer Call Notes & Promise-To-Pay (Feature 3)', () => {
    it('validates call note and optional promise-to-pay date', () => {
      const valid = {
        content:
          'Spoke regarding outstanding balance. Customer promised payment next Monday.',
        callDate: '2026-11-08',
        promiseToPayDate: '2026-11-15',
      };
      const result = customerNoteSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('accepts call note without promise-to-pay date', () => {
      const valid = {
        content: 'Inquired about sugarcane feed availability.',
      };
      const result = customerNoteSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects empty content in customer note', () => {
      const invalid = {
        content: '   ',
      };
      const result = customerNoteSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Public QR Self-Registration & Consent Schema (Feature 5)', () => {
    it('validates public QR self-registration with explicit consent', () => {
      const valid = {
        name: 'Vikas Jadhav',
        whatsappPhone: '9860123456',
        dateOfBirth: '1992-07-20',
        categoryInterest: 'Cattle Feed',
        consentRecorded: true,
      };
      const result = publicQrRegistrationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('strictly enforces explicit consent: rejects registration if consent is false', () => {
      const withoutConsent = {
        name: 'Vikas Jadhav',
        whatsappPhone: '9860123456',
        dateOfBirth: '1992-07-20',
        consentRecorded: false,
      };
      const result = publicQrRegistrationSchema.safeParse(withoutConsent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toMatch(/consent/i);
      }
    });

    it('rejects registration with invalid phone number', () => {
      const invalidPhone = {
        name: 'Vikas Jadhav',
        whatsappPhone: '445566',
        dateOfBirth: '1992-07-20',
        consentRecorded: true,
      };
      const result = publicQrRegistrationSchema.safeParse(invalidPhone);
      expect(result.success).toBe(false);
    });
  });

  describe('CSV Import Parser & Opening Balance Validation (Feature 39)', () => {
    it('parses CSV text into header-keyed objects', () => {
      const csv = `Name,Phone,DOB,Area,OpeningBalance,BusinessType
Ramesh Patil,9876543210,1985-04-12,Chikhali,1250.00,cattle_feed
Ganesh Shinde,9823456789,1990-08-25,Shivaji Nagar,0,pvc`;

      const rows = parseCsvText(csv);
      expect(rows).toHaveLength(2);
      expect(rows[0]?.['Name']).toBe('Ramesh Patil');
      expect(rows[0]?.['Phone']).toBe('9876543210');
      expect(rows[0]?.['OpeningBalance']).toBe('1250.00');
      expect(rows[1]?.['BusinessType']).toBe('pvc');
    });

    it('handles quoted fields and commas inside quotes properly', () => {
      const csv = `Name,Phone,Area
"Patil, Ramesh",9876543210,"Chikhali, Buldhana"`;
      const rows = parseCsvText(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.['Name']).toBe('Patil, Ramesh');
      expect(rows[0]?.['Area']).toBe('Chikhali, Buldhana');
    });

    it('validates import row schema and converts rupees to integer paise', () => {
      const row = {
        name: 'Ramesh Patil',
        phone: '9876543210',
        dateOfBirth: '1985-04-12',
        area: 'Chikhali',
        openingBalanceRupees: 1250.5,
        businessType: 'cattle_feed',
      };

      const result = importRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      if (result.success) {
        const paise = rupeesToPaise(result.data.openingBalanceRupees);
        expect(paise).toBe(125050);
        expect(Number.isInteger(paise)).toBe(true);
      }
    });

    it('rejects negative opening balance amounts in import rows', () => {
      const negativeBalanceRow = {
        name: 'Ramesh Patil',
        phone: '9876543210',
        openingBalanceRupees: -500,
        businessType: 'cattle_feed',
      };
      const result = importRowSchema.safeParse(negativeBalanceRow);
      expect(result.success).toBe(false);
    });
  });
});
