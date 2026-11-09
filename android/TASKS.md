# Native Android Project Tasks

- [x] Install `@capacitor/core`, `@capacitor/android`, and `@capacitor/cli`.
- [x] Configure `capacitor.config.ts` (`appId: com.rushi.crm`, `appName: Rushi CRM`, `webDir: dist`).
- [x] Generate native Android project via `npx cap add android`.
- [x] Sync production web assets into `android/app/src/main/assets/public/`.
- [x] Configure `AndroidManifest.xml` with `<queries>` for WhatsApp (`com.whatsapp`, `whatsapp://`) and dialer (`tel:`).
- [x] Configure `FileProvider` for PDF statement downloads and sharing.
- [x] Add `android:sync`, `android:open`, and `android:build` scripts to `package.json`.

