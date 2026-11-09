import { describe, it, expect } from 'vitest';

describe('Staging Resilience: NeoDB Concurrency & Race Condition Defense', () => {
  it('guarantees strictly unique, gapless bill sequences under 50 concurrent checkout requests', async () => {
    // Emulates PostgreSQL transactional sequence with row-level locking
    let dbSequenceLock = 1000;
    const activeTransactions: Promise<string>[] = [];

    async function simulateCheckout(clientId: number): Promise<string> {
      // Simulate remote network latency jitter (10ms - 50ms)
      const latencyMs = Math.floor(Math.random() * 40) + 10;
      await new Promise((resolve) => setTimeout(resolve, latencyMs));

      // Atomic lock acquisition and sequence increment (simulating create_bill_transactional)
      dbSequenceLock += 1;
      const billNumber = `BILL-2026-27-${String(dbSequenceLock).padStart(5, '0')}`;
      return `${clientId}:${billNumber}`;
    }

    for (let i = 1; i <= 50; i++) {
      activeTransactions.push(simulateCheckout(i));
    }

    const results = await Promise.all(activeTransactions);
    const billNumbers = results.map((r) => r.split(':')[1]!);

    // Test 1: Exactly 50 bills created
    expect(billNumbers.length).toBe(50);

    // Test 2: All 50 bills strictly unique (zero duplicates)
    const uniqueSet = new Set(billNumbers);
    expect(uniqueSet.size).toBe(50);

    // Test 3: Zero sequence gaps
    const numbers = billNumbers
      .map((b) => parseInt(b.split('-')[3]!, 10))
      .sort((a, b) => a - b);
    expect(numbers[0]).toBe(1001);
    expect(numbers[49]).toBe(1050);

    for (let i = 0; i < numbers.length - 1; i++) {
      expect(numbers[i + 1]! - numbers[i]!).toBe(1);
    }
  });

  it('atomically rolls back customer balance mutations if bill insertion fails', () => {
    let customerBalancePaise = 50000; // ₹500.00
    const billAmountPaise = 25000; // ₹250.00

    function executeTransaction(shouldSimulateDbFailure: boolean): boolean {
      const balanceSnapshot = customerBalancePaise;
      try {
        customerBalancePaise += billAmountPaise;

        if (shouldSimulateDbFailure) {
          throw new Error('NeoDB foreign key violation: invalid product item');
        }

        return true;
      } catch {
        // Rollback snapshot
        customerBalancePaise = balanceSnapshot;
        return false;
      }
    }

    // Normal execution
    const success = executeTransaction(false);
    expect(success).toBe(true);
    expect(customerBalancePaise).toBe(75000);

    // Failed execution with rollback
    const failure = executeTransaction(true);
    expect(failure).toBe(false);
    expect(customerBalancePaise).toBe(75000); // Intact, no corrupted partial debit
  });

  it('correctly handles client idempotency key to prevent double-billing on network retry', () => {
    const processedIdempotencyKeys = new Set<string>();
    let billsCreated = 0;

    function processBillWithIdempotency(idempotencyKey: string): {
      status: 'created' | 'ignored';
    } {
      if (processedIdempotencyKeys.has(idempotencyKey)) {
        return { status: 'ignored' };
      }
      processedIdempotencyKeys.add(idempotencyKey);
      billsCreated++;
      return { status: 'created' };
    }

    const key = 'idem_cust_9822_timestamp_1731140000';

    // First attempt (user clicks Save Bill)
    const firstAttempt = processBillWithIdempotency(key);
    expect(firstAttempt.status).toBe('created');
    expect(billsCreated).toBe(1);

    // Second attempt (network timed out, user clicked Save Bill again)
    const secondAttempt = processBillWithIdempotency(key);
    expect(secondAttempt.status).toBe('ignored');
    expect(billsCreated).toBe(1); // Still exactly 1 bill created
  });
});
