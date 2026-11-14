# Store Listing — Expense Tracker (DRAFT)

Drafts for Google Play and the App Store. Every claim below matches the app's code as of 1.0.0
(Android build with AdMob banner ads). Play release copy and checklists: [PLAY_STORE_RELEASE.md](./PLAY_STORE_RELEASE.md).
Review before use; do not add claims that are not true of the shipped build.

## Shared copy

**App name:** Expense Tracker

**Short description (Play, ≤ 80 chars):**
Track income & expenses by hand or by voice. Budgets, reports, no account.

**Subtitle (App Store, ≤ 30 chars):** Income, expenses & budgets

**Full description:**

Expense Tracker is a simple, private way to keep track of where your money goes.

- Add income and expenses in seconds, with categories, notes and payment method
- Speak your entries in English, Bengali or Hindi — always reviewed before saving
- See monthly totals, balance and a spending trend on the dashboard
- Reports: category breakdown, monthly calendar, comparisons with the previous period
- Set a monthly budget and category budgets, with warnings at 80%, 90% and 100%
- App in English, বাংলা and हिन्दी; light and dark theme
- Back up to a file and restore it on any device; export transactions as CSV
- No account and no sign-in. Your financial data stays on your device — the app has no server and never uploads your entries

The app is free and shows a small banner ad on the Dashboard and Reports screens (Google AdMob). Ads never appear while you add entries, record by voice or scan receipts.

Voice entry uses your device's speech recognition service; depending on your device and
language it may need an internet connection. Everything else works offline.

**Feature list (for screenshots / promo text):** manual entry · voice entry (en/bn/hi) ·
dashboard · reports · calendar · budgets · backup & restore · CSV export · dark theme · offline

**Keywords (App Store, ≤ 100 chars):**
expense,budget,money,spending,income,finance,tracker,voice,bengali,hindi,offline,hisab

**Category:** Finance

## Screenshots checklist

Capture from a release build with realistic sample data (no real personal data). For each store size
(Play phone; App Store 6.9" and 6.5"/5.5" as required at submission time):

- [ ] Dashboard (income, expense, balance, trend, recent transactions)
- [ ] Add Transaction
- [ ] Voice entry (listening) and Review
- [ ] Reports (donut + legend)
- [ ] Monthly Calendar
- [ ] Budgets with a warning
- [ ] Settings (language) — one screenshot in Bengali or Hindi
- [ ] Dark theme variant of the Dashboard
- [ ] Play feature graphic 1024×500

## Google Play — Data safety (proposed answers, verify against current Play guidance)

| Question | Proposed answer | Basis in code |
| --- | --- | --- |
| Does the app collect or share user data? | **Yes — via the Google Mobile Ads SDK only.** Full answers: [PRIVACY_AND_DATA_SAFETY.md](./PRIVACY_AND_DATA_SAFETY.md) | AdMob collects/shares IP (approx. location), device IDs, app interactions, diagnostics. Financial data stays in local SQLite; developer receives nothing |
| Is data encrypted in transit? | Yes (Google: TLS for all SDK data) | Google Mobile Ads SDK data disclosure |
| Can users request deletion? | Data is on-device; users delete it with *Clear all data* or by uninstalling | Settings → Clear all data |
| Voice / audio | Not collected by the app. Speech is handled by the device's speech service (Google), not stored by the app | `expo-speech-recognition` → Android `SpeechRecognizer`; only reviewed text is saved |

> Owner decision needed: Play may consider audio passed to the system speech service. Review
> Play's Data safety help for "data processed by Android system services" before submitting.

**Permissions explanation (Play Console / listing):**
- Microphone — used only for optional voice entry while you record.
- Internet — required by the framework, used by the system speech service, the update check and the Google Mobile Ads SDK; the app sends none of your financial data.
- Camera — used only when you choose to photograph a receipt.
- Advertising ID — added by the Google Mobile Ads SDK for ads.

**Privacy policy URL:** required — host [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) after review.
**Target audience:** 18+ (finance); not designed for children. **Ads:** **Yes** (Google AdMob banners, Android).

## Apple App Store — App Privacy (proposed answers)

| Item | Proposed answer |
| --- | --- |
| Data collection | **Data Not Collected** only while iOS ships without ads (the AdMob SDK is linked but never initialised on iOS). **Before any iOS release:** re-check with the owner — App Review may ask about the linked SDK; enabling iOS ads needs ATT + updated App Privacy answers |
| Tracking | No (`NSPrivacyTracking: false`) |
| Microphone usage string | "Allow Expense Tracker to use the microphone while you record an expense by voice. Audio is used only during recording." |
| Speech recognition usage string | "Allow Expense Tracker to turn your speech into text so you can add expenses by voice. Depending on your device and language, speech may be processed by Apple's speech recognition service." |
| Export compliance | Uses no non-exempt encryption (`ITSAppUsesNonExemptEncryption: false`) |

> Owner decision needed: confirm with Apple's guidance that speech handled by Apple's
> `SFSpeechRecognizer` does not need to be declared as collected data.

### App Review notes (draft)

> Expense Tracker needs no login. All data is stored locally on the device.
> To test voice entry: open the **Voice** tab, tap the microphone, allow microphone and speech
> recognition, and say "Food 250 rupees today" (English). The recognized text opens a Review
> screen; tap **Confirm & Save**. Voice language can be changed on the Voice screen
> (English / বাংলা / हिन्दी). Backup and restore are under **More → Back up data / Restore data**
> and use the system share sheet and file picker.

## Release checklist pointer

See [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) for build, versioning and submission steps.
