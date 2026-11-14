# Architecture — Monthly Expense Tracker

> Status: living architecture document. Phases 0–5 and the Hardening & Release pass (ROADMAP Phase 8, pulled forward) are implemented; see [`ROADMAP.md`](./ROADMAP.md) for status.
> Companion docs: [`ROADMAP.md`](./ROADMAP.md), [`design.md`](./design.md), [`design-reference.png`](./design-reference.png), [`../AGENTS.md`](../AGENTS.md).

---

## 1. Overview & Principles

An offline-first, multilingual mobile app (Android + iOS) for tracking monthly income and expenses, with manual and voice entry and monthly reports.

**Principles**

1. **Offline-first.** SQLite on device is the single source of truth. No network is required for any core feature.
2. **Strict layering.** Data flows one way:

   ```
   Route screen (src/app)  →  feature hook  →  feature service  →  repository  →  SQLite
        UI only                 state/effects     business rules      SQL only
   ```

   - Screens never import repositories or `expo-sqlite`.
   - No SQL outside `src/database/`.
   - Services contain business rules (validation, money math, report shaping) and are UI-agnostic.
3. **Design fidelity.** `docs/design-reference.png` is the visual source of truth; `docs/design.md` defines tokens. Feature code uses tokens only.
4. **Localization by default.** Every user-facing string is a typed i18n key. Identifiers (category keys, DB values) are never translated.
5. **Minimal dependencies.** Prefer Expo modules; add a library only when the phase needs it.
6. **TypeScript strict.** No `any` without a written justification comment.

---

## 2. Stack & Versions

The project is already on **Expo SDK 58** (`expo ~58.0.23`, React Native 0.88.1, React 19.3, TypeScript ~6.0.3, Expo Router ~58, `typedRoutes` and `reactCompiler` enabled). This is current; we stay on it.

**Rule:** install every package with `npx expo install <pkg>` so versions resolve to SDK 58–compatible releases. Read the v58 docs (`https://docs.expo.dev/versions/v58.0.0/`) before using any Expo API — see `AGENTS.md`.

### Dependencies by phase (added only when the phase starts)

| Phase | Package | Purpose |
| --- | --- | --- |
| 0 | `expo-sqlite` | Local database |
| 0 | `expo-localization` | Device locale / currency / region |
| 0 | `i18next`, `react-i18next` | Localization |
| 0 | `zustand` | Settings cache + UI state |
| 0 | `react-native-svg` | Icons + charts |
| 0 | `lucide-react-native` | Icon set |
| 0 | `date-fns` | Date math + localized formatting |
| 0 | `@expo-google-fonts/inter`, `@expo-google-fonts/noto-sans-bengali`, `@expo-google-fonts/noto-sans-devanagari` | Fonts for en / bn / hi (+ mr, ne, sa, kok, mai, doi, bodo) |
| 0 (dev) | `jest-expo`, `jest`, `@testing-library/react-native`, `@types/jest` | Tests |
| 1 | `react-hook-form`, `zod`, `@hookform/resolvers` | Forms + validation |
| 1 | `@react-native-community/datetimepicker` | Date selector |
| 2 | `expo-speech-recognition` | Device speech-to-text via the OS recognizer — on-device when the locale's offline pack is installed, otherwise the OS service may use the network (config plugin → **development build required; does not run in Expo Go**) |
| 3 | `expo-file-system`, `expo-sharing` | CSV export of report transactions (pulled forward from Phase 7) |
| 5 | `expo-application` | Native version / build number on the About screen |
| 9 | `expo-image-manipulator` | Receipt photo rotate / resize |
| 9 | `expo-mlkit-ocr` | On-device receipt text recognition (ML Kit Latin on Android, Apple Vision on iOS); loaded with `requireOptionalNativeModule`, so a missing module means "unavailable", not a crash |

Backup / restore (Phase 5) reuses `expo-file-system` (including its `File.pickFileAsync` / `Directory.pickDirectoryAsync` pickers) and `expo-sharing`; `expo-document-picker` is not needed.

**Not added:** chart libraries (custom charts on `react-native-svg`), UI kits, NativeWind, ORMs, navigation libs beyond Expo Router.

**Proposed removal in Phase 0** (starter-only, confirm first): `@expo/ui`, `expo-glass-effect`, `expo-symbols`, `expo-web-browser`, and the web target (`react-native-web`, `react-dom`, `web` block in `app.json`) — the app targets Android/iOS only.

---

## 3. Folder Structure

Routes stay in `src/app/` (already configured by the starter and Expo Router).

