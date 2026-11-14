# Roadmap — Monthly Expense Tracker

> See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for design decisions. Reference panels refer to `docs/design-reference.png` (row, column).

**Current phase:** **Phase 8 — Hardening & Release** implemented in code (2026-11-12; the user's brief called this "Phase 7: Security, Quality & Production Readiness"), pulled forward ahead of Phase 6 (Language Expansion) and Phase 7 (Onboarding & Profile), which remain open. Phases 0–5 are implemented. tsc/lint/jest pass; a local Android release build was made for configuration checks; on-device exit checks, iOS and EAS store builds are pending (see `RELEASE_CHECKLIST.md`). Next: on-device verification, then Phase 6 — Language Expansion. **Phase 9 — Receipt Scanner** pulled forward and implemented in code (2026-11-13; adds `expo-image-manipulator`, `expo-mlkit-ocr`); tsc/lint/jest pass; on-device check pending a new development build. **Phase 10 — App Update Gate** pulled forward and implemented in code (2026-11-14); no new dependencies; tsc/lint/jest pass; on-device check pending a release build. **Phase 11 — AdMob & Google Play Release** implemented in code (2026-11-14; adds `react-native-google-mobile-ads`); tsc/lint/jest pass; test-ad and consent checks pending a device build; store submission is manual.

## Rules for every phase

- Do not implement work from a later phase.
- Add dependencies only when the phase needs them (`npx expo install`).
- Ask before destructive operations (deleting files, resetting data, removing deps).
- **Exit criteria for every phase:** `npx tsc --noEmit`, `npx expo lint`, `npx jest` actually run and pass; app runs on a device/emulator; each new screen passes the design checklist (ARCHITECTURE.md §9) in English, Bengali, and Hindi, light and dark.

---

## Phase 0 — Foundation

**Scope**
- Remove `create-expo-app` starter files and starter-only deps (exact list confirmed with the user first).
- Install Phase 0 deps; tighten `tsconfig` (`noUncheckedIndexedAccess`, `noImplicitOverride`); set up Jest.
- ESLint (eslint-config-expo + eslint-config-prettier) and Prettier; scripts: start, android, ios, lint, typecheck, format, test.
- Theme: light tokens (colors, typography, spacing, radius, shadows, layout), `ThemeProvider`, `useTheme`, `makeStyles`. Dark palette deferred (not approved); `themeMode` setting exists, all modes resolve to light.
- Fonts: Inter, Noto Sans Bengali, Noto Sans Devanagari; splash held until loaded; script → font map extensible for other scripts.
- i18n: i18next init, language registry (all 23 entries), `en`/`bn`/`hi` namespaces (`common`, `dashboard`, `categories`, `settings`), typed keys, `utils/digits.ts`, `utils/format.ts`, `utils/money.ts`, `utils/dates.ts`.
- Database: client, migration runner (`PRAGMA user_version`), migration 001, `settingsRepository`, `settingsStore`. (System category seed moved to Phase 1 with `categoryRepository`.)
- Primitives: `AppText`, `AppButton`, `AppIconButton`, `AppCard`, `AppInput`, `AppHeader`, `AppScreen`, `AppIcon`, `AppEmptyState`, `AppLoading`, `TabBar`, `SectionHeader`.
- Tab shell (Home, Reports, raised Add, Voice, More) with placeholder screens using i18n keys.
- Dashboard UI with **mock data only** (`features/dashboard/mock/`): greeting, month display, income/expense/balance cards, chart placeholder, recent transactions, See all, Add + Voice shortcuts.
- Settings (More tab): persistent UI language switch (en/bn/hi), currency display (₹ INR), theme placeholder, app name + version.
- App config: name, splash and icon colors from the purple brand; remove web target.

**Out of scope:** transaction storage/CRUD, forms, charts, voice, onboarding.

**Exit:** app boots on Android (and iOS if available) into the tab shell; DB created and migrated; language switch en ↔ bn ↔ hi changes text live and persists; unit tests for digits/money/format/migrations pass.

---

## Phase 1 — Manual Transactions & Dashboard

**Reference:** Dashboard (row 1, col 3), Add Transaction (row 1, col 4).

**Scope**
- Add `react-hook-form`, `zod`, `@hookform/resolvers`, `@react-native-community/datetimepicker`.
- `transactionRepository`, `categoryRepository`, `transactionService`, Zod schemas.
- Add Transaction modal: Expense/Income segmented control, category grid, amount (Indic digits accepted), date, note, save.
- Edit and delete transaction.
- `categoryRepository` + system category seed.
- Dashboard: replace Phase 0 mock data (`features/dashboard/mock/`) with real service data; month switching; delete the mock.
- Transaction list screen (grouped by date).
- Components: `SegmentedControl`, `TextField`, `AmountField`, `DateField`, `CategoryIcon`, `CategoryGrid`, `TransactionRow`, `SectionHeader`, `MonthSelector`, `SummaryCard`, `BalanceCard`, `EmptyState`.

**Out of scope:** dashboard trend chart (Phase 2), custom categories.

**Exit:** create/edit/delete persists across restarts; month totals correct (service tests); screens match reference panels.

---

## Phase 2 — Voice Entry

> Moved ahead of Reports and Settings at the user's request (2026-11-11; the user's brief called this "Phase 3"). Implemented in code: tsc/lint/jest pass; on-device exit check pending a development build.

