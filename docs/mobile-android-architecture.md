# Android PWA Architecture

## Objective

The active Android client is the installable PWA, offering the same core workflows as the website: sign-in, business selection, dashboard, customers, quick-add, bills, payments, statements/PDFs, reminders, messaging queues, reports and owner operations according to permission. It shares one backend; it is not a second financial system. A native Android Studio/APK project is deferred.

## Active Android delivery stack

| Concern | Choice | Reason |
| --- | --- | --- |
| UI | React responsive UI + PWA manifest | One codebase for browser and Android installation |
| Offline | Service worker shell/static caching and labelled safe drafts | No uncontrolled cache of financial records |
| Sharing | Web Share API where supported plus WhatsApp URL handoff | Manual mode never fabricates delivery status |
| Tests | Playwright mobile device profiles and real Android PWA smoke test | Covers installability and touch workflow |

## Deferred native option

```text
If a native APK is approved later, create it in `android/` against the same server contracts. It must not duplicate ledger, authorization, bill-numbering or message-eligibility logic.
```

## Consistency and offline rules

- The installed PWA calls the same versioned server operations and uses the same permission/validation contracts.
- It may retain clearly labelled unsaved drafts locally; it must not claim a financial, import, setting or message action succeeded without confirmed server response.
- It may show cached non-sensitive UI only when marked stale/offline. It must not use local records as ledger authority.
- Each financial/message mutation includes idempotency keys; retry is server-reconciled, never blindly duplicated.
- Manual WhatsApp/share/call handoff is not delivery confirmation.

## Release channels

Test PWA installation, update and touch workflows on approved Android devices before production release. Any future native Play Store distribution requires a separate owner decision, signing key and Play Console ownership.