```
src/
  app/                          # ROUTES ONLY — thin screens composing feature components
    _layout.tsx                 # Root providers: fonts, DB init gate, i18n, theme
    (onboarding)/
      _layout.tsx
      index.tsx                 # Splash/intro + onboarding pager
    (tabs)/
      _layout.tsx               # Custom TabBar: Home, Reports, [Add], Voice, More
      index.tsx                 # Dashboard
      reports.tsx
      voice.tsx
      more.tsx                  # Settings hub
    transaction/
      new.tsx                   # Add (modal)
      [id].tsx                  # Edit
    transactions.tsx            # "See all"
    budgets.tsx                 # Budget screen (?month=YYYY-MM)
    reports/
      categories.tsx            # Category breakdown
      calendar.tsx              # Monthly calendar
    voice/
      review.tsx                # Review parsed entries
    settings/
      language.tsx  theme.tsx  voice.tsx
      backup.tsx  restore.tsx  export.tsx
      about.tsx  privacy.tsx  licenses.tsx

  components/
    ui/                         # Design-system primitives (Button, Card, AppText…)
    charts/                     # LineChart, DonutChart, Legend
    layout/                     # Screen, ScreenHeader, TabBar

  features/
    transactions/  { components/, hooks/, services/, schemas.ts, types.ts }
    categories/    { components/, hooks/, services/, types.ts }
    reports/       { components/, hooks/, services/, types.ts }
    budgets/       { components/, hooks/, services/, calculations.ts, schemas.ts, types.ts }
    voice/         { components/, hooks/, engine/, parser/, types.ts }
    settings/      { components/, hooks/, services/, appInfo.ts, licenses.json, types.ts }
    data-management/ { backupFormat.ts, backupValidation.ts, providers/, services/, hooks/, components/, types.ts }
    onboarding/    { components/ }

  database/
    client.ts                   # open DB, pragmas, run migrations
    migrations/                 # 001_init.ts, 002_….ts, index.ts
    repositories/               # transactionRepository.ts, categoryRepository.ts, reportRepository.ts, budgetRepository.ts, settingsRepository.ts
    seed/                       # system categories

  store/
    settingsStore.ts            # cached settings (language, currency, theme…)
    uiStore.ts                  # selected month, dataVersion

  i18n/
    index.ts                    # i18next init
    languages.ts                # registry of all supported languages
    fonts.ts                    # script → font family map
    types.d.ts                  # typed keys (module augmentation)
    locales/<code>/<namespace>.json

  theme/
    colors.ts  typography.ts  spacing.ts  radius.ts  shadows.ts
    ThemeProvider.tsx  useTheme.ts  index.ts

  hooks/                        # shared hooks (useAppFonts, useDbReady…)
  types/                        # shared domain types (Money, ISODate, CurrencyCode…)
  utils/                        # money.ts, digits.ts, dates.ts, format.ts
```

**Deviation from the initial sketch:** there is no top-level `src/services/`. Services live inside their feature (`features/<name>/services/`) so each feature is cohesive and deletable as a unit. Truly cross-feature pure helpers live in `src/utils/`. Repositories are kept together in `src/database/repositories/` so every SQL statement lives in one place.

**File rules:** components `.tsx`; services, repositories, utils, types, config `.ts`. One component per file. kebab-case or camelCase file names consistently (decide in Phase 0, then enforce).

---

## 4. SQLite Architecture

### 4.1 Connection & migrations

- `expo-sqlite` **async API**, one connection opened in `database/client.ts`.
- On open: `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`.
- Root layout gates rendering until the DB is open and migrated (use the SDK 58 `SQLiteProvider` / `onInit` pattern if available — verify against v58 docs at implementation time).
- **Migrations:** ordered array of `{ version, up(db) }`. Current version tracked with `PRAGMA user_version`. Each pending migration runs inside `withTransactionAsync`; `user_version` is bumped in the same transaction. Migrations are append-only — never edit a shipped migration.

### 4.2 Schema (migration 001)

```sql
CREATE TABLE categories (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  key          TEXT    NOT NULL UNIQUE,          -- 'bazar', 'dokan', 'food'… never translated
  type         TEXT    NOT NULL CHECK (type IN ('expense','income')),
  icon         TEXT    NOT NULL,                 -- lucide icon name
  color        TEXT    NOT NULL,                 -- theme token name, not hex
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_system    INTEGER NOT NULL DEFAULT 0,
  is_archived  INTEGER NOT NULL DEFAULT 0,
  custom_name  TEXT,                             -- only for user-created categories
  created_at   INTEGER NOT NULL                  -- epoch ms
);

CREATE TABLE transactions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  type             TEXT    NOT NULL CHECK (type IN ('expense','income')),
  amount_minor     INTEGER NOT NULL CHECK (amount_minor > 0),  -- paise / poisha
  currency         TEXT    NOT NULL,                           -- ISO 4217, e.g. 'INR', 'BDT'
  category_id      INTEGER NOT NULL REFERENCES categories(id),
  occurred_on      TEXT    NOT NULL,                           -- 'YYYY-MM-DD' local calendar date
  note             TEXT,
  source           TEXT    NOT NULL CHECK (source IN ('manual','voice')),
  voice_transcript TEXT,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

CREATE INDEX idx_tx_occurred_on   ON transactions (occurred_on);
CREATE INDEX idx_tx_type_date     ON transactions (type, occurred_on);
CREATE INDEX idx_tx_category_date ON transactions (category_id, occurred_on);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL                -- JSON-encoded
);
```

Settings keys: `uiLanguage`, `voiceLanguage`, `currency`, `themeMode`, `onboardingDone`, `voiceEnabled`, `profileName`.

### 4.2.1 Budgets (migration 003)

