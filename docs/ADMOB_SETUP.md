# AdMob Setup — Expense Tracker

How AdMob is wired, how to configure real IDs, and how to test safely. Code: `src/features/ads/`,
`app.config.ts`. Decisions: [ARCHITECTURE.md §12](./ARCHITECTURE.md). Disclosures:
[PRIVACY_AND_DATA_SAFETY.md](./PRIVACY_AND_DATA_SAFETY.md).

## What is implemented

| Item | Implementation |
| --- | --- |
| Library | `react-native-google-mobile-ads` 17.4.0 (installed with `npx expo install`); Android uses the classic `play-services-ads` 25.5.0 backend + UMP |
| Native config | `app.config.ts` adds the library's config plugin with `androidAppId`, `iosAppId`, `delayAppMeasurementInit: true` |
| Platforms | **Android only.** iOS links the SDK (sample App ID) but never initialises it — `adsEnabled()` in `src/features/ads/adConfig.ts` |
| Consent | Google UMP via `AdsConsent.gatherConsent()` once the app is usable (after onboarding, unlock and the update gate) — `services/adsService.ts` |
| Initialisation | `mobileAds().initialize()` only when UMP says `canRequestAds`; never awaited by the UI; any failure → no ads this session |
| Format | One anchored adaptive banner (`BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER`) — `components/AdBanner.tsx` |
| Placement | Bottom of **Dashboard** and **Reports** (via `AppScreen` `footer`), above the tab bar. Nowhere else |
| Loading / errors | Takes no space until loaded; on no-fill or network error it disappears for that screen visit; no retry loop |
| Privacy options | Settings → About → "Ad privacy options", shown only when UMP reports it is required |
| Off switch | `EXPO_PUBLIC_ADS_ENABLED=0` at build time → no SDK init, no consent form, no banner |
| Not implemented | Interstitial, app-open, rewarded, native ads, mediation (need explicit approval) |

## Test vs. production IDs

| Build | App ID (manifest) | Banner unit |
| --- | --- | --- |
| Development (`__DEV__`) | `ADMOB_ANDROID_APP_ID` or Google sample `ca-app-pub-3940256099942544~3347511713` | **Always** `TestIds.ADAPTIVE_BANNER` |
| Preview / local release without env | Google sample App ID | `TestIds.ADAPTIVE_BANNER` |
| EAS `production` | `ADMOB_ANDROID_APP_ID` (**required** — `app.config.ts` throws without it) | `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` (falls back to the test unit if missing — check before release) |

App IDs and ad unit IDs are not secret (they ship inside the APK), but they are kept out of git so
test and live configurations can't be mixed up. There are no AdMob API keys or credentials in
this project.

## One-time setup (owner)

1. **AdMob account** at https://admob.google.com (same Google account as Play Console is easiest). Complete payments/tax profile.
2. **Add app** → Android → "Is the app listed on a supported app store?" → *No* until it is published, then link it to the Play listing.
3. **Create ad unit** → Banner → name e.g. `banner_dashboard_reports`. Copy:
   - App ID `ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN`
   - Banner unit ID `ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN`
4. **Privacy & messaging** (AdMob → Privacy & messaging):
   - Create a **European regulations (GDPR)** message for the app (required for EEA/UK/CH traffic). Select Google as the ad partner (add others only if you add mediation).
   - Create a **US state regulations** message if you want to serve users in those states.
   - Add the privacy policy URL to the message.
   - Publish the messages. Without a published GDPR message, EEA users get no personalised ads.
5. **app-ads.txt**: AdMob → Apps → app-ads.txt shows the line to publish. Host it at the root of the developer website listed in Play Console, e.g. `https://expensetracker.dlyneed.com/app-ads.txt` (Play Console "Website" must be that domain).
6. **EAS environment variables** (production environment), after `npx eas-cli init`:
   ```bash
   npx eas-cli env:create --environment production --name ADMOB_ANDROID_APP_ID --value "ca-app-pub-...~..." --visibility plaintext
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_ADMOB_BANNER_ANDROID --value "ca-app-pub-.../..." --visibility plaintext
   ```
   `eas.json` → `build.production.environment = "production"` already selects these.
   For a local release build instead, put the same variables in `.env.local` (git-ignored; see `.env.example`), then `npx expo prebuild --clean -p android` so the manifest picks up the App ID.

## Testing safely

- **Never tap live ads on your own device.** Use development/preview builds (test units), or register your phone as a test device in AdMob → Settings → Test devices before installing a live-ID build.
- Test ads show a "Test Ad" label. If a release build shows real ads during testing, stop and add the device as a test device.
- **Consent testing:** temporarily call `AdsConsent.gatherConsent({ debugGeography: AdsConsentDebugGeography.EEA, testDeviceIdentifiers: ['<hash from logcat>'] })` in `adsService.ts` (do not commit), clear app data, launch. Use `AdsConsent.reset()` (or clear app data) between runs.
- Manual cases: [TESTING.md → Ads](./TESTING.md).

## Switching to live ads (release day)

- [ ] Real App ID + banner unit set in EAS production env
- [ ] GDPR (and US states) message published in AdMob
- [ ] app-ads.txt live on the developer website
- [ ] Privacy policy (with the Advertising section) hosted and linked in Play Console and the AdMob message
- [ ] Play Console: Ads declaration = **Yes**; Advertising ID declaration = **Yes, for advertising/analytics**; Data safety per [PRIVACY_AND_DATA_SAFETY.md](./PRIVACY_AND_DATA_SAFETY.md)
- [ ] Production AAB built with `--profile production` (fails if the App ID is missing)
- [ ] Verify on an internal-testing install (as a registered test device) that the banner loads

## Enabling ads on iOS later (not done)

Needs: real `ADMOB_IOS_APP_ID`, `adsEnabled()` change, App Tracking Transparency decision
(`userTrackingUsageDescription` + `expo-tracking-transparency`, or non-personalised only),
SKAdNetwork IDs, updated `ios.privacyManifests` and App Store privacy answers. Requires approval.
