# WhatsApp and Communication Workflows

## Launch: Regular/manual mode

The job service calculates eligible recipients and creates an `awaiting_owner_action` record. The UI shows message preview and opens a WhatsApp handoff only after owner/staff review. The sequence can be tracked as `prepared → opened → owner_marked_sent`; none of these states means provider-confirmed delivery.

## Future official mode

Only an owner-approved provider adapter may submit messages. Webhooks are authenticated, replay-protected and translated to `submitted_to_provider`, `sent`, `delivered` or `failed`. Paid sending is disabled until explicit owner authorization.

## Eligibility policy

Opted-out customers are excluded from promotions, birthday, festival and delivery messages. Under the confirmed policy, payment reminders and bills remain eligible. Cattle Feed customers are always excluded from PVC new-item campaigns. Every schedule occurrence/customer/campaign target uses a stable idempotency key, and retries reuse it.