```sql
CREATE TABLE budgets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_type   TEXT    NOT NULL CHECK (budget_type IN ('overall','category')),
  category_id   INTEGER REFERENCES categories(id) ON DELETE RESTRICT,  -- NULL for overall
  amount_minor  INTEGER NOT NULL CHECK (amount_minor > 0),
  currency      TEXT    NOT NULL,
  month         TEXT    NOT NULL,          -- 'YYYY-MM' (CHECK-validated)
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  CHECK ((budget_type = 'overall' AND category_id IS NULL) OR
         (budget_type = 'category' AND category_id IS NOT NULL))
);
CREATE UNIQUE INDEX ux_budgets_overall  ON budgets (month, currency) WHERE category_id IS NULL;
CREATE UNIQUE INDEX ux_budgets_category ON budgets (month, currency, category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_budgets_category ON budgets (category_id);
-- + BEFORE INSERT / UPDATE triggers: category budgets only on 'expense' categories.
```

Budgets are per month and never copied or overwritten, so past months keep their budgets (history). Spending is not stored: it is aggregated from `transactions` by `reportRepository` (expense type, active currency, month range).

### 4.2.2 Amount guards (migration 004)

The tables are not `STRICT`, so `CHECK (amount_minor > 0)` alone accepts `1.5` or text. Migration 004 adds `BEFORE INSERT` / `BEFORE UPDATE OF amount_minor` triggers on `transactions` and `budgets` that abort with `amount_minor_invalid` unless `typeof(amount_minor) = 'integer'` and `amount_minor <= 999999999999` (the app ceiling, frozen as a literal). Existing rows are not rewritten. It also adds `idx_budgets_month_currency` for the per-month budget lookup.

### 4.2.3 Receipts (migration 005)

`receipts` (one per expense: `transaction_id UNIQUE … ON DELETE CASCADE`, `save_key UNIQUE`, vendor, bill number, `receipt_date`, `image_file` (file name only), original OCR text, provider, extracted total and subtotal / tax / discount / charges / round-off in paise) and `receipt_items` (`receipt_id … ON DELETE CASCADE`, position, name (nullable — unreadable names stay empty), original OCR name, `quantity_milli` (thousandths), unit, unit price, line total, confidences, JSON flags, `user_corrected`). Amount columns are CHECK-constrained integers within the app ceiling. The confirmed total is **not** stored: it is the expense's `amount_minor`, so receipt and expense cannot disagree. Receipt expenses are found with a `LEFT JOIN` (`Transaction.hasReceipt`); `transactions.source` is unchanged. Receipts are excluded from backups; `dataRepository` deletes them on restore and clear.

### 4.3 Data rules

- **Money:** integer minor units only. Never store or sum floats. Conversion to/from display strings happens in `utils/money.ts`. Every write path caps a single amount at `MAX_AMOUNT_MINOR` (₹99,99,99,999.99): form parser, service Zod schemas, backup validation and the DB triggers — so sums stay far below 2^53.
- **Atomic create:** `transactionRepository.insertAndGet` inserts and reads the row back in one transaction, so a reported save failure never hides a committed row (no duplicate on retry).
- **Dates:** transactions store a local calendar date string (`YYYY-MM-DD`), so a month filter is `occurred_on BETWEEN '2025-05-01' AND '2025-05-31'` with no timezone drift. Audit timestamps are epoch ms.
- **Currency:** stored per transaction. Reports aggregate only the active currency; changing currency never rewrites history.
- **Categories:** system category names come from i18n (`categories:<key>`); `custom_name` is used only for user-created categories. Deletion = archive (keeps history intact).

### 4.4 Repositories

- `transactionRepository` — `insert`, `insertMany` (single transaction, used by voice "Save all"), `update`, `remove`, `getById`, `listByMonth`, `listRecent`, `listByDate`.
- `categoryRepository` — `listByType`, `getByKey`, `seedSystemCategories`.
- `reportRepository` — aggregation queries for an inclusive date range + currency: totals and counts by type, by category (one type), by day, by month.
- `budgetRepository` — `listByMonth`, `getById`, `find`, `insert`, `updateAmount`, `remove`.
- `settingsRepository` — `get`, `set`, `getAll`.
- `dataRepository` — `exportSnapshot` (every column of categories, transactions, budgets + `user_version`), `counts`, `replaceAll(tables, settings)` (full replacement keeping original ids), `clearUserData` (keeps settings, reseeds system categories). Each runs in `withExclusiveTransactionAsync`; because `foreign_keys` is a per-connection setting, `PRAGMA foreign_key_check` runs before commit and any violation rolls everything back.
- `database/client.ts` opens the single connection once (shared promise); if migration or seeding fails, the connection is closed and the next call retries from scratch. The startup error screen offers that retry.

### 4.4.1 Backup format (Phase 5)

Versioned UTF-8 JSON, built and validated by pure code in `features/data-management/` (never touches SQLite):

```
{ format: "monthly-expense-tracker-backup", schemaVersion: 1, appVersion, exportedAt (ISO UTC),
  databaseVersion, settings: { uiLanguage?, voiceLanguage?, themeMode?, currency? },
  categories: [...], transactions: [...], budgets: [...] }   // camelCase copies of every column
```

`parseBackup(text)` returns `tooLarge | invalidJson | notBackup | unsupportedVersion | invalidStructure | inconsistent`, or a validated document (Zod: integer paise in `1 … MAX_AMOUNT_MINOR`, real `YYYY-MM-DD`, `YYYY-MM`, enums, row caps of 1,000 categories / 100,000 transactions / 50,000 budgets; cross-checks: unique ids/keys, transaction → category **of the same type**, budget → expense category, one budget per slot). Files over 50 MB are rejected by size **before** they are read into memory. Unknown or invalid preferences are dropped, not fatal. A newer `schemaVersion` is rejected. Restore = full replacement of data and preferences in one exclusive transaction, then `settingsService.hydrate` and a `dataVersion` bump. Once the replacement has committed, a failure to apply preferences is logged and restore still reports success (the preferences are stored and apply on next start). Rejected files are logged by error code only — never by content.

