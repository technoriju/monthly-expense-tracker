# Testing — Monthly Expense Tracker

## Automated checks

Run all of these before every commit that changes code, and at every phase exit:

```bash
npx tsc --noEmit          # TypeScript (strict, noUncheckedIndexedAccess)
npx expo lint             # ESLint (eslint-config-expo + react-hooks/compiler rules)
npx jest                  # all test suites
npx expo install --check  # dependency versions match Expo SDK 58
```

Never report a check as passing unless it was run in the current session.

## How the tests run

- **Preset:** `jest-expo` (config in `package.json`). No global setup file; native modules are
  mocked per test file with `jest.mock` (`expo-router`, `expo-localization`, `expo-file-system`,
  `expo-sharing`, `expo-speech-recognition`, `react-native-reanimated`, …).
- **Real SQL:** repository and service tests run against an in-memory database from Node's built-in
  `node:sqlite` (`src/database/testing/createTestDatabase.ts`) with **every migration applied** and
  the system categories seeded. Tests replace `@/database/client` with
  `jest.mock('@/database/client', () => ({ getDatabase: async () => mockDb }))`.
  Requires Node 22+ (prints an `ExperimentalWarning` for SQLite — expected).
- **Limits of the test database:** no WAL journal, and `withExclusiveTransactionAsync` runs on the
  same connection (foreign keys stay on). Native expo-sqlite behaviour — separate exclusive
  connection, WAL, real file persistence — is covered by the manual device checklist below.
- **Component tests** use `@testing-library/react-native` v14: `render`, `fireEvent` and `act` are
  async and must be awaited. Screens need a `SafeAreaProvider` with `initialMetrics`; files that
  render lucide icons or Reanimated need the stubs used in
  `src/features/voice/__tests__/voiceFlow.test.tsx`.

## Coverage map

| Area | Test files | What is covered |
| --- | --- | --- |
| Money, digits, dates, formatting | `src/utils/__tests__/*` | integer paise parsing (Indic digits, ceiling), Indian grouping, local dates |
| Migrations | `src/database/__tests__/migrate.test.ts` | ordering, rollback on failure, newer DB refused, schema of 001–004, amount-guard triggers in real SQL |
| Repositories | `repositories`, `budgetRepository`, `reportRepository`, `dataRepository` tests | CRUD, constraints, filters/search/paging, aggregations, snapshot round-trip, all-or-nothing restore, clear data |
| Transactions | `src/features/transactions/__tests__/*` | form/service schemas, create/update/delete, category-type rule, amount ceiling, no duplicate when read-back fails, monthly totals |
| Budgets | `src/features/budgets/__tests__/*` | integer progress/thresholds, service rules, duplicate (incl. concurrent-insert race), screens |
| Reports | `src/features/reports/__tests__/*` | analytics (percentages sum to 100), periods, comparisons, calendar, CSV (escaping, formula injection, cache cleanup), screens |
| Backup / restore | `src/features/data-management/__tests__/*` | generation, validation (amount ceiling, type mismatch, size, structure, consistency), backup → clear → restore, oversized file, preferences failure after commit |
| Voice | `src/features/voice/**/__tests__/*` | parser fixtures (≥ 50 phrases each in en/bn/hi), session lifecycle and races, volume-only snapshot stability, review → save flow, inline save error |
| Settings | `src/features/settings/__tests__/*` | hydrate, language/voice/theme, settings and restore screens |
| i18n | `src/i18n/__tests__/languages.test.ts` | registry, key parity and `{{placeholder}}` parity en/bn/hi, no empty strings |
| Theme | `src/theme/__tests__/theme.test.tsx` | WCAG AA for every text token on every surface (light + dark), theme switching |

### Known gaps

- `NativeSpeechEngine` is tested only without the native module (error mapping, locale
  classification and `requiresOnDeviceRecognition` with the module present are verified on device).
- No automated end-to-end UI tests (Detox/Maestro); navigation, pickers, share sheets and the
  system permission dialogs are manual.
- Screen-reader output (TalkBack / VoiceOver) is manual.

## Manual device checklist

Run on a **release or preview build** (not Expo Go). Tick each item on Android, and on iOS when a
build is available. Repeat the starred items in Bengali and Hindi, light and dark theme.

**Install & startup**
- [ ] Fresh install starts to the Dashboard; no crash; splash hides
- [ ] Kill and reopen: data and settings persist (SQLite file)
- [ ] Airplane mode on: every screen below still works (except network voice recognition)

**Transactions** ⭐
- [ ] Add expense and income (Indic digits accepted in amount); totals update on Dashboard
- [ ] Edit amount, category, date, note, payment method; delete from edit screen and by long-press
- [ ] Double-tap Save adds one transaction only
- [ ] Amount above ₹99,99,99,999.99 is rejected with a message

**Voice** ⭐
- [ ] First use asks for microphone (and speech on iOS) permission with the explanation text
- [ ] Deny → clear message + "open settings" path; manual entry still available
- [ ] Record in English, Bengali, Hindi → Review screen → Confirm & Save; nothing saved before confirm
- [ ] Airplane mode: works if the offline pack is installed, otherwise shows the network/unsupported message
- [ ] Leaving the tab or backgrounding the app stops the microphone

**Reports & budgets** ⭐
- [ ] Reports, Category Breakdown, Calendar show correct totals for this month / last month / custom range
- [ ] Charts render with 0, 1 and many data points
- [ ] Create overall + category budgets; 80% / 90% / 100% warnings appear; history months keep budgets

**Settings & data**
- [ ] UI language and voice language switch independently and persist
- [ ] Theme light / dark / system switches live
- [ ] Backup via share sheet and via folder; file opens as JSON
- [ ] Clear all data (two confirmations) → Restore the backup → identical data and preferences
- [ ] Restore of a non-backup file / edited file is rejected without changing data
- [ ] CSV export opens in a spreadsheet with correct Bengali/Hindi text

**Accessibility**
- [ ] TalkBack / VoiceOver: every button has a name; chart summaries are read; save errors and toasts are announced
- [ ] Transaction rows offer a "Delete" action in the screen-reader actions menu
- [ ] Largest system font size: no clipped text on Dashboard, Add Transaction, Reports, Settings
- [ ] Reduce motion on: mic pulse and waveform stay still