**Reference:** Voice Entry (row 1, col 5), Review Your Entries (row 2, col 1).

**Scope**
- Add `expo-speech-recognition`; configure plugin and permission strings; development build required (not Expo Go).
- `SpeechEngine` interface + `NativeSpeechEngine` + `speechRecognitionService` (single session, cancel on blur/unmount/background).
- Voice screen: mic button with listening pulse, waveform (volume-driven), duration, live transcript, voice language toggle (বাংলা / English / हिन्दी), instructions, stop/cancel/retry, manual-entry fallback.
- Parser for en / bn / hi (digits, number words incl. দেড়/আড়াই/সাড়ে and डेढ़/ढाई/साढ़े/सवा/पौने, rupee words, relative dates, category and payment keywords incl. romanized). Never guesses: missing/ambiguous fields are left for the user.
- Review screen: **single entry** per recording, editable with the Add Transaction fields, Confirm & Save via `transactionService.create` (`source = 'voice'`, transcript stored).
- `voiceLanguage` setting pulled forward from Settings (persisted, independent of UI language).
- Unsupported device/locale and permission-denied states.

**Deferred:** multi-entry review list with Total + "Save all" (reference row 2, col 1) and the voice settings screen.

**Exit:** parser fixture suite passes (≥ 50 phrases per language); on-device test in Bengali, Hindi, English on at least one Android device (and iOS if available); nothing saves without review.

---

## Phase 3 — Reports

**Reference:** Reports (row 2, col 2), Category Breakdown (row 2, col 3), Monthly Calendar (row 2, col 4), Dashboard trend chart (row 1, col 3).

> Implemented in code (2026-11-12; the user's brief called this "Phase 4"). Scope expanded at the user's request with the items marked *(added)*. tsc/lint/jest pass; on-device exit check pending a development build.

**Scope**
- `reportRepository` aggregations + `reportService`; pure math in `features/reports/analytics.ts`.
- `LineChart`, `DonutChart`, `Legend`, `CalendarGrid` on `react-native-svg`.
- Reports screen: summary cards, donut with total, category legend with %, expense trend, month filter.
- Category Breakdown screen.
- Monthly Calendar with daily totals, selected date, day summary, transaction details.
- Dashboard trend chart.
- *(added)* Period filter shared by every report: this month / last month / this year / custom range (validated).
- *(added)* Net balance, saved amount and savings rate (null without income); insights (average daily expense, highest/lowest day, top categories, count); income category breakdown.
- *(added)* Comparison with the previous period (no percentage when the previous value is 0).
- *(added)* CSV export of the period's transactions via the share sheet — pulls `expo-file-system` + `expo-sharing` forward from Phase 7.

**Exit:** aggregation tests pass (incl. empty months, single category, rounding of percentages to 100%); charts render correctly with 0, 1, and many data points.

---

## Phase 4 — Budgets

> Inserted at the user's request (2026-11-12; the user's brief called this "Phase 5: Budget Management"). No reference panel — an "unseen screen" built from existing components and tokens (ARCHITECTURE.md §9.6). Implemented in code: tsc/lint/jest pass; on-device exit check pending a development build.