Destinations go through a `BackupProvider` interface. `LocalFileBackupProvider` (share sheet / system folder picker / file picker) is the only active one. `GoogleDriveBackupProvider` is a disabled placeholder: Google Drive API policy restricts app-content backup without express prior written consent, so no OAuth, Drive permission, token storage or sync exists until that is resolved.

Repositories use parameterized queries only, map rows (`snake_case`) to typed domain objects (`camelCase`) internally, and contain no business rules.

### 4.5 Services & state

- Services (e.g. `transactionService.create(input)`) validate input with Zod, apply rules (minor-unit conversion, default currency), call repositories, and return domain objects.
- **Zustand** holds:
  - `settingsStore` — in-memory cache of settings, hydrated once from SQLite at startup; writes go through `settingsService` (DB first, then store).
  - `uiStore` — `selectedMonth`, and a `dataVersion` counter bumped after every write so data hooks refetch.
- DB rows are **not** mirrored into Zustand. Feature hooks (`useMonthlySummary`, `useRecentTransactions`) query services and depend on `dataVersion` + `selectedMonth`.
- Transaction history keeps its loaded depth after a write (reloads as many rows as were shown) and shows a retry footer if a further page fails.
- Known cost (not changed, no measured impact): a write refetches every *mounted* data hook, including tabs that are not focused. Revisit with on-device profiling if lists grow large.

---

## 5. Localization Architecture

### 5.1 Language registry

`src/i18n/languages.ts` lists English + all **22 scheduled Indian languages**:

| Code | Language | Script | Dir | Font |
| --- | --- | --- | --- | --- |
| en | English | Latin | ltr | Inter |
| bn | Bengali | Bengali | ltr | Noto Sans Bengali |
| hi | Hindi | Devanagari | ltr | Noto Sans Devanagari |
| as | Assamese | Bengali | ltr | Noto Sans Bengali |
| or | Odia | Odia | ltr | Noto Sans Oriya |
| mr | Marathi | Devanagari | ltr | Noto Sans Devanagari |
| gu | Gujarati | Gujarati | ltr | Noto Sans Gujarati |
| pa | Punjabi | Gurmukhi | ltr | Noto Sans Gurmukhi |
| ta | Tamil | Tamil | ltr | Noto Sans Tamil |
| te | Telugu | Telugu | ltr | Noto Sans Telugu |
| kn | Kannada | Kannada | ltr | Noto Sans Kannada |
| ml | Malayalam | Malayalam | ltr | Noto Sans Malayalam |
| ur | Urdu | Perso-Arabic | **rtl** | Noto Nastaliq Urdu / Noto Naskh Arabic |
| sa | Sanskrit | Devanagari | ltr | Noto Sans Devanagari |
| kok | Konkani | Devanagari | ltr | Noto Sans Devanagari |
| mni | Manipuri | Meitei Mayek | ltr | Noto Sans Meetei Mayek |
| brx | Bodo | Devanagari | ltr | Noto Sans Devanagari |
| sat | Santali | Ol Chiki | ltr | Noto Sans Ol Chiki |
| ks | Kashmiri | Perso-Arabic | **rtl** | Noto Naskh Arabic |
| doi | Dogri | Devanagari | ltr | Noto Sans Devanagari |
| sd | Sindhi | Perso-Arabic | **rtl** | Noto Naskh Arabic |
| mai | Maithili | Devanagari | ltr | Noto Sans Devanagari |
| ne | Nepali | Devanagari | ltr | Noto Sans Devanagari |

> ⚠ `docs/design.md` §8 omits **Maithili** and **Nepali**, which are scheduled languages. They are included here; design.md should be updated.

Each entry: `{ code, nativeName, englishName, script, direction, fontKey, speechLocales: string[], status: 'complete' | 'partial' | 'planned' }`. Only `complete`/`partial` languages appear in the UI picker. Initially `en`, `bn`, `hi` are `complete`; the rest `planned`.

### 5.2 i18next setup

- Namespaces: `common`, `dashboard`, `transactions`, `categories`, `reports`, `budgets`, `voice`, `settings`, `onboarding`.
- Resources: static JSON in `src/i18n/locales/<code>/<ns>.json`, bundled (small; no network).
- `fallbackLng: 'en'`; missing keys in partial languages fall back to English.
- **Typed keys**: `i18next` module augmentation using the English resources as the schema → a misspelled key is a compile error.
- Pluralization via i18next `_one/_other` suffixes (uses `Intl.PluralRules`).

### 5.3 Language selection

- **Startup:** saved `uiLanguage` → else best match from `expo-localization` `getLocales()` against registry → else `en`.
- **Switching:** `i18n.changeLanguage()` + settings write; re-renders without restart.
- **RTL exception** (ur, ks, sd): requires `I18nManager.forceRTL()` and an app reload — the UI warns before reloading. RTL support lands in Phase 6.
- **UI language and voice language are separate settings** (`uiLanguage`, `voiceLanguage`). A Bengali UI user can dictate in English and vice versa.

