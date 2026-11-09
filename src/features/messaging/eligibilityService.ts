/**
 * Recipient Eligibility Engine.
 * Enforces centralized policy across all communication workflows:
 * - Active customer status
 * - Marketing opt-out exemptions (Reminders exempt; Broadcasts blocked)
 * - Strict Cattle Feed exclusion from PVC campaigns
 * - Active promise-date reminder suppression
 * - Zero-balance termination
 */

import type { EligibilityResult } from './types';
import type { Customer, WorkflowType } from '@/lib/database.types';

export interface RecipientEligibilityContext {
  customer: Customer;
  workflowType: WorkflowType;
  businessKind: 'cattle_feed' | 'pvc';
  optOut?: boolean;
  outstandingBalancePaise?: number;
  promiseDate?: string | null;
  isRuleSuppressed?: boolean;
  currentDate?: string; // YYYY-MM-DD
}

export function checkRecipientEligibility(
  ctx: RecipientEligibilityContext,
): EligibilityResult {
  const { customer, workflowType, businessKind } = ctx;

  // 1. Customer active status
  if (!customer.is_active) {
    return {
      isEligible: false,
      reason: 'inactive_customer',
      explanation: 'Customer profile is deactivated.',
    };
  }

  // 2. Phone validation
  const cleanPhone = (customer.display_phone || customer.normalized_phone || '').replace(
    /\D/g,
    '',
  );
  if (cleanPhone.length < 10) {
    return {
      isEligible: false,
      reason: 'invalid_phone',
      explanation: 'Customer does not have a valid 10-digit mobile number.',
    };
  }

  // 3. Cross-Business Exclusion: PVC promotions strictly exclude Cattle Feed customers
  if (workflowType === 'pvc_promo' && businessKind === 'cattle_feed') {
    return {
      isEligible: false,
      reason: 'cross_business_excluded',
      explanation:
        'Cattle Feed accounts are strictly excluded from PVC product marketing.',
    };
  }

  // 4. Marketing Opt-Out Policy
  // Payment reminders and billing are transactional and remain eligible;
  // Birthdays, festivals, PVC campaigns, delivery notices respect opt-out.
  if (ctx.optOut) {
    const isTransactionalExempt = workflowType === 'payment_reminder';
    if (!isTransactionalExempt) {
      return {
        isEligible: false,
        reason: 'opted_out',
        explanation: 'Customer has opted out of promotional communications.',
      };
    }
  }

  // 5. Payment Reminder Specific Checks
  if (workflowType === 'payment_reminder') {
    // Zero balance stop condition
    if (ctx.outstandingBalancePaise !== undefined && ctx.outstandingBalancePaise <= 0) {
      return {
        isEligible: false,
        reason: 'zero_balance',
        explanation: 'Customer has no outstanding balance.',
      };
    }

    // Explicit reminder rule suppression
    if (ctx.isRuleSuppressed) {
      return {
        isEligible: false,
        reason: 'suppressed_by_rule',
        explanation: 'Payment reminders are manually suppressed by owner rule.',
      };
    }

    // Active promise date suppression
    if (ctx.promiseDate && ctx.currentDate) {
      if (ctx.promiseDate >= ctx.currentDate) {
        return {
          isEligible: false,
          reason: 'promise_date_active',
          explanation: `Customer promised payment on ${ctx.promiseDate}; reminder deferred.`,
        };
      }
    }
  }

  return {
    isEligible: true,
    reason: 'active',
  };
}
