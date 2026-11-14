# Privacy & Data Safety — Expense Tracker (Google Play)

Proposed Play Console answers for **version 1.0.0 (Android, with AdMob banner ads)**. Each answer is
tied to code or to Google's own SDK disclosure. **Not legal advice** — the owner must review and
submit. Re-check whenever an SDK or data flow changes.

Sources:
- App code (this repo) — `src/features/ads`, `src/features/app-update`, `app.json`, `app.config.ts`.
- Google, "Data disclosure for Google Play's data safety section — Google Mobile Ads SDK (Legacy)":
  https://developers.google.com/admob/android/privacy/play-data-disclosure — covers SDK
  **25.5.0**, the exact version this build uses (`react-native-google-mobile-ads` 17.4.0 classic backend).
  Re-read this page before every submission; it is what the answers below rely on.

## 1. What leaves the device

| Flow | Data | Who receives it | User control |
| --- | --- | --- | --- |
| Google Mobile Ads SDK (Android) | IP address (→ approximate location), Android advertising ID, app set ID, app interactions (launches, taps, video views), diagnostics (performance, hang rate, energy) | Google | UMP consent (where required); Settings → Ad privacy options; Android ad ID reset/delete; ads-disabled build |
| App-update check | Anonymous GET of `https://expensetracker.dlyneed.com/config.json`; no IDs or user data; the server sees the IP | Developer's web host | None needed (no user data) |
| Voice entry | Audio, only while recording | The device's speech service (Google), may be on-device | Optional feature; mic permission |
| Backup / CSV | Files the user explicitly saves or shares | Wherever the user chooses | User-initiated only |

**Never leaves the device / never given to the ads SDK:** transactions, amounts, categories, notes,
budgets, receipts and photos, voice text, settings. The banner request uses default
`requestOptions` — no keywords, content URLs or user data.

## 2. Data safety form — proposed answers

**Does your app collect or share any of the required user data types?** → **Yes**

**Is all of the user data collected by your app encrypted in transit?** → **Yes** (Google: all SDK
data is sent over TLS; the update check uses HTTPS).

**Do you provide a way for users to request that their data is deleted?** → The app stores
financial data only on the device (Settings → Clear all data, or uninstall). Data collected by the
Google Mobile Ads SDK is held by Google; the user can reset/delete the advertising ID in Android
settings. Answer according to Play's current wording; do not claim the developer can delete
Google-held ad data.

| Play data type | Collected | Shared | Processed ephemerally | Required / optional | Purposes |
| --- | --- | --- | --- | --- | --- |
| Location → **Approximate location** (from IP) | Yes | Yes | No | Required* | Advertising or marketing, Analytics, Fraud prevention, security & compliance |
| App activity → **App interactions** | Yes | Yes | No | Required* | Advertising or marketing, Analytics, Fraud prevention, security & compliance |
| App info & performance → **Diagnostics** | Yes | Yes | No | Required* | Analytics, Fraud prevention, security & compliance (Advertising if Play asks per-purpose and you follow Google's single combined purpose list) |
| Device or other IDs → **Device or other IDs** (ad ID, app set ID) | Yes | Yes | No | Required* | Advertising or marketing, Analytics, Fraud prevention, security & compliance |

\* Users cannot turn the SDK's collection off inside the app (besides ad consent choices where UMP
applies), so "required" is the conservative answer. Google notes the ad ID is user-resettable/deletable.