### 5.4 Formatting (`src/utils/format.ts`)

- Numbers/currency via `Intl.NumberFormat(locale, …)` — supports Indian lakh/crore grouping (`en-IN`, `bn-IN`, `hi-IN`) and optional native digits (`numberingSystem: 'beng' | 'deva'`).
- Fallback formatter if Hermes `Intl` lacks the locale data (detected once at startup).
- Dates via `date-fns` locale where one exists (e.g. `bn`, `hi`), else `Intl.DateTimeFormat`, else English.
- **Calculations are locale-independent**: formatting is the last step only.

### 5.5 Digit normalization (`src/utils/digits.ts`)

Maps every Indic digit set (Bengali ০-৯, Devanagari ०-९, Gujarati, Gurmukhi, Odia, Tamil, Telugu, Kannada, Malayalam, Ol Chiki, Meitei, Arabic-Indic/Extended) to ASCII `0-9`. Used by amount inputs and the voice parser.

---

## 6. Theme & Typography Architecture

### 6.1 Tokens (`src/theme/`)

- `colors.ts` — the raw palette from `design.md` §2 verbatim, plus **semantic** tokens consumed by components:

  | Semantic token | Light | Dark (proposed) |
  | --- | --- | --- |
  | `background` | `#F7F6FC` | `#0F0D1A` |
  | `surface` | `#FFFFFF` | `#1A1729` |
  | `surfaceMuted` | `#EDE7FF` | `#231F36` |
  | `primary` | `#5B2ED6` | `#7C5CFF` |
  | `primaryPressed` | `#3D1AA8` | `#5B2ED6` |
  | `primarySoft` | `#EDE7FF` | `#2A2050` |
  | `onPrimary` | `#FFFFFF` | `#FFFFFF` |
  | `textPrimary` | `#17152A` | `#F4F2FA` |
  | `textSecondary` | `#706E82` | `#A8A5BC` |
  | `textMuted` (icons, placeholders, inactive only) | `#8F8BA3` | `#6F6B86` |
  | `primaryText` (text/links in brand hue) | `#5B2ED6` | `#9C84FF` |
  | `incomeText` / `expenseText` / `accentText` | `#11813B` / `#DE1313` / `#A35E00` | = dark `income` / `expense` / `accent` |
  | `border` | `#E9E5F3` | `#2E2A45` |
  | `income` / `incomeSoft` | `#16A34A` / `#E9F9EF` | `#22C55E` / `#12301F` |
  | `expense` / `expenseSoft` | `#EF4444` / `#FFF0F1` | `#F87171` / `#3A1A1E` |
  | `accent` / `accentSoft` | `#FF9F1C` / `#FFF0D9` | `#FFB04D` / `#3A2A12` |
  | chart series | design.md chart colors | same hues, +10% lightness |

  > Dark palette approved and implemented in Phase 5 (2026-11-12) with one change: dark `primary` is `#7857FA` (not `#7C5CFF`) so white text on primary fills meets 4.5:1. Added tokens `inverseSurface` / `onInverseSurface` (toast). `theme/__tests__/theme.test.tsx` enforces contrast. Hardening pass (accessibility audit): light `textSecondary` darkened from the reference `#77758A` to `#706E82` and `textMuted` from `#A09CB3` to `#8F8BA3` (now reserved for non-text, ≥ 3:1); text-only tokens `primaryText`, `incomeText`, `expenseText`, `accentText` added so readable text meets 4.5:1 while fills, bars and charts keep the brand hues. The test asserts every text token on every surface it is drawn on, in both themes.

- `typography.ts` — scale from design.md §3 (`display 32/Bold` … `caption 11/Regular`, `amountLarge 28/Bold`, `amountMedium 20/Bold`) with explicit line heights: ≈1.3× for Latin, ≈1.5× for Indic scripts (prevents clipping of matras, conjuncts, and descenders).
- `spacing.ts`, `radius.ts` — verbatim from design.md §4–5.
- `shadows.ts` — `card` (soft, low elevation) and `raised` (center Add button, balance card); platform-specific (`shadow*` on iOS, `elevation` on Android).

### 6.2 Theme provider

- `themeMode` setting: `system | light | dark` (default `system`; `app.json` keeps `userInterfaceStyle: "automatic"`).
- `ThemeProvider` resolves the active scheme and exposes `useTheme()` → `{ colors, typography, spacing, radius, shadows, scheme }`.
- Components build styles with a small `makeStyles(theme => StyleSheet.create(...))` helper, memoized per theme.

### 6.3 Fonts

- Loaded with `expo-font` at startup (splash held until ready). Phase 0 loads Inter + Noto Sans Bengali + Noto Sans Devanagari (Regular, Medium, SemiBold, Bold). Other script fonts are added in Phase 6 as languages ship.
- Custom fonts need one family name per weight, so `fontWeight` alone is not used. `<AppText variant="heading2">` resolves `fontFamily` from **(active UI language script × variant weight)** via `src/i18n/fonts.ts`.
- Numbers/amounts: always rendered with the active script font, which includes Latin digits as fallback.
- `allowFontScaling` stays enabled for accessibility; `maxFontSizeMultiplier` is capped on amount and tab-bar text to prevent layout breakage.

