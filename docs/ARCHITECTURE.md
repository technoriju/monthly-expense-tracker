# Architecture — Monthly Expense Tracker

> Status: approved planning document. No application code exists yet beyond the `create-expo-app` starter.
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
| 2 | `expo-speech-recognition` | On-device speech-to-text (config plugin → **development build required; does not run in Expo Go**) |
| 3 | `expo-file-system`, `expo-sharing` | CSV export of report transactions (pulled forward from Phase 6) |
| 6 | `expo-document-picker` | Backup / restore (reuses `expo-file-system`, `expo-sharing`) |

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
    reports/
      categories.tsx            # Category breakdown
      calendar.tsx              # Monthly calendar
    voice/
      review.tsx                # Review parsed entries
    settings/
      language.tsx
      currency.tsx
      voice.tsx
      theme.tsx

  components/
    ui/                         # Design-system primitives (Button, Card, AppText…)
    charts/                     # LineChart, DonutChart, Legend
    layout/                     # Screen, ScreenHeader, TabBar

  features/
    transactions/  { components/, hooks/, services/, schemas.ts, types.ts }
    categories/    { components/, hooks/, services/, types.ts }
    reports/       { components/, hooks/, services/, types.ts }
    voice/         { components/, hooks/, engine/, parser/, types.ts }
    settings/      { components/, hooks/, services/, types.ts }
    onboarding/    { components/ }

  database/
    client.ts                   # open DB, pragmas, run migrations
    migrations/                 # 001_init.ts, 002_….ts, index.ts
    repositories/               # transactionRepository.ts, categoryRepository.ts, reportRepository.ts, settingsRepository.ts
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

### 4.3 Data rules

- **Money:** integer minor units only. Never store or sum floats. Conversion to/from display strings happens in `utils/money.ts`.
- **Dates:** transactions store a local calendar date string (`YYYY-MM-DD`), so a month filter is `occurred_on BETWEEN '2025-05-01' AND '2025-05-31'` with no timezone drift. Audit timestamps are epoch ms.
- **Currency:** stored per transaction. Reports aggregate only the active currency; changing currency never rewrites history.
- **Categories:** system category names come from i18n (`categories:<key>`); `custom_name` is used only for user-created categories. Deletion = archive (keeps history intact).

### 4.4 Repositories

- `transactionRepository` — `insert`, `insertMany` (single transaction, used by voice "Save all"), `update`, `remove`, `getById`, `listByMonth`, `listRecent`, `listByDate`.
- `categoryRepository` — `listByType`, `getByKey`, `seedSystemCategories`.
- `reportRepository` — aggregation queries for an inclusive date range + currency: totals and counts by type, by category (one type), by day, by month.
- `settingsRepository` — `get`, `set`, `getAll`.

Repositories use parameterized queries only, map rows (`snake_case`) to typed domain objects (`camelCase`) internally, and contain no business rules.

### 4.5 Services & state

- Services (e.g. `transactionService.create(input)`) validate input with Zod, apply rules (minor-unit conversion, default currency), call repositories, and return domain objects.
- **Zustand** holds:
  - `settingsStore` — in-memory cache of settings, hydrated once from SQLite at startup; writes go through `settingsService` (DB first, then store).
  - `uiStore` — `selectedMonth`, and a `dataVersion` counter bumped after every write so data hooks refetch.
- DB rows are **not** mirrored into Zustand. Feature hooks (`useMonthlySummary`, `useRecentTransactions`) query services and depend on `dataVersion` + `selectedMonth`.

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

- Namespaces: `common`, `dashboard`, `transactions`, `categories`, `reports`, `voice`, `settings`, `onboarding`.
- Resources: static JSON in `src/i18n/locales/<code>/<ns>.json`, bundled (small; no network).
- `fallbackLng: 'en'`; missing keys in partial languages fall back to English.
- **Typed keys**: `i18next` module augmentation using the English resources as the schema → a misspelled key is a compile error.
- Pluralization via i18next `_one/_other` suffixes (uses `Intl.PluralRules`).

### 5.3 Language selection

