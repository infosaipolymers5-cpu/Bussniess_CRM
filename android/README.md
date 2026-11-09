# Native Android Client — Rushi CRM v2.0

This directory contains the production-ready **Native Android Studio Project** built with Capacitor, packaging the Rushi CRM platform into a standalone Android APK.

---

## 1. Project Specifications

- **Package Name (Application ID):** `com.rushi.crm`
- **App Name:** `Rushi CRM`
- **Target SDK:** Android 14+ (API 34)
- **Minimum SDK:** Android 7.0 (API 24 - Nougat)
- **Permissions:** `INTERNET`, `FileProvider` (for PDF statement downloads)
- **Deep-Link Intents:** Configured with `<queries>` for native WhatsApp (`com.whatsapp`, `com.whatsapp.w4b`, `whatsapp://`) and phone dialer (`tel:`).
- **Web Assets Directory:** `android/app/src/main/assets/public/` (Synced directly from production `dist/`).

---

## 2. Quick Commands

### A. Sync Latest Frontend Web Build to Android
Whenever you modify frontend code or run `npm run build`:
```bash
npm run android:sync
```

### B. Open in Android Studio
To inspect the code, run on an emulator, or attach an Android phone:
```bash
npm run android:open
```
*Or open Android Studio and choose **Open Project** -> select the `android` folder.*

### C. Build Native Debug APK (`.apk`)
Run from terminal:
```bash
cd android
.\gradlew.bat assembleDebug
```
- **Output APK location:**
  `android/app/build/outputs/apk/debug/app-debug.apk`

### D. Build Release APK (or Google Play `.aab` Bundle)
```bash
cd android
.\gradlew.bat assembleRelease
```
- **Output Release APK location:**
  `android/app/build/outputs/apk/release/app-release-unsigned.apk`

---

## 3. Directory Layout

```
android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── AndroidManifest.xml   <-- Permissions, WhatsApp intents, App launcher
│   │       ├── assets/public/        <-- Synced production PWA bundle (HTML/JS/CSS)
│   │       ├── java/com/rushi/crm/   <-- MainActivity.java
│   │       └── res/                  <-- App launcher icons, splash screen, strings
│   └── build.gradle                  <-- App-level Gradle build configuration
├── gradle/                           <-- Gradle wrapper
├── build.gradle                      <-- Root-level Gradle build script
└── gradlew.bat                       <-- Windows Gradle execution script
```