### 6.4 Rules

- No raw hex colors, font sizes, or magic spacing numbers in `features/` or `app/` — tokens only.
- No gradients, glassmorphism, or decorative animation beyond what the reference shows (purple splash/balance card, listening pulse, waveform).

---

## 7. Reusable UI Components

All in `src/components/` and token-driven.

| Component | Used by (reference panel) |
| --- | --- |
| `AppText` (variants) | everywhere |
| `Button` (`primary` / `secondary` / `danger` / `ghost`, min height 48) | Get Started, Next, Save, Save All, Edit More, Cancel |
| `IconButton` | header menu, calendar, edit pencil |
| `Card` | all cards |
| `SummaryCard` (income / expense variant) | Dashboard, Reports |
| `BalanceCard` | Dashboard remaining balance |
| `SegmentedControl` | Expense/Income, বাংলা/English |
| `TextField`, `AmountField`, `DateField` | Add Transaction |
| `CategoryIcon` (pastel circle + Lucide icon) | grid, rows, review |
| `CategoryGrid` | Add Transaction |
| `TransactionRow` | Dashboard recent, list, Review |
| `SectionHeader` (title + "See all") | Dashboard |
| `MonthSelector` (pill + calendar icon) | Dashboard, Reports |
| `SettingsRow` (chevron / switch / value) | Settings |
| `Toggle` | Settings |
| `Screen` (safe area + optional scroll) | all screens |
| `ScreenHeader` (back + title + action) | all stack screens |
| `TabBar` (Home, Reports, raised Add, Voice, More) | tab shell |
| `EmptyState` | lists without data |
| `MicButton` (pulse rings) + `Waveform` | Voice Entry |
| `LineChart` (area + points) | Dashboard trend, Reports expense trend |
| `DonutChart` + `Legend` | Reports, Category Breakdown |
| `CalendarGrid` | Monthly Calendar |
| `PagerDots` | Onboarding |

Components are built when the first screen needing them is built (not all up-front), except the Phase 0 primitives (`AppText`, `Button`, `Card`, `Screen`, `ScreenHeader`, `TabBar`, `IconButton`).

---

## 8. Voice Entry Architecture

### 8.1 Speech engine abstraction

```ts
interface SpeechEngine {
  isAvailable(): Promise<boolean>;
  getSupportedLocales(): Promise<string[]>;
  requestPermissions(): Promise<boolean>;
  start(options: { locale: string; onDevice?: boolean }): void;
  stop(): void;
  abort(): void;
  // events: partialResult, finalResult, volumeChange (drives waveform), error, end
}
```

- `NativeSpeechEngine` — wraps `expo-speech-recognition` (Android `SpeechRecognizer`, iOS `SFSpeechRecognizer`). Ships in Phase 2 (Voice Entry).
- `CloudSpeechEngine` — reserved slot (e.g. Google Cloud STT / Bhashini via a backend proxy). Evaluated in Phase 8 only if native coverage proves insufficient. Never required for core features.
- The voice-language picker shows **only locales the device actually supports**, queried at runtime and intersected with the registry's `speechLocales`.

### 8.2 Parsing pipeline (`features/voice/parser/`)

Pure TypeScript, fully unit-testable, no I/O:

1. **Normalize** — Unicode NFC, lowercase Latin, Indic digits → ASCII (`utils/digits.ts`).
2. **Number words → numbers** — per-language tables: English ("one hundred fifty"), Bengali (একশো, দেড়শো = 150, আড়াইশো = 250, হাজার), Hindi (सौ, डेढ़ सौ, ढाई सौ, हज़ार), plus romanized forms.
3. **Segment** — split on commas, "and" / "আর" / "এবং" / "और" / "तथा", and on amount boundaries ("bazar 100 dokan 200" → 2 segments).
4. **Category match** — keyword dictionaries per language mapped to category keys (bazar / বাজার / बाज़ार → `bazar`), including Banglish/Hinglish romanized words; fallback `others`.
5. **Output** — `ParsedEntry[]` `{ categoryKey, amountMinor, type, confidence, rawSegment }`.

**As implemented (Phase 2, single entry):** `parseVoiceExpense(text, { language, currency, today })` returns one in-memory `VoiceExpenseDraft` (`amountMinor | null`, `categoryKey | null`, `occurredOn`, `note`, `paymentMethod`, `recognizedText`, `missingFields`, `uncertainFields`, `status`). Amounts are computed in integer hundredths — no floats. Several different amounts or categories → the field is left empty and flagged, never guessed. The draft lives in `store/voiceDraftStore.ts` (memory only); the Review screen reuses the Add Transaction form and saves through `transactionService.create(input, { source: 'voice', voiceTranscript })`, which stores `voice_transcript`. Segmentation into several entries and "Save all" are deferred.

**Native build:** `expo-speech-recognition` is a config plugin with native code → it does not run in Expo Go. Build a development client (`npx expo run:android` / `npx expo run:ios`, or `npx eas-cli@latest build --profile development`). Without the native module the engine reports `unavailable` and the screen offers manual entry.

**Safety rule:** parsed entries **always** go to the Review screen for confirmation/editing. Voice never writes to the DB directly. "Save all" uses `transactionRepository.insertMany` in one transaction, with `source = 'voice'` and the transcript stored.

---

