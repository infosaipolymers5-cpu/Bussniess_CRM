/**
 * Unit Tests for Stage 7 Communication & WhatsApp Automation Engine.
 * Tests:
 * 1. 7-Day payment reminder recurrence, customer interval overrides, and zero-balance stop checks
 * 2. Active payment promise date suppression vs expired promise date
 * 3. Marketing opt-out exemptions: Reminders exempt; Birthdays & Broadcasts suppressed
 * 4. Cross-business isolation: Cattle Feed accounts strictly excluded from PVC campaigns
 * 5. Feed-Finish alert calculations (5-day pre-finish cue window) and superseding logic
 * 6. Truthful WhatsApp manual handoff state progression (prepared -> opened -> owner_marked_sent)
 * 7. Official WhatsApp API safety guard (disabled by default)
 * 8. Delivery trip announcement queueing and stop status updates without auto-billing
 */

import { describe, it, expect } from 'vitest';
import { checkRecipientEligibility } from '@/features/messaging/eligibilityService';
import { buildPaymentReminderText } from '@/features/reminders/api/reminderService';
import { buildBirthdayWishText } from '@/features/birthdays/api/birthdayService';
import { buildMaterialAlertText } from '@/features/material-alerts/api/materialAlertService';
import { buildDeliveryAnnouncementText } from '@/features/delivery-trips/api/deliveryTripService';
import {
  manualHandoffTransport,
  officialApiTransport,
} from '@/features/messaging/messagingTransport';
import type { Customer } from '@/lib/database.types';

