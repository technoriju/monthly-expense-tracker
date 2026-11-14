# Release Checklist — Monthly Expense Tracker

Nothing here is submitted automatically. Each store upload is a manual, deliberate step.
Google Play specifics (readiness report, listing, testing tracks): [PLAY_STORE_RELEASE.md](./PLAY_STORE_RELEASE.md).
Ads: [ADMOB_SETUP.md](./ADMOB_SETUP.md). Play declarations: [PRIVACY_AND_DATA_SAFETY.md](./PRIVACY_AND_DATA_SAFETY.md).

## Release configuration (in the repo)

| Item | Value / location |
| --- | --- |
| App name | `Expense Tracker` (`app.json` → `expo.name`) |
| Android application ID | `com.rijukarar.expensetracker` (`android.package`) — permanent once published |
| iOS bundle identifier | `com.rijukarar.expensetracker` (`ios.bundleIdentifier`) — permanent once published |
| Version | `expo.version` (user-visible, e.g. `1.0.0`) |
| Android version code | `android.versionCode` (integer, +1 for every Play upload) |
| iOS build number | `ios.buildNumber` (string, +1 for every App Store Connect upload) |
| Version source | local (`eas.json` → `cli.appVersionSource: "local"`) |
| Icon | `assets/images/icon.png` (1024², both platforms); Android adaptive icon layers in `assets/images/android-icon-*.png` |
| Splash | `expo-splash-screen` plugin, `#5B2ED6` background, `assets/images/logo.png` (160 px wide) |
| Android permissions | `INTERNET`, `RECORD_AUDIO`, `CAMERA`, `USE_BIOMETRIC`/`USE_FINGERPRINT`, `AD_ID` (Google Mobile Ads SDK); `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, `VIBRATE` blocked |
| SDK levels | targetSdk 36, compileSdk 37, minSdk 24 (Expo SDK 58 defaults; not pinned) |
| AdMob | `app.config.ts` adds the `react-native-google-mobile-ads` plugin; App ID from `ADMOB_ANDROID_APP_ID` (EAS env / `.env.local`), Google sample ID otherwise; EAS `production` fails without it. Banner unit from `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` |
| Env files | `.env.example` (committed) lists every variable; `.env.local` is git-ignored |
| Android backup | `allowBackup: false` |
| iOS usage strings | microphone + speech recognition (set by the `expo-speech-recognition` plugin in `app.json`) |
| iOS export compliance | `ITSAppUsesNonExemptEncryption: false` (the app adds no encryption) |
| iOS privacy manifest | `ios.privacyManifests`: no tracking, no collected data, required-reason APIs (UserDefaults CA92.1, file timestamp C617.1, system boot time 35F9.1); libraries add their own manifests |
| Build profiles | `eas.json`: `development`, `preview` (internal APK), `production` (AAB / App Store, `environment: production` for EAS env vars) |

## One-time setup (owner)

- [ ] Expo account: `npx eas-cli login`, then `npx eas-cli init` (adds `owner` and `extra.eas.projectId` to `app.json`; commit that change)
- [ ] Google Play Console developer account; create the app with package `com.rijukarar.expensetracker`
- [ ] Apple Developer Program membership; App Store Connect app record with bundle ID `com.rijukarar.expensetracker`
- [ ] Signing: let EAS generate and store the Android upload keystore and iOS certificates/profiles (`eas credentials`). Never commit keystores or `.p8/.p12` files (gitignored). Enroll in Play App Signing.
- [ ] Host the privacy policy ([PRIVACY_POLICY.md](./PRIVACY_POLICY.md)) at a public URL after review; fill in the contact details
- [ ] Provide a 1024×1024 iOS icon without transparency (Android adaptive layers are already 1024²)
- [ ] AdMob account, app, banner unit, GDPR message, app-ads.txt, EAS env vars — [ADMOB_SETUP.md](./ADMOB_SETUP.md)
- [ ] Play listing graphics: `store-assets/` (icon 512, feature graphic) + screenshots — [PLAY_STORE_RELEASE.md](./PLAY_STORE_RELEASE.md)

## Every release

1. **Code quality**
   - [ ] `npx tsc --noEmit`, `npx expo lint`, `npx jest`, `npx expo install --check` all pass
   - [ ] `npx expo-doctor` reviewed
   - [ ] `npm run licenses` re-run if dependencies changed
2. **Versioning**
   - [ ] Bump `expo.version` (semver) when user-visible changes ship
   - [ ] Increment `android.versionCode` and `ios.buildNumber`
   - [ ] New DB changes are **new** migrations (never edit a shipped one); migration test added
   - [ ] Remote update file `https://expensetracker.dlyneed.com/config.json`: real `storeUrlAndroid` / `storeUrlIOS` (placeholders are ignored; iOS has no fallback), `minimumSupportedVersion` **≤ the version being released** (otherwise the new build blocks itself), `latestVersion` raised only after the build is live in the stores
3. **Build**
   - [ ] AdMob live IDs present in the EAS production environment (the build fails without the App ID; check the banner unit too)
   - [ ] `npx eas-cli build --platform android --profile production` → `.aab`
   - [ ] `npx eas-cli build --platform ios --profile production` → `.ipa`
   - [ ] Optional internal test: `--profile preview` APK installed on a real device
4. **Device verification** — run the manual checklist in [TESTING.md](./TESTING.md) on the store build (Android device; iPhone via TestFlight)
   - [ ] Upgrade test: install the previous store build, add data, update to the new build → data intact (migrations ran)
5. **Store submission** (manual)
   - [ ] Play Console: internal → closed → production per [PLAY_STORE_RELEASE.md](./PLAY_STORE_RELEASE.md); Data safety, Ads and Advertising ID declarations per [PRIVACY_AND_DATA_SAFETY.md](./PRIVACY_AND_DATA_SAFETY.md)
   - [ ] App Store Connect: TestFlight first; App Privacy answers and review notes per [STORE_LISTING.md](./STORE_LISTING.md)
   - [ ] Screenshots updated if UI changed
6. **After release**
   - [ ] Tag the commit (`git tag v<version>`)

## Local verification build (no EAS)

For checking the native configuration only — **not for store upload** (signed with the debug keystore):

```bash
npm run clean:android
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease     # Windows PowerShell: .\gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

iOS cannot be built on Windows; use EAS or a Mac with Xcode. On this Windows machine the local
Gradle build fails on the 260-character path limit from `D:\reactNative\monthly-expense-tracker`;
use EAS, enable long paths, or build from a short path.

## Not production-ready yet (known)

- The remaining 20 Indian languages (Phase 6) are not implemented; only English, Bengali and Hindi are translated and selectable.
- Ads are Android-only; the iOS build links the AdMob SDK but never initialises it (review App Store privacy answers before any iOS release).
- Bengali and Hindi strings added in the hardening pass need native-speaker review.
- No crash reporting is integrated (deliberate). A root `ErrorBoundary` shows a recoverable error screen instead of a blank one. Adding crash reporting would change the privacy answers.
