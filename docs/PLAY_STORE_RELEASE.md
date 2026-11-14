# Google Play Release — Expense Tracker 1.0.0

Production readiness report, listing content and track-by-track checklists. Nothing is published
automatically. Related: [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) (every-release steps),
[ADMOB_SETUP.md](./ADMOB_SETUP.md), [PRIVACY_AND_DATA_SAFETY.md](./PRIVACY_AND_DATA_SAFETY.md),
[STORE_LISTING.md](./STORE_LISTING.md), [TESTING.md](./TESTING.md).

## 1. Production readiness report (2026-11-14)

Verified in this session: `npx tsc --noEmit` clean, `npx expo lint` clean, `npx jest` **54 suites /
910 tests pass**, `npx expo config` (plugin + sample App ID; production guard throws without a real
ID), `npx expo prebuild --clean -p android` (manifest + SDK levels below). **Not verified:** any
on-device run, a release AAB/APK build (local Gradle builds fail on this machine's 260-char path
limit — build on EAS or from a short path), consent UI, real ad rendering.

| Area | Status | Evidence / notes |
| --- | --- | --- |
| Stability / startup | OK | DB init with retry screen; preloader; lock + update gate overlays |
| Crash handling | **Fixed** | Root `ErrorBoundary` export added (`src/app/_layout.tsx`) — previously a render error gave a white screen. No crash reporting SDK (deliberate) |
| SQLite persistence | OK (tests) | WAL, FK on; real SQL in Jest via `node:sqlite`; restart persistence = manual check |
| Migrations | OK | `PRAGMA user_version`, gap check, each migration in its own transaction, newer-DB guard, 5 migrations (`src/database/migrations`) |
| Money calculations | OK | Integer minor units, string parsing, `MAX_AMOUNT_MINOR` + DB triggers; aggregation tests (percentages sum to 100) |
| Receipt scanning | OK (tests) | On-device ML Kit, review before save; device check pending |
| Mandatory update / remote config | OK (tests) | `config.json` Zod-validated, 30-day grace, never blocks on failure; set `minimumSupportedVersion` ≤ release version |
| Backup / restore | OK | Zod v1 schema, 50 MB cap, exclusive txn + FK check. Receipts not included (documented) |
| Permissions | OK | INTERNET, RECORD_AUDIO, CAMERA (merged from expo-image-picker), biometric, AD_ID (merged from ads SDK); storage/overlay/vibrate blocked |
| Performance | Unmeasured | No profiling done; ads SDK init is deferred until the app is usable and never awaited |
| Localization | Partial | en/bn/hi complete; 20 languages planned (Phase 6). bn/hi strings need native review. Listing must not claim 22 languages |
| AdMob | Implemented, untested on device | Test IDs everywhere; production build requires real App ID |
| Target API | OK | targetSdk **36**, compileSdk 37, minSdk 24 (Expo SDK 58 defaults) — confirm against Play's current requirement at upload |
| Signing / EAS | **Blocker** | `eas init` not run (no `extra.eas.projectId`); no credentials yet |
| Privacy policy | **Blocker** | Updated for AdMob but still has `[date]`, `[name]`, `[contact email]`; must be hosted publicly |
| AdMob account | **Blocker** | Real App ID + banner unit, GDPR message, app-ads.txt (see ADMOB_SETUP.md) |
| Screenshots | **Blocker** | Must be captured on device (shot list below) |
| `.env.local` | **Fixed** | Was misnamed `env.local` (never loaded) and committed; renamed and untracked; `.env.example` added |
| Stale `android/` | **Fixed** | Regenerated with `prebuild --clean` (old manifest stripped CAMERA) |
| Dependency drift | Minor | `expo-install --check`: expo 58.0.24 → ~58.0.25, expo-sqlite 58.0.16 → ~58.0.17 (pre-existing; update before release) |
| iOS | Out of scope | SDK linked but ads off; App Store privacy answers need review before any iOS release |

**Release blockers remaining (owner):** EAS init + credentials; AdMob account/IDs/GDPR message;
privacy policy completed + hosted; screenshots; on-device run of TESTING.md (incl. Ads); closed
testing requirement (if a new personal account).

## 2. Store listing content

**App name:** Expense Tracker (≤ 30)

**Short description (≤ 80):**
Track income & expenses by hand, voice or receipt. Budgets & reports, offline.

**Full description:**

Expense Tracker is a simple way to keep track of where your money goes — no account, no sign-in.

• Add income and expenses in seconds, with categories, notes and payment method
• Speak your entries in English, Bengali or Hindi — always reviewed before saving
• Scan a receipt with your camera; text is read on your device and you review it before saving
• Dashboard with monthly income, expenses, balance and a spending trend
• Reports: category breakdown, monthly calendar and comparison with the previous period
• Monthly and category budgets with warnings at 80%, 90% and 100%
• App in English, বাংলা and हिन्दी; light and dark theme; optional fingerprint/screen lock
• Back up to a file and restore it on any device; export transactions as CSV or PDF
• Works offline. Your transactions stay on your device — the app has no server and never uploads them

