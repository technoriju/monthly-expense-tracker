# Release Checklist — Monthly Expense Tracker

Nothing here is submitted automatically. Each store upload is a manual, deliberate step.

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
| Splash | `expo-splash-screen` plugin, `#5B2ED6` background, `assets/images/splash-icon.png` |
| Android permissions | `RECORD_AUDIO`, `INTERNET` only; `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, `VIBRATE` blocked |
| Android backup | `allowBackup: false` |
| iOS usage strings | microphone + speech recognition (set by the `expo-speech-recognition` plugin in `app.json`) |
| iOS export compliance | `ITSAppUsesNonExemptEncryption: false` (the app adds no encryption) |
| iOS privacy manifest | `ios.privacyManifests`: no tracking, no collected data, required-reason APIs (UserDefaults CA92.1, file timestamp C617.1, system boot time 35F9.1); libraries add their own manifests |
| Build profiles | `eas.json`: `development`, `preview` (internal APK), `production` (AAB / App Store) |

## One-time setup (owner)

- [ ] Expo account: `npx eas-cli login`, then `npx eas-cli init` (adds `owner` and `extra.eas.projectId` to `app.json`; commit that change)
- [ ] Google Play Console developer account; create the app with package `com.rijukarar.expensetracker`
- [ ] Apple Developer Program membership; App Store Connect app record with bundle ID `com.rijukarar.expensetracker`
- [ ] Signing: let EAS generate and store the Android upload keystore and iOS certificates/profiles (`eas credentials`). Never commit keystores or `.p8/.p12` files (gitignored). Enroll in Play App Signing.
- [ ] Host the privacy policy ([PRIVACY_POLICY.md](./PRIVACY_POLICY.md)) at a public URL after review; fill in the contact details
- [ ] Provide a 1024×1024 iOS icon without transparency, and check that the Android adaptive layers (currently 512²) look sharp — Expo recommends 1024²

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
   - [ ] `npx eas-cli build --platform android --profile production` → `.aab`
   - [ ] `npx eas-cli build --platform ios --profile production` → `.ipa`
   - [ ] Optional internal test: `--profile preview` APK installed on a real device
4. **Device verification** — run the manual checklist in [TESTING.md](./TESTING.md) on the store build (Android device; iPhone via TestFlight)
   - [ ] Upgrade test: install the previous store build, add data, update to the new build → data intact (migrations ran)
5. **Store submission** (manual)
   - [ ] Play Console: internal testing track first, then production; Data safety form per [STORE_LISTING.md](./STORE_LISTING.md)
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

iOS cannot be built on Windows; use EAS or a Mac with Xcode.

## Not production-ready yet (known)

- Onboarding / splash intro (ROADMAP Phase 7) and the remaining 20 Indian languages (Phase 6) are not implemented; only English, Bengali and Hindi are translated and selectable.
- Bengali and Hindi strings added in the hardening pass need native-speaker review.
- No crash reporting is integrated (deliberate: no network use). Consider an opt-in solution later, which would change the privacy answers.