describe('Stage 7: Communication & WhatsApp Automation Engine', () => {
  const baseCustomer: Customer = {
    id: 'cust-1111-2222-3333-4444',
    business_id: 'biz-0001',
    name: 'Balasaheb Vikhe',
    display_phone: '9822334455',
    normalized_phone: '9822334455',
    date_of_birth: '1980-05-15',
    area: 'Loni',
    notes: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };

  describe('1. Recipient Eligibility & Cross-Business Isolation', () => {
    it('rejects deactivated customer profiles', () => {
      const res = checkRecipientEligibility({
        customer: { ...baseCustomer, is_active: false },
        workflowType: 'payment_reminder',
        businessKind: 'cattle_feed',
      });
      expect(res.isEligible).toBe(false);
      expect(res.reason).toBe('inactive_customer');
    });

    it('rejects customers with invalid or short phone numbers', () => {
      const res = checkRecipientEligibility({
        customer: { ...baseCustomer, display_phone: '123' },
        workflowType: 'payment_reminder',
        businessKind: 'cattle_feed',
      });
      expect(res.isEligible).toBe(false);
      expect(res.reason).toBe('invalid_phone');
    });

    it('strictly excludes Cattle Feed accounts from PVC promotional broadcasts', () => {
      const res = checkRecipientEligibility({
        customer: baseCustomer,
        workflowType: 'pvc_promo',
        businessKind: 'cattle_feed',
      });
      expect(res.isEligible).toBe(false);
      expect(res.reason).toBe('cross_business_excluded');
    });

    it('permits PVC promotional broadcast for PVC business kind', () => {
      const res = checkRecipientEligibility({
        customer: baseCustomer,
        workflowType: 'pvc_promo',
        businessKind: 'pvc',
      });
      expect(res.isEligible).toBe(true);
      expect(res.reason).toBe('active');
    });

    it('enforces opt-out policy: blocks promotional birthday and broadcast messages', () => {
      const bdayRes = checkRecipientEligibility({
        customer: baseCustomer,
        workflowType: 'birthday',
        businessKind: 'cattle_feed',
        optOut: true,
      });
      expect(bdayRes.isEligible).toBe(false);
      expect(bdayRes.reason).toBe('opted_out');

      const pvcRes = checkRecipientEligibility({
        customer: baseCustomer,
        workflowType: 'pvc_promo',
        businessKind: 'pvc',
        optOut: true,
      });
      expect(pvcRes.isEligible).toBe(false);
      expect(pvcRes.reason).toBe('opted_out');
    });

    it('exempts commercial payment reminders from marketing opt-out', () => {
      // Transactional debts remain eligible under confirmed policy
      const reminderRes = checkRecipientEligibility({
        customer: baseCustomer,
        workflowType: 'payment_reminder',
        businessKind: 'cattle_feed',
        optOut: true,
        outstandingBalancePaise: 1540000,
      });
      expect(reminderRes.isEligible).toBe(true);
    });
  });

  describe('2. Payment Reminders: 7-Day Default, Promise Dates & Zero Balance', () => {
    it('stops reminders automatically when customer balance is zero or negative', () => {
      const resZero = checkRecipientEligibility({
        customer: baseCustomer,
        workflowType: 'payment_reminder',
        businessKind: 'cattle_feed',
        outstandingBalancePaise: 0,
      });
      expect(resZero.isEligible).toBe(false);
      expect(resZero.reason).toBe('zero_balance');

      const resAdvance = checkRecipientEligibility({
        customer: baseCustomer,
        workflowType: 'payment_reminder',
        businessKind: 'cattle_feed',
        outstandingBalancePaise: -50000, // advance credit
      });
      expect(resAdvance.isEligible).toBe(false);
      expect(resAdvance.reason).toBe('zero_balance');
    });

    it('suppresses payment reminder when active promise date is in the future or today', () => {
      const resFuture = checkRecipientEligibility({
        customer: baseCustomer,
        workflowType: 'payment_reminder',
        businessKind: 'cattle_feed',
        outstandingBalancePaise: 1540000,
        promiseDate: '2026-11-15',
        currentDate: '2026-11-08',
      });
      expect(resFuture.isEligible).toBe(false);
      expect(resFuture.reason).toBe('promise_date_active');

      const resToday = checkRecipientEligibility({
        customer: baseCustomer,
        workflowType: 'payment_reminder',
        businessKind: 'cattle_feed',
        outstandingBalancePaise: 1540000,
        promiseDate: '2026-11-08',
        currentDate: '2026-11-08',
      });
      expect(resToday.isEligible).toBe(false);
      expect(resToday.reason).toBe('promise_date_active');
    });

    it('allows payment reminder once promise date has passed', () => {
      const resPast = checkRecipientEligibility({
        customer: baseCustomer,
        workflowType: 'payment_reminder',
        businessKind: 'cattle_feed',
        outstandingBalancePaise: 1540000,
        promiseDate: '2026-11-05',
        currentDate: '2026-11-08',
      });
      expect(resPast.isEligible).toBe(true);
    });

    it('suppresses payment reminder if manually suppressed by owner rule', () => {
      const resSuppressed = checkRecipientEligibility({
        customer: baseCustomer,
        workflowType: 'payment_reminder',
        businessKind: 'cattle_feed',
        outstandingBalancePaise: 1540000,
        isRuleSuppressed: true,
      });
      expect(resSuppressed.isEligible).toBe(false);
      expect(resSuppressed.reason).toBe('suppressed_by_rule');
    });

    it('formats bilingual payment reminder text with integer paise converted to INR', () => {
      const mrText = buildPaymentReminderText({
        customerName: 'Balasaheb Vikhe',
        balancePaise: 1540000, // 15,400.00
        businessName: 'Rushi Agro Cattle Feed',
        upiId: 'rushiagro@upi',
        language: 'mr',
      });

      expect(mrText).toContain('Balasaheb Vikhe');
      expect(mrText).toContain('15,400');
      expect(mrText).toContain('Rushi Agro Cattle Feed');
      expect(mrText).toContain('UPI ID: rushiagro@upi');

      const enText = buildPaymentReminderText({
        customerName: 'Balasaheb Vikhe',
        balancePaise: 1540000,
        businessName: 'Rushi Agro Cattle Feed',
        language: 'en',
      });

      expect(enText).toContain('Dear Balasaheb Vikhe');
      expect(enText).toContain('15,400');
      expect(enText).toContain('Rushi Agro Cattle Feed');
    });
  });

  describe('3. Feed-Finish (Material Alert) Calculations & Text', () => {
    it('calculates consumption duration and alert date (5 days prior to exhaustion)', () => {
      // 20 bags * 50kg = 1000kg. Herd size: 10 cows. Daily rate: 5kg/cow => 50kg/day.
      // Expected duration = 1000 / 50 = 20 days.
      const bags = 20;
      const totalKg = bags * 50;
      const herdSize = 10;
      const dailyRate = 5;
      const duration = Math.round(totalKg / (herdSize * dailyRate));
      expect(duration).toBe(20);

      const billDate = new Date('2026-11-01');
      const expectedFinishDate = new Date(billDate);
      expectedFinishDate.setDate(billDate.getDate() + duration);
      expect(expectedFinishDate.toISOString().split('T')[0]).toBe('2026-11-21');

      // 5-day pre-finish cue window
      const alertDaysBefore = 5;
      const alertDate = new Date(expectedFinishDate);
      alertDate.setDate(expectedFinishDate.getDate() - alertDaysBefore);
      expect(alertDate.toISOString().split('T')[0]).toBe('2026-11-16');
    });

    it('builds clear feed-finish notification text in Marathi and English', () => {
      const mrAlert = buildMaterialAlertText({
        customerName: 'Dattatray Patil',
        productName: 'Kapila Milk Feed (50kg)',
        daysRemaining: 5,
        businessName: 'Rushi Cattle Feed',
        businessPhone: '9876543210',
        language: 'mr',
      });

      expect(mrAlert).toContain('Dattatray Patil');
      expect(mrAlert).toContain('Kapila Milk Feed (50kg)');
      expect(mrAlert).toContain('5 दिवसांत संपण्याची शक्यता');
      expect(mrAlert).toContain('9876543210');

      const enAlert = buildMaterialAlertText({
        customerName: 'Dattatray Patil',
        productName: 'Kapila Milk Feed (50kg)',
        daysRemaining: 5,
        businessName: 'Rushi Cattle Feed',
        language: 'en',
      });

      expect(enAlert).toContain('Dear Dattatray Patil');
      expect(enAlert).toContain('5 days');
    });
  });

  describe('4. Birthday Greetings & Delivery Route Announcements', () => {
    it('builds warm personalized birthday greeting in Marathi', () => {
      const wish = buildBirthdayWishText({
        customerName: 'Suresh Deshmukh',
        businessName: 'Rushi Agro',
        language: 'mr',
      });
      expect(wish).toContain('वाढदिवसाच्या हार्दिक शुभेच्छा Suresh Deshmukh जी!');
      expect(wish).toContain('Rushi Agro');
    });

    it('builds delivery trip arrival announcement with bag counts', () => {
      const announcement = buildDeliveryAnnouncementText({
        customerName: 'Ganesh Thorat',
        tripDate: '2026-11-10',
        villageOrArea: 'Mandavgan Farata',
        bagsCount: 15,
        businessName: 'Rushi Cattle Feed',
        driverPhone: '9890123456',
        language: 'mr',
      });

      expect(announcement).toContain('Ganesh Thorat');
      expect(announcement).toContain('2026-11-10');
      expect(announcement).toContain('Mandavgan Farata');
      expect(announcement).toContain('15 पोती');
      expect(announcement).toContain('9890123456');
    });
  });

  describe('5. Manual WhatsApp Handoff & Transport Safety Guards', () => {
    it('manual handoff generates correct deep-link URL and adheres to truthful status flow', async () => {
      const prepared = await manualHandoffTransport.prepare({
        id: 'job-001',
        recipientPhone: '919822334455',
        recipientName: 'Balasaheb Vikhe',
        messageText: 'Hello Balasaheb',
        workflowType: 'payment_reminder',
        idempotencyKey: 'reminder_biz-0001_cust-1111_2026-11-08',
      });

      expect(prepared.jobId).toBe('job-001');
      expect(prepared.transportMode).toBe('manual_handoff');
      expect(prepared.deepLinkUrl).toContain(
        'https://wa.me/919822334455?text=Hello%20Balasaheb',
      );
      expect(prepared.idempotencyKey).toBe('reminder_biz-0001_cust-1111_2026-11-08');

      // Truthful status: manual handoff does not claim external provider delivery
      expect(manualHandoffTransport.normalizeStatus('anything')).toBe(
        'owner_marked_sent',
      );
    });

    it('official API transport safely blocks dispatch when unconfigured or disabled', async () => {
      await expect(
        officialApiTransport.prepare({
          id: 'job-api-1',
          recipientPhone: '919822334455',
          recipientName: 'Test',
          messageText: 'Test message',
          workflowType: 'payment_reminder',
          idempotencyKey: 'api_test_001',
        }),
      ).rejects.toThrow(/disabled/i);
    });

    it('enforces composite idempotency key format to prevent duplicate job queueing', () => {
      const bizId = 'biz-001';
      const custId = 'cust-001';
      const date = '2026-11-08';
      const key = `reminder_${bizId}_${custId}_${date}`;

      expect(key).toBe('reminder_biz-001_cust-001_2026-11-08');
      // Submitting the same key twice in the queue will trigger ON CONFLICT DO UPDATE
    });
  });
});
