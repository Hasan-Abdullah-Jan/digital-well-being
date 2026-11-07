# Lumi: feel good on and off your screen

A mobile app for young people's digital wellbeing and mental health. It targets the *root causes* of harmful phone use (scrolling traps, comparison, gaming design, harassment, sleep loss, stress, loneliness), not just screen time.

**Stack:** Expo SDK 58 (React Native 0.88, TypeScript) · Expo Router · Zustand (on-device storage) · Firebase JS SDK (anonymous Auth + Firestore) · a local Android native module in Kotlin (`modules/lumi-guard`) for real screen time, pause screens, the quote widget and grayscale.

Docs: [Setup guide (keys)](docs/SETUP_GUIDE.md) · [User guide](docs/USER_GUIDE.md) · [Report deliverables](docs/REPORT_DELIVERABLES.md) · [Privacy and safety](docs/PRIVACY_AND_SAFETY.md) · [Adding a language](src/i18n/README.md)

## Folder structure
```
app.config.ts          reads config/.env and passes values to the app
config/.env.example    every key, with [PASTE HERE] placeholders
src/app/               screens (file-based routes): (tabs), onboarding, habits, mind, connect, me, settings, help
src/components/        UI building blocks (Screen, Button, Card, charts, sheets, support sheet…)
src/store/             on-device data (Zustand + AsyncStorage), demo namespace
src/features/          logic: insights, badges, streaks, usage, help, sync
src/services/          Firebase, community (cloud + demo), notifications, privacy (export/delete), guard sync
src/safety/            on-device distress and community-text checks
src/i18n/              t(), English UI strings and content (quotes, guides, challenges…)
src/demo/              seed data and demo mode
modules/lumi-guard/    Android native module (Kotlin)
firebase/              Firestore rules, indexes, rules tests
scripts/               i18n check, web smoke test, cloud e2e test, CI env writer
```

## Run it (beginner steps)
1. Install [Node.js 22](https://nodejs.org) and Git. Then:
   ```bash
   git clone https://github.com/Hasan-Abdullah-Jan/digital-well-being && cd digital-well-being
   npm install
   cp config/.env.example config/.env   # then fill it in: docs/SETUP_GUIDE.md
   ```
2. **Quickest (any phone):** `npx expo start -c`, install **Expo Go** on your phone and scan the QR code. Native screen time is not available in Expo Go; everything else works.
3. **Web:** `npm run web`.
4. **Full Android app** (needs Android Studio): `npm run android`.
5. **Demo only:** `npm run demo`, or tap *Try the demo* on the welcome screen.

## Get an installable APK / shareable link
- **GitHub Actions (no setup):** every push builds an APK. Actions tab → CI → latest run → artifact `lumi-android-apk`. For a public download link: Actions → CI → *Run workflow* → tick *publish_release* (or push a tag `v1.0.0`); the APK is attached to a GitHub Release. Add your keys as repository secrets (names in the workflow file).
- **EAS (Expo cloud):** `npm i -g eas-cli && eas login && eas build -p android --profile preview` → you get an install link/QR. `--profile demo` builds a demo-only APK.
- **Local:** `npm run build:apk` → `android/app/build/outputs/apk/release/app-release.apk`.
- **Web link (Firebase Hosting):** `npx firebase-tools login && npm run deploy:web`.

The APK is signed with a development key: fine for testing and sharing, not for the Play Store (use `eas build --profile production`).

## Checks
```bash
npm run check        # typecheck + 45 unit tests + every UI string present
npm run test:rules   # 20 Firestore security-rules tests (needs Java)
npm run test:web     # web build + click-through smoke test (needs Playwright)
```
Cloud flow end-to-end against emulators: see `scripts/e2e-cloud-web.mjs`.

## Honest limitations
- Real screen time, pause screens and the widget are **Android-only** (full APK, not Expo Go). iOS and web use self-reported check-ins, focus timers and reminders; Apple's Screen Time API needs a special entitlement.
- System-wide grayscale needs a one-time `adb` command; otherwise the app shows how to switch it on.
- Distress detection is keyword-based: it can miss things or over-trigger, so it only ever offers help kindly.
- Moderation is human; posts wait for a moderator. Someone must run the team tools.
- Lumi is not a therapist or an emergency service.
