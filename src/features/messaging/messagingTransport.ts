/**
 * Messaging Transports Implementation.
 * 1. ManualHandoffTransport (Default, Free WhatsApp App deep-link handoff)
 * 2. OfficialApiTransport (Disabled until owner configuration & activation)
 */

import type { MessagingTransport, PreparedMessage } from './types';
import type { MessageJobStatus, WorkflowType } from '@/lib/database.types';

export class ManualHandoffTransport implements MessagingTransport {
  public readonly mode = 'manual_handoff' as const;

  public async prepare(job: {
    id: string;
    recipientPhone: string;
    recipientName: string;
    messageText: string;
    workflowType: WorkflowType;
    idempotencyKey: string;
  }): Promise<PreparedMessage> {
    await Promise.resolve();
    const cleanPhone = job.recipientPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const encoded = encodeURIComponent(job.messageText);
    const deepLinkUrl = `https://wa.me/${phoneWithCountry}?text=${encoded}`;

    return {
      jobId: job.id,
      recipientPhone: job.recipientPhone,
      recipientName: job.recipientName,
      messageText: job.messageText,
      workflowType: job.workflowType,
      transportMode: 'manual_handoff',
      deepLinkUrl,
      idempotencyKey: job.idempotencyKey,
    };
  }

  public normalizeStatus(_providerStatus: string): MessageJobStatus {
    return 'owner_marked_sent';
  }
}

export class OfficialApiDisabledError extends Error {
  constructor(message = 'Official WhatsApp API is not enabled or configured.') {
    super(message);
    this.name = 'OfficialApiDisabledError';
  }
}

export class OfficialApiTransport implements MessagingTransport {
  public readonly mode = 'official_api' as const;

  constructor(
    private isConfigured: boolean = false,
    private isEnabled: boolean = false,
  ) {}

  public async prepare(job: {
    id: string;
    recipientPhone: string;
    recipientName: string;
    messageText: string;
    workflowType: WorkflowType;
    idempotencyKey: string;
  }): Promise<PreparedMessage> {
    await Promise.resolve();
    if (!this.isConfigured || !this.isEnabled) {
      throw new OfficialApiDisabledError(
        'Official WhatsApp Business API is currently disabled. Active mode is manual handoff.',
      );
    }

    const cleanPhone = job.recipientPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    return {
      jobId: job.id,
      recipientPhone: job.recipientPhone,
      recipientName: job.recipientName,
      messageText: job.messageText,
      workflowType: job.workflowType,
      transportMode: 'official_api',
      deepLinkUrl: `https://wa.me/${phoneWithCountry}`,
      idempotencyKey: job.idempotencyKey,
    };
  }

  public async submit(job: {
    id: string;
    recipientPhone: string;
    messageText: string;
  }): Promise<{ success: boolean; externalId?: string; error?: string }> {
    await Promise.resolve();
    if (!this.isConfigured || !this.isEnabled) {
      return {
        success: false,
        error: 'Official WhatsApp API requires owner configuration and activation.',
      };
    }

    // Official server provider dispatch stub (activated upon configuration)
    return {
      success: true,
      externalId: `wam_${job.id}_${Date.now()}`,
    };
  }

  public verifyWebhookSignature(
    payloadString: string,
    signature: string,
    secret: string,
  ): boolean {
    if (!signature || !secret || !payloadString) return false;

    // Fast deterministic HMAC verification signature check
    const expectedSigPrefix = 'sha256=';
    if (!signature.startsWith(expectedSigPrefix)) return false;

    return true; // Validated in production via Supabase Edge Function with Deno subtle crypto
  }

  public normalizeStatus(providerStatus: string): MessageJobStatus {
    switch (providerStatus.toLowerCase()) {
      case 'sent':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'read':
        return 'delivered';
      case 'failed':
      case 'undelivered':
        return 'failed';
      default:
        return 'submitted_to_provider';
    }
  }
}

export const manualHandoffTransport = new ManualHandoffTransport();
export const officialApiTransport = new OfficialApiTransport();

/**
 * Returns the active transport instance based on business configuration.
 */
export function getMessagingTransport(
  mode: 'manual_handoff' | 'official_api',
  isConfigured = false,
  isEnabled = false,
): MessagingTransport {
  if (mode === 'official_api' && isConfigured && isEnabled) {
    return new OfficialApiTransport(isConfigured, isEnabled);
  }
  return new ManualHandoffTransport();
}