**Scope**
- Migration 003: `budgets` table (overall or expense-category budget per month `YYYY-MM` and currency, integer `amount_minor > 0`), partial unique indexes against duplicates, triggers rejecting income categories.
- `budgetRepository` (SQL only); `budgetService` (validation, create / edit amount / delete); pure math in `features/budgets/calculations.ts`.
- Spending reuses `reportRepository` aggregations (expense only, active currency) — no duplicated spending SQL; Dashboard, Reports and Budgets always agree.
- Status: no budget / within (< 80%) / approaching (80–< 100%) / exceeded (≥ 100%). Integer cross-multiplication, no float money math.
- In-app warnings at 80% / 90% / 100%: one per budget at its highest threshold, recomputed whenever data changes (`dataVersion`).
- Budget screen (`/budgets`): month selector (any month → history), overall card, warnings, category budgets with progress, spending without a budget, create/edit sheet, delete with confirmation.
- Entry points: Budget card on the Reports screen; budget summary card on the Dashboard when the month has budgets.
- `budgets` i18n namespace (en, bn, hi).

**Out of scope:** push notifications, background monitoring, copying/rolling budgets into a new month, income budgets.

**Exit:** budget calculation, repository and service tests pass (thresholds, zero budget, income exclusion, history, transaction edits); budgets persist across restarts; screens pass the design checklist in English, Bengali and Hindi.

---

## Phase 5 — Settings & Data Management

> Implemented in code (2026-11-12; the user's brief called this "Phase 6"). Merges the settings scope of the old "Settings & Onboarding" phase with "Backup & Restore" (old Phase 7). Onboarding and profile moved to Phase 7. tsc/lint/jest pass; on-device exit check pending a development build.

**Reference:** Settings (row 2, col 5). Sub-screens are unseen screens built from existing components (ARCHITECTURE.md §9.6).

**Scope**
- Settings hub: General (UI language, theme, currency ₹ INR), Voice (voice language + recognition status), Data management (backup, restore, CSV export, clear all data), About (about, privacy, licenses).
- Theme: light / dark / system, persisted, live switch. Dark palette = ARCHITECTURE.md §6.1 (approved; dark primary `#7857FA` for 4.5:1 on fills).
- Voice settings: voice language (bn/en/hi, independent of UI language), recognizer availability, permission status (allow / open system settings), locale support (offline / network / unsupported / unknown), manual-entry fallback.
- Backup: versioned JSON (`schemaVersion` 1) with all categories, transactions, budgets and preferences; share sheet or system folder picker; nothing is uploaded by the app.
- Restore: pick file → validate (`parseBackup`) → preview (date, version, counts) → warning + "back up first" → confirm → full replacement in one exclusive transaction with rollback.
- CSV export shortcut reusing the Reports export with its own period.
- Clear all data: two confirmations; deletes transactions, budgets and user categories, reseeds default categories, keeps preferences.
- Privacy and About screens; open-source licenses from `scripts/generate-licenses.mjs` (`npm run licenses`).
- `GoogleDriveBackupProvider` exists only as a disabled placeholder (no OAuth, no Drive API) — Drive API backup of app content needs express prior written consent under Google's policy.
- Adds `expo-application` (build number). `expo-document-picker` is not needed (`expo-file-system` pickers).

**Out of scope:** onboarding/profile (Phase 7), notifications, Google Drive API integration, merge restore, multi-currency.

**Exit:** settings persist across restarts; theme and UI language switch live; UI language and voice language independent; export → wipe → import round-trip restores identical data (repository test passes; on-device check pending); invalid backups are rejected without writing.

---

## Phase 6 — Language Expansion

**Scope**
- Translations for remaining scheduled languages (status `partial` until native review).
- Additional Noto script fonts; per-script line-height tuning.
- RTL support for Urdu, Kashmiri, Sindhi (`forceRTL` + reload, mirrored icons/charts).
- Speech locale mapping and number-word tables per language.
- Script decisions for Santali, Manipuri, Sindhi, Kashmiri.

**Exit:** every screen passes the language stress pass in each shipped language.

---

## Phase 7 — Onboarding & Profile

> Moved from the old Phase 5 at the user's request (2026-11-12). Backup & Restore, previously Phase 7, is now part of Phase 5.

**Reference:** Splash (row 1, col 1), Onboarding (row 1, col 2), Settings profile row (row 2, col 5).

**Scope**
- Splash/intro with language shortcut; onboarding pager; `onboardingDone` flag.
- *(pulled forward, done 2026-11-13)* Startup preloader: brand purple + `assets/images/logo.png` centred (min 1.2 s), also used as the native splash image (needs a new native build). First-launch onboarding pager (`/onboarding`, 7 slides: welcome, add income/expense, voice, categories, budgets, reports, settings) with Skip, dots, Next / Get Started and a language shortcut; `onboardingDone` setting (device-only, not in backups) gates it via `Stack.Protected`. The reference intro panel (row 1, col 1) is replaced by the preloader at the user's request.
- Profile name in Settings.
- *(pulled forward, done 2026-11-12)* Profile photo: tap the dashboard avatar → sheet to choose (system photo picker, square crop) or remove a photo. Stored only in app-private files (`src/features/profile`), not in SQLite or backups. Adds `expo-image-picker` (camera permission blocked) — needs a new native build.
- Currency default derived from device locale (`expo-localization`), once more currencies exist.

**Exit:** first launch → onboarding → dashboard; later launches go straight to the dashboard.

---

## Phase 8 — Hardening & Release

> Pulled forward and implemented in code at the user's request (2026-11-12; the user's brief called this "Phase 7"). Done: data-integrity guards (amount ceiling on every write path, migration 004 triggers, atomic create, stricter restore validation), release config (app IDs, permissions, `allowBackup: false`, iOS privacy manifest, `eas.json`), accessibility fixes (AA text tokens, iOS announcements, inline save errors, touch targets, chart summaries, reduced motion), error-state gaps, voice-screen re-render fix, docs (`TESTING.md`, `RELEASE_CHECKLIST.md`, `STORE_LISTING.md`, `PRIVACY_POLICY.md`). Not done: notifications (not approved), `CloudSpeechEngine` (not needed), on-device verification, store builds.