The app is free and shows a small banner ad from Google on the Dashboard and Reports screens. Ads
never appear while you add entries, record by voice or scan receipts. Voice entry uses your
device's speech recognition service, which may need an internet connection depending on your
device and language.

**Release notes (1.0.0):**
First release: manual, voice and receipt entry; dashboard, reports, calendar and budgets; backup,
restore and CSV export; English, Bengali and Hindi.

**Category:** Finance · **Tags:** budget, expense tracker, money manager
**Contact email:** [owner] · **Website:** https://expensetracker.dlyneed.com (also hosts app-ads.txt)
**Privacy policy URL:** [hosted URL of PRIVACY_POLICY.md]

## 3. Graphics

| Asset | Spec | File | Status |
| --- | --- | --- | --- |
| App icon | 512×512 PNG, 32-bit | `store-assets/icon-512.png` (from `assets/images/icon.png`) | Generated |
| Feature graphic | 1024×500 PNG/JPEG, no alpha needed | `store-assets/feature-graphic.png` | Generated — review wording/look |
| Phone screenshots | 2–8, 16:9 or 9:16, min 320 px, max 3840 px; ≥ 1080×1920 recommended | — | **To capture** |

Regenerate with `powershell -ExecutionPolicy Bypass -File scripts/store-assets.ps1`.

**Screenshot shot list** (release or preview build, realistic sample data, no personal data, status
bar clean). Hide ads in screenshots: build with `EXPO_PUBLIC_ADS_ENABLED=0` so the store images
show app content only.
1. Dashboard (income, expense, balance, trend)
2. Add transaction
3. Voice entry → Review
4. Receipt scan → Review
5. Reports (category donut)
6. Monthly calendar
7. Budgets with a warning
8. Dashboard in Bengali or Hindi / dark theme

## 4. App content declarations (Play Console → Policy → App content)

Answers: [PRIVACY_AND_DATA_SAFETY.md](./PRIVACY_AND_DATA_SAFETY.md).

- [ ] Privacy policy URL
- [ ] Ads: **Yes**
- [ ] App access: all functionality available without login
- [ ] Content rating questionnaire (IARC)
- [ ] Target audience: 18+ (not children)
- [ ] Data safety form
- [ ] Advertising ID declaration: Yes (advertising, analytics, fraud prevention)
- [ ] Government apps: No · Financial features: none (personal tracker) · Health: No · News: No
- [ ] Permissions declarations if prompted (camera, microphone are standard runtime permissions)

## 5. Internal testing checklist

- [ ] One-time setup done (RELEASE_CHECKLIST.md): EAS init, Play Console app created with package `com.rijukarar.expensetracker`, Play App Signing
- [ ] AdMob: real IDs in EAS production env; your test phones registered as AdMob test devices
- [ ] `npx eas-cli build -p android --profile production` → AAB
- [ ] Upload to **Internal testing**, add testers' emails, share opt-in link
- [ ] Install from Play on a real device; run TESTING.md (Install & startup, Transactions, Voice, Receipt scanner, Backup/restore, App lock, App update, **Ads**)
- [ ] Pre-launch report (Play Console) reviewed: crashes, accessibility, security warnings
- [ ] App bundle explorer → permissions list matches PRIVACY_AND_DATA_SAFETY.md §4

## 6. Closed testing checklist

- [ ] Required for **new personal developer accounts**: a closed test with at least **12 opted-in testers for 14 consecutive days** before production access (check the current rule shown in your Play Console — it has changed before)
- [ ] Create a Closed testing track, add a tester list/Google Group, publish the same or newer AAB (bump `versionCode` for each upload)
- [ ] Collect feedback (bn/hi strings, voice accuracy, receipt accuracy, banner placement)
- [ ] Fix → new build → `versionCode` +1
- [ ] Apply for production access with the closed-test answers

## 7. Production release checklist

- [ ] All internal/closed issues resolved; TESTING.md passes on the release build
- [ ] `version` / `versionCode` correct; `config.json` `minimumSupportedVersion` ≤ this version
- [ ] AdMob: GDPR message published, app-ads.txt live, app linked to Play listing after publish
- [ ] Listing text, graphics, screenshots, privacy policy URL final
- [ ] App content declarations complete and consistent
- [ ] Staged rollout (e.g. 20%) → monitor Android vitals (ANR/crash) and AdMob policy center → 100%
- [ ] Raise `latestVersion` in `config.json` only after the build is live
- [ ] `git tag v1.0.0`