## 9. Keeping the UI Consistent with the Reference

1. **Panel mapping.** Every screen in `ROADMAP.md` names its reference panel (e.g. "Dashboard — row 1, col 3"). Implementation starts by re-reading that panel and design.md.
2. **Tokens only.** Colors, type, spacing, radius, and shadows come from `src/theme`. Reviews reject literals.
3. **Primitives first.** Screens compose shared components; no one-off styled cards/buttons.
4. **Side-by-side check.** Before a screen is marked done: device screenshot vs. the reference panel, then the design.md §10 checklist (colors, type hierarchy, spacing, radius, button size, icons, safe areas).
5. **Language stress pass.** Each screen checked in Bengali and Hindi, with large accessibility font size and long strings — no clipping or horizontal overflow.
6. **Unseen screens** (transaction list, edit, language/currency pickers) reuse existing components and the same visual language — no new styles invented.

---

## 10. Testing & Quality Gates

- **Unit tests (jest-expo):** `utils/` (money, digits, format, dates), voice parser (multi-language fixtures), services, analytics, budget math, backup validation.
- **Repository / service tests run real SQL** on Node's built-in `node:sqlite` (`database/testing/createTestDatabase.ts`) with every migration applied. Limits: no WAL, and `withExclusiveTransactionAsync` runs on the same connection — native expo-sqlite behaviour is verified on device. See [`TESTING.md`](./TESTING.md).
- **Every phase exit:** `npx tsc --noEmit`, `npx expo lint`, `npx jest` — all actually executed and reported honestly — plus a manual device run (checklist in `TESTING.md`).
- `tsconfig` additions in Phase 0: `noUncheckedIndexedAccess`, `noImplicitOverride`.

---

## 11. Technical Risks

### 11.1 Multilingual voice recognition (highest risk)

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Language coverage depends on OS/vendor. Android relies on the Google speech service; iOS `SFSpeechRecognizer` supports only a limited set of Indian locales | Some languages simply unavailable on some devices | Query supported locales at runtime; show only those; manual entry always available; cloud engine slot for later |
| On-device (offline) recognition needs downloaded language packs on Android; iOS on-device support varies by locale | "Offline-first" may silently degrade or use network | Prefer on-device when supported; tell user when a pack is missing; disclose network use in privacy text |
| Devices without Google services (Huawei, some AOSP builds) | No recognizer at all | `isAvailable()` check; hide Voice tab content behind a clear "not supported" state |
| Code-mixed speech (Banglish/Hinglish), regional accents | Wrong words / categories | Review screen mandatory; romanized keyword dictionaries; let user correct |
| Number-word variety (দেড়শো, আড়াই, সাড়ে, ঢাই, lakh/crore, mixed "100 টাকা") | Wrong amounts | Exhaustive parser fixtures per language; confidence score highlights uncertain entries |
| `expo-speech-recognition` is third-party with a config plugin | No Expo Go; native build needed | Development builds via EAS from Phase 4; pin version via `npx expo install` |
| Microphone/speech permission denial | Feature blocked | Explain-then-request flow; deep link to settings |

### 11.2 Other risks

- **Indic text rendering:** clipping of top/bottom marks, mixed Latin+Indic strings falling back to inconsistent system fonts, font bundle size → script-aware line heights, per-script font loading, stress-test screens.
- **RTL languages** (Urdu, Kashmiri, Sindhi): need `forceRTL` + reload and mirrored layouts (icons, charts, chevrons) → deferred to Phase 6, design with `start/end` not `left/right` from day one.
- **Script choices:** Santali (Ol Chiki vs. Latin/Devanagari), Manipuri (Meitei Mayek vs. Bengali script), Sindhi/Kashmiri (Perso-Arabic vs. Devanagari) → decide per language in Phase 6 with native speakers.
- **Hermes `Intl` gaps:** some locales or `numberingSystem` may be missing → startup capability check + fallback formatter.
- **Translation quality** for 20 additional languages → status flag per language; native-speaker review before marking `complete`.
- **Currency change after data exists** → per-transaction currency; reports filter by active currency.
- **Dark palette** is not in the reference → approved 2026-11-12; contrast enforced by tests.
- **Expo SDK 58 API drift** vs. model training data → always read the v58 docs (`AGENTS.md`).
- **design.md gaps:** Maithili and Nepali missing from the language list.

---

## 12. Security & Privacy