- **Startup:** saved `uiLanguage` → else best match from `expo-localization` `getLocales()` against registry → else `en`.
- **Switching:** `i18n.changeLanguage()` + settings write; re-renders without restart.
- **RTL exception** (ur, ks, sd): requires `I18nManager.forceRTL()` and an app reload — the UI warns before reloading. RTL support lands in Phase 5.
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
  | `textSecondary` | `#77758A` | `#A8A5BC` |
  | `textMuted` | `#A09CB3` | `#6F6B86` |
  | `border` | `#E9E5F3` | `#2E2A45` |
  | `income` / `incomeSoft` | `#16A34A` / `#E9F9EF` | `#22C55E` / `#12301F` |
  | `expense` / `expenseSoft` | `#EF4444` / `#FFF0F1` | `#F87171` / `#3A1A1E` |
  | `accent` / `accentSoft` | `#FF9F1C` / `#FFF0D9` | `#FFB04D` / `#3A2A12` |
  | chart series | design.md chart colors | same hues, +10% lightness |

  > ⚠ **Dark palette is proposed, not from the reference. Requires approval before Phase 0 implementation.** Dark contrast must be checked (WCAG AA 4.5:1 for body text).

- `typography.ts` — scale from design.md §3 (`display 32/Bold` … `caption 11/Regular`, `amountLarge 28/Bold`, `amountMedium 20/Bold`) with explicit line heights: ≈1.3× for Latin, ≈1.5× for Indic scripts (prevents clipping of matras, conjuncts, and descenders).
- `spacing.ts`, `radius.ts` — verbatim from design.md §4–5.
- `shadows.ts` — `card` (soft, low elevation) and `raised` (center Add button, balance card); platform-specific (`shadow*` on iOS, `elevation` on Android).

### 6.2 Theme provider

- `themeMode` setting: `system | light | dark` (default `system`; `app.json` keeps `userInterfaceStyle: "automatic"`).
- `ThemeProvider` resolves the active scheme and exposes `useTheme()` → `{ colors, typography, spacing, radius, shadows, scheme }`.
- Components build styles with a small `makeStyles(theme => StyleSheet.create(...))` helper, memoized per theme.

### 6.3 Fonts

- Loaded with `expo-font` at startup (splash held until ready). Phase 0 loads Inter + Noto Sans Bengali + Noto Sans Devanagari (Regular, Medium, SemiBold, Bold). Other script fonts are added in Phase 5 as languages ship.
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
- `CloudSpeechEngine` — reserved slot (e.g. Google Cloud STT / Bhashini via a backend proxy). Evaluated in Phase 7 only if native coverage proves insufficient. Never required for core features.
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

- **Unit tests (jest-expo):** `utils/` (money, digits, format, dates), voice parser (multi-language fixtures), services (repositories mocked).
- **Repository tests:** kept thin; verified on device during each phase (expo-sqlite native module is not available in Jest without mocking).
- **Every phase exit:** `npx tsc --noEmit`, `npx expo lint`, `npx jest` — all actually executed and reported honestly — plus a manual device run.
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
- **RTL languages** (Urdu, Kashmiri, Sindhi): need `forceRTL` + reload and mirrored layouts (icons, charts, chevrons) → deferred to Phase 5, design with `start/end` not `left/right` from day one.
- **Script choices:** Santali (Ol Chiki vs. Latin/Devanagari), Manipuri (Meitei Mayek vs. Bengali script), Sindhi/Kashmiri (Perso-Arabic vs. Devanagari) → decide per language in Phase 5 with native speakers.
- **Hermes `Intl` gaps:** some locales or `numberingSystem` may be missing → startup capability check + fallback formatter.
- **Translation quality** for 20 additional languages → status flag per language; native-speaker review before marking `complete`.
- **Currency change after data exists** → per-transaction currency; reports filter by active currency.
- **Dark palette** is not in the reference → requires approval.
- **Expo SDK 58 API drift** vs. model training data → always read the v58 docs (`AGENTS.md`).
- **design.md gaps:** Maithili and Nepali missing from the language list.
