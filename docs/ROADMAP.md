# Roadmap — Monthly Expense Tracker

> See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for design decisions. Reference panels refer to `docs/design-reference.png` (row, column).

**Current phase:** **Phase 3 — Reports** implemented in code (2026-11-12; the user's brief called this "Phase 4: Reports & Analytics"). Phases 1 and 2 are also implemented in code. tsc/lint/jest pass; on-device exit checks for all three are pending a development build (Expo Go lacks `ExpoSQLite` and `ExpoSpeechRecognition`). Next: Phase 4 — Settings & Onboarding.

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
- *(added)* CSV export of the period's transactions via the share sheet — pulls `expo-file-system` + `expo-sharing` forward from Phase 6.

**Exit:** aggregation tests pass (incl. empty months, single category, rounding of percentages to 100%); charts render correctly with 0, 1, and many data points.

---

## Phase 4 — Settings & Onboarding

**Reference:** Splash (row 1, col 1), Onboarding (row 1, col 2), Settings (row 2, col 5).

**Scope**
- Splash/intro with language shortcut; onboarding pager; `onboardingDone` flag.
- Settings hub: profile name, UI language, currency, voice input toggle, voice language, theme mode, about.
- Currency default derived from device locale (`expo-localization`), user-changeable.
- Language picker shows `complete`/`partial` languages by native name.

**Out of scope:** notifications, backup/restore (rows shown but disabled or hidden until their phase), help/support content.

**Exit:** first launch → onboarding → dashboard; settings persist across restarts; UI language and voice language independent.

---

## Phase 5 — Language Expansion

**Scope**
- Translations for remaining scheduled languages (status `partial` until native review).
- Additional Noto script fonts; per-script line-height tuning.
- RTL support for Urdu, Kashmiri, Sindhi (`forceRTL` + reload, mirrored icons/charts).
- Speech locale mapping and number-word tables per language.
- Script decisions for Santali, Manipuri, Sindhi, Kashmiri.

**Exit:** every screen passes the language stress pass in each shipped language.

---

## Phase 6 — Backup & Restore

**Scope**
- Add `expo-document-picker` (`expo-file-system` and `expo-sharing` were added in Phase 3 for CSV export).
- Export versioned JSON (schema version + data); share sheet.
- Import with validation (Zod), preview, and explicit confirmation before replacing data.

**Exit:** export → wipe → import round-trip restores identical data.

---

## Phase 7 — Hardening & Release

**Scope**
- Accessibility audit (labels, roles, contrast, font scaling, touch targets).
- Performance (long lists, startup time).
- Decide on notifications (daily reminder) — implement only if approved.
- Evaluate `CloudSpeechEngine` if native coverage is insufficient.
- Privacy policy text (microphone, speech data), store assets, EAS production builds.

**Exit:** production builds for Android and iOS; release checklist complete.