> *(added 2026-11-13, user request)* Settings → Export transactions offers CSV or PDF (PDF rendered on-device with `expo-print`; Reports keeps CSV only). More tab → Help & Support screen (email / WhatsApp contact via the user's own apps, FAQs). tsc/lint/jest pass; on-device check pending a new development build (`expo-print` is native).

> *(added 2026-11-13, user request)* App lock (`src/features/security`): optional lock using the phone's own security via `expo-local-authentication`, with no app PIN stored. Settings → Security → App lock: Off / Fingerprint-Face (prompt opens automatically) / Phone screen lock (tap the lock icon). Offered as the last onboarding step when the phone has a screen lock. Locks on cold start and after > 60 s in the background. Device-only setting (not in backups). tsc/lint/jest pass; on-device check pending a new development build (native module).

**Scope**
- Accessibility audit (labels, roles, contrast, font scaling, touch targets).
- Performance (long lists, startup time).
- Decide on notifications (daily reminder) — implement only if approved.
- Evaluate `CloudSpeechEngine` if native coverage is insufficient.
- Privacy policy text (microphone, speech data), store assets, EAS production builds.

**Exit:** production builds for Android and iOS; release checklist complete.

---

## Phase 9 — Smart Receipt Scanner

> Pulled forward at the user's request (2026-11-13; the user's brief called this "Phase 8"). No reference panel — unseen screens built from existing components and tokens (ARCHITECTURE.md §9.6). Implemented in code; on-device check pending a new development build. Phases 6 and 7 remain open.

**Scope**
- 9.1 Capture: `expo-image-picker` camera (camera permission enabled) and gallery; Android crop/rotate in the picker, in-app rotate; `expo-image-manipulator` resize (≤ 2000 px) and quality checks; photos in app-private `receipts/` files.
- 9.2 OCR: `ReceiptOCRProvider` interface; on-device `expo-mlkit-ocr` (ML Kit Latin model on Android, Apple Vision on iOS) loaded optionally; rows rebuilt from bounding boxes; 30 s timeout, cancel, progress stages. No cloud OCR.
- 9.3 Parser: deterministic `parseReceipt` (vendor, date, bill no., payment method, items with qty/unit/price/total, subtotal, tax, discount, charges, round-off, grand total); Indian grouping, Bengali/Devanagari digits; uncertainty flags; never invents names or amounts. `validateReceipt` reports discrepancies and never changes amounts.
- 9.4 Review: editable shop, bill no., items (add/edit/delete), totals, total choice, discrepancy card with an explicit "I've checked the amount"; category/amount/date/payment/note reuse the Add Transaction fields; draft kept in `receipts/draft.json` and resumable; rescan asks before replacing edits.
- 9.5 Migration 005 (`receipts`, `receipt_items`); expense + receipt + items saved in one transaction; `save_key` makes retries idempotent; confirmed total = expense amount.
- 9.6 History: receipt icon on transaction rows; "View receipt" on the edit screen → receipt screen (photo, items, totals, edit details, remove attachment). Deleting an expense deletes its receipt and photo.
- 9.7 Errors with a manual-entry fallback; tests (parser fixtures, validation, repository, services, review screen); privacy text.