**Not declared** (not collected by the app or SDK per the sources above): personal info (name,
email, …), financial info (the app's financial data never leaves the device), messages, photos
and videos (receipt photos stay on device), audio (see owner decision below), files and docs,
calendar, contacts, health, web browsing, precise location, crash logs (Google's page does not list
crash logs separately — re-check).

> **Owner decisions before submitting**
> - **Voice audio:** recognition is done by Android's system speech service, not the app. Play's
>   guidance for data handled by system services may or may not require declaring Audio — read the
>   current Data safety help and decide.
> - **Update check IP:** if the web host logs IP addresses and you use them, review whether that is
>   "collection". The app itself sends no personal data.

## 3. Other Play Console declarations

| Declaration | Proposed answer | Basis |
| --- | --- | --- |
| **Ads** — "Does your app contain ads?" | **Yes** | AdMob banners on Dashboard/Reports |
| **Advertising ID** | **Yes**, the app uses the advertising ID — purposes: Advertising or marketing, Analytics, Fraud prevention | `com.google.android.gms.permission.AD_ID` is merged into the manifest by the Google Mobile Ads SDK; keep it (removing it degrades ads) |
| **Target audience and content** | **18 and over** (or 13+ minimum); not appealing to children; no "Designed for Families" | Finance tracker; selecting under-13 age groups would bring Families policy + certified-ad-SDK requirements |
| **Content rating (IARC)** | Category *Utility, Productivity, Communication or Other*; answer **No** to violence, sexual content, profanity, drugs, gambling, user-generated content sharing, location sharing; **No** digital purchases. Expected rating: Everyone / PEGI 3 / IARC 3+ (the questionnaire decides) | App has no UGC, chat, purchases or location features |
| **Government / financial features** | Not a government app; **no** financial services (no loans, banking, crypto, payments) — personal expense tracking only. Answer the "Financial features" question accordingly | App records user-entered amounts only |
| **Health** | No health features | — |
| **News** | Not a news app | — |
| **Data deletion URL** | Not required unless Play asks (no account); if asked, link the privacy policy section "Deleting your data" | No account system |
| **Privacy policy URL** | Required — host [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) publicly (fill placeholders first) | Ads + permissions require it |

## 4. Permissions review (Android)

| Permission | Source | Why | Runtime prompt |
| --- | --- | --- | --- |
| `INTERNET` | React Native / ads SDK | Update check, speech service, ads | No |
| `RECORD_AUDIO` | `expo-speech-recognition` | Optional voice entry | Yes, on first use |
| `CAMERA` | `expo-image-picker` | Optional receipt photo | Yes, on first use |
| `USE_BIOMETRIC`, `USE_FINGERPRINT` | `expo-local-authentication` | Optional app lock | No (system prompt on use) |
| `AD_ID` | Google Mobile Ads SDK (merged) | Advertising ID for ads | No |
| `ACCESS_NETWORK_STATE`, `WAKE_LOCK`, etc. | Possibly merged by Google Play services | SDK internals — **verify** with `aapt dump permissions` / Play Console "App bundle explorer" on the built AAB | No |
| Removed: `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, `VIBRATE` | `blockedPermissions` | Not needed | — |

No location, contacts, SMS, phone, storage or notification permissions are requested by the app.

## 5. Policy checklist (Google Play)

- [ ] Ads are clearly distinguishable from app content (an "Advertisement" label sits above the banner; the banner is below content, not inside lists)
- [ ] No ads on screens where the user enters data, records or scans; no ads that cover content or the tab bar; no accidental-click placement next to buttons (banner is separated from the tab bar's add button — verify on small screens)
- [ ] No interstitials, app-open or full-screen ads (none implemented)
- [ ] Ads SDK version is Families-irrelevant because the app does not target children
- [ ] Consent: UMP GDPR message published before EEA/UK traffic; privacy options entry point available (implemented)
- [ ] Data safety, Ads and Advertising ID declarations match this document
- [ ] Privacy policy hosted, linked in the store listing and in-app (Settings → Privacy shows an "Ads by Google" section)
- [ ] Target API level meets Play's current requirement (build targets **API 36**)
- [ ] Store listing does not claim "no ads", "no data collected" or 22 languages (only en/bn/hi ship)
- [ ] Permissions declaration forms (if Play asks) answered for camera/microphone

## 6. In-app disclosure

Settings → Privacy contains an "Ads by Google" section (en/bn/hi, `settings.privacy.ads`) with the
same facts as the privacy policy. Settings → Ad privacy options opens Google's form when required.