- **No backend for user data, no account, no analytics.** `src` contains no WebSocket or HTTP client library and no secrets or API keys. Network use: the OS speech recognizer (below), the app-update check (next item) and the Google Mobile Ads SDK (AdMob item); `INTERNET` is declared because React Native requires it.
- **AdMob banner ads** (`src/features/ads`, Phase 11, approved 2026-11-14 — this reverses the earlier "no ads" decision): Android only (`adsEnabled()`; iOS needs ATT + privacy-manifest work first); compile-time off switch `EXPO_PUBLIC_ADS_ENABLED=0`. Startup runs Google UMP `AdsConsent.gatherConsent()` once the app is usable (not locked, onboarded, no mandatory update), then `mobileAds().initialize()` only if `canRequestAds`; any failure → `unavailable`, app unaffected. One anchored adaptive banner (`AdBanner`, via `AppScreen` `footer`) on Dashboard and Reports only — never on entry, voice, receipt, review, onboarding or modal screens; zero height until loaded, gone on no-fill/offline, no retry loop. Settings → "Ad privacy options" appears when UMP requires it. Development builds always request Google test units; release units/App IDs come from env (`EXPO_PUBLIC_ADMOB_BANNER_ANDROID`, `ADMOB_ANDROID_APP_ID` in `app.config.ts`, which fails an EAS `production` build without a real App ID). No user data (amounts, notes, categories, transcripts) is ever passed to the SDK; `requestOptions` are default. The SDK itself collects IP, ad ID/app set ID, interactions and diagnostics — disclosed in `docs/PRIVACY_AND_DATA_SAFETY.md`. Banner only; interstitial/app-open ads need explicit approval.
- **App-update check** (`src/features/app-update`): release builds `fetch` one public JSON file, `https://expensetracker.dlyneed.com/config.json` (anonymous GET, `Accept` header only — no ids, user data or analytics; the host sees the IP address). It is the single source of truth for update rules: `latestVersion`, `minimumSupportedVersion`, `forceUpdate`, store URLs, release notes, optional `message`/`updatedAt`; Zod-validated and backward-compatible (only the two versions are required, bad optional fields are dropped, store URLs must be `https:`/`market:`/`itms-apps:`). Rules: installed < minimum (and `forceUpdate` not `false`) → mandatory screen rendered *instead of* the navigator (no route, tab, back stack or deep link reachable); installed < latest → optional sheet with Later (remembered per `latestVersion`); otherwise nothing. The last good file is cached in `settings` (`updatePolicyCache`, `updateDismissedVersion`; device-only, not in backups) so a mandatory policy survives restart and airplane mode, but a cache older than 30 days stops blocking; with no policy the app is never blocked. Update now opens the store listing (Play fallback built from the package name; iOS needs `storeUrlIOS`); the app never installs anything itself and re-checks on return. Google Play In-App Updates is not used (would need a third-party native module). The gate is off in `__DEV__`. It reads/writes only those two settings keys — never user data.
- **The local database is not encrypted by the app.** SQLite lives in the app's private storage and relies on the OS sandbox, the device lock screen and platform storage encryption. No encryption dependency is added (single-device personal data, no credentials stored).
- **OS backup:** Android `allowBackup` is **false**, so Google Auto Backup does not copy the database. On iOS, an iCloud/computer *device* backup includes app data unless the user disables it — the in-app privacy text says so ("unless your device's own system backup kept a copy").
- **Backup / CSV files** are plaintext and created only on request. Shared copies are written to the app cache and the previous one is deleted on the next export; files saved to a user-picked folder are outside the app's control. Restore validates everything before writing and is all-or-nothing.
- **Voice:** recognition runs through the OS service (Google on Android, Apple on iOS). `requiresOnDeviceRecognition` is set only when the locale's offline pack is installed; otherwise audio may be sent to that provider. The app keeps only the reviewed text (`voice_transcript`) of saved entries; audio is never stored.
- **Permissions:** Android requests `RECORD_AUDIO` and `CAMERA` (receipt photos) (+ `INTERNET`; `AD_ID` merged from the Google Mobile Ads SDK); `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` and `VIBRATE` are removed with `blockedPermissions`. iOS asks for microphone and speech recognition with usage strings that disclose possible Apple processing.
- **Logging:** `console.*` calls log fixed messages plus error objects only — no amounts, notes or transcripts. Rejected backups log the error code only.
- **Crash fallback:** root `_layout.tsx` exports an Expo Router `ErrorBoundary` (themed message + Try again; logs the error name only). No crash-reporting SDK.
- **App lock** (optional, `src/features/security`): uses the OS prompt (`expo-local-authentication`, biometrics with the phone's PIN/pattern/password as fallback). The app stores no PIN or secret, only the `appLockMethod` setting (`off` / `biometric` / `device`), which is device-only and not written to backups. It locks on cold start and after > 60 s in the background, as a cover over the navigator so navigation state survives. If the phone no longer has any screen lock, the lock is skipped so the user can never be locked out of their data. Enabling, changing or turning it off requires a successful prompt.
- **Receipts:** photos are read on-device and stored as app-private files (`Paths.document/receipts/`), never uploaded; an unsaved review draft is kept in `receipts/draft.json`. Receipts and photos are not in backups; deleting an expense, removing its receipt, restore and clear-all delete them; orphaned photos are swept when the scanner opens.
- **Future tokens** (e.g. a Drive provider) must use `expo-secure-store`, never SQLite or settings.

## 13. Release

- Identifiers: `com.rijukarar.expensetracker` (Android `package`, iOS `bundleIdentifier`). Versions are local (`eas.json` `appVersionSource: "local"`): bump `expo.version`, `android.versionCode` and `ios.buildNumber` in `app.json` for every store upload.
- `eas.json` profiles: `development` (debug, internal), `preview` (internal APK), `production` (AAB / App Store build). Signing credentials are managed by EAS and never committed (`*.jks`, `*.p8`, `*.p12`, `*.key` are gitignored).
- `android/` and `ios/` are generated by `npx expo prebuild` and gitignored; never edit them by hand. A local `assembleRelease` is signed with the debug keystore and is for verification only.
- Steps and store metadata: [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md), [`STORE_LISTING.md`](./STORE_LISTING.md), [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md).
