/**
 * Messaging & WhatsApp Automation Engine Types.
 * Defines transport interfaces, payload schemas, and recipient eligibility rules.
 */

import type {
  MessageJobStatus,
  MessageTransportMode,
  WorkflowType,
} from '@/lib/database.types';

export interface PreparedMessage {
  jobId: string;
  recipientPhone: string;
  recipientName: string;
  messageText: string;
  workflowType: WorkflowType;
  transportMode: MessageTransportMode;
  deepLinkUrl: string;
  idempotencyKey: string;
}

export interface WebhookEventPayload {
  eventId: string;
  timestamp: string;
  signature: string;
  providerStatus: string;
  recipientPhone: string;
  externalMessageId?: string;
  error?: string;
}

export interface EligibilityResult {
  isEligible: boolean;
  reason?:
    | 'active'
    | 'opted_out'
    | 'inactive_customer'
    | 'invalid_phone'
    | 'cross_business_excluded'
    | 'promise_date_active'
    | 'zero_balance'
    | 'suppressed_by_rule';
  explanation?: string;
}

export interface MessagingTransport {
  readonly mode: MessageTransportMode;
  prepare(job: {
    id: string;
    recipientPhone: string;
    recipientName: string;
    messageText: string;
    workflowType: WorkflowType;
    idempotencyKey: string;
  }): Promise<PreparedMessage>;

  submit?(job: {
    id: string;
    recipientPhone: string;
    messageText: string;
  }): Promise<{ success: boolean; externalId?: string; error?: string }>;

  verifyWebhookSignature?(
    payloadString: string,
    signature: string,
    secret: string,
  ): boolean;

  normalizeStatus?(providerStatus: string): MessageJobStatus;
}