**Limits:** receipts are not in backups (restore / clear data delete them); no perspective or contrast correction; no crop on iOS; on-device OCR does not read Bengali or Devanagari script or Bengali numerals, and handwriting is weak — those receipts are typed in on the review screen. Parser fixtures are synthetic OCR text: real-receipt accuracy is not measured yet.

**Exit:** capture/select → review → save works on a device; itemized, total-only and corrected receipts save once; data and photo persist after restart; screens pass the design checklist in English, Bengali and Hindi, light and dark.

---

## Phase 10 — App Update Gate

> Pulled forward at the user's request (2026-11-14; the user's brief called this "Phase 9 — Mandatory App Update System"). No reference panel — screens built from existing components and tokens (ARCHITECTURE.md §9.6). Implemented in code; on-device check pending a release build (the gate is off in development builds). Phases 6 and 7 remain open.

**Scope**
- Remote policy: the existing `https://expensetracker.dlyneed.com/config.json` is the single source of truth (no new config system). Zod-validated, backward-compatible; optional per-language `releaseNotes` / `message`.
- Semantic version comparison against the installed version (`expo-application`, app.json fallback).
- Rules: below `minimumSupportedVersion` → mandatory (unless `forceUpdate: false`, which only suggests); below `latestVersion` → optional sheet with Later; otherwise nothing.
- Mandatory screen replaces the navigator at the root (no tabs, back stack or deep links); Update now + Try again, release notes, offline / store-unavailable messages.
- Store redirection: Play Store / App Store links (Play fallback from the package name). No Play In-App Updates (would need a third-party native module); iOS cannot force-install — the user updates in the App Store.
- Offline: last good policy cached in `settings` (device-only); a cached mandatory policy blocks for up to 30 days after the last successful check; no policy → never blocked; re-check on return from the store and on foreground (at most every 15 min). User data is never touched.
- `appUpdate` i18n namespace (en, bn, hi); privacy texts and docs updated for the update check.

**Out of scope:** Play In-App Updates, staged rollouts, per-platform minimum versions.

**Exit:** tests for version comparison, schema, rules, service, store links and the root gate pass; on a release build each manual case in TESTING.md (App update) passes on Android and iOS; data intact after updating.

---

## Phase 11 — AdMob & Google Play Release

> Requested 2026-11-14 (the user's brief called this "Phase 10 — AdMob + Google Play Release Preparation"). Reverses the earlier "no ads" decision (ARCHITECTURE.md §12). No reference panel — the banner sits below existing screen content using tokens only.

**Scope**
- `react-native-google-mobile-ads` (classic Android SDK); App IDs injected by `app.config.ts` from env, Google sample IDs otherwise; EAS `production` fails without a real App ID.
- Google UMP consent at startup (after lock/onboarding/update gate); SDK initialised only when `canRequestAds`; Settings → Ad privacy options when required.
- One anchored adaptive banner on Dashboard and Reports only; test units in development; collapses on no-fill/offline; never blocks the app.
- Android only for this release; `EXPO_PUBLIC_ADS_ENABLED=0` builds without ads.
- Root `ErrorBoundary` (release blocker fix). Privacy policy, in-app privacy text, Data safety, store copy and release docs updated (`ADMOB_SETUP.md`, `PRIVACY_AND_DATA_SAFETY.md`, `PLAY_STORE_RELEASE.md`).

**Out of scope:** interstitial, app-open, rewarded or native ads; iOS ads (ATT); mediation; remote ads kill switch; automatic store submission.

**Exit:** ads tests pass; on a device build: test banner on Dashboard/Reports only, consent accept/reject flows, offline and no-fill collapse, ads-disabled build, entry/voice/receipt flows unaffected; internal testing track install.
