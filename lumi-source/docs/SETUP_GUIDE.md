# Setup guide: every key, where to get it, where to paste it

All keys go in **one file**, `config/.env`, which git ignores, so it is never committed.

```bash
cp config/.env.example config/.env
```

Open `config/.env` and replace each `[PASTE HERE]`. Anything you leave as `[PASTE HERE]` simply switches that feature off; the app still runs.

## 1. Firebase (6 values)

Firebase Console → your project (`digital-well-being-2846d`) → ⚙ Project settings → General → Your apps.
You already have `google-services.json` for the Android app. The values map like this:

| config/.env key | Where it is in google-services.json | Your value |
|---|---|---|
| `FIREBASE_API_KEY` | `client[0].api_key[0].current_key` | starts with `AIza…` (copy from your file) |
| `FIREBASE_AUTH_DOMAIN` | not in the file; it is `<project_id>.firebaseapp.com` | `digital-well-being-2846d.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `project_info.project_id` | `digital-well-being-2846d` |
| `FIREBASE_STORAGE_BUCKET` | `project_info.storage_bucket` | `digital-well-being-2846d.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | `project_info.project_number` | `329900947161` |
| `FIREBASE_APP_ID` | `client[0].client_info.mobilesdk_app_id` | `1:329900947161:android:a91ba90358da355a20f0c8` |

Lumi uses the Firebase **JavaScript** SDK, so `google-services.json` and the Gradle plugin snippet from the Firebase console are **not needed**. Do not commit `google-services.json` (it is git-ignored). Optional: for the web demo, register a **Web app** in the same project and use its App ID instead.

Then, in the Firebase console:
1. **Authentication → Sign-in method → Anonymous → Enable.**
2. **Firestore Database → Create database** (production mode, a region near your users).
3. Deploy the security rules and index: `npx firebase-tools login` then `npm run deploy:rules`.
4. Spark (free) plan is enough. Cloud Functions are not used.

## 2. Help and safety

| Key | What to paste |
|---|---|
| `HELPLINE_OR_TRUSTED_CONTACT` | A real youth helpline or your organisation's support line: phone (`+441234567890`), `sms:12345`, `https://…` or an email |
| `HELPLINE_NAME` | Button label, e.g. `Youth Helpline` |
| `HELPLINE_TEXT_NUMBER` | Optional SMS number |
| `HELPLINE_WEBSITE` | Optional chat/website |
| `EMERGENCY_NUMBER` | Local emergency number (112, 911, 999, 000, 1122…) |
| `HELPLINE_DIRECTORY_URL` | Already set to https://findahelpline.com (free global directory) |

Never put a fake or test number here in a build you give to real people.

## 3. Optional
`ORGANISATION_NAME`, `PRIVACY_CONTACT_EMAIL` (shown on the privacy screen), `PEER_SPACE_ENABLED`, `DEMO_MODE_ONLY=true` (presentation build that never connects to Firebase).

After editing: `npx expo start -c` (the `-c` clears the cache so new values are picked up).

## 4. Making yourself a moderator / helper
1. In the app: Settings → Privacy → copy "Your anonymous ID" (appears after you agree to community features).
2. Firebase console → Firestore → collection `staff` → document ID = that ID → field `roles` (map) with `moderator: true`, `helper: true`, `organiser: true` as needed.
3. Reopen the app: Connect → Team tools appears.

## 5. Keys in CI (GitHub Actions) and EAS
- GitHub: Settings → Secrets and variables → Actions → add the same names as above. The workflow writes `config/.env` during the build.
- EAS: `.easignore` uploads your local `config/.env` with the build, so no extra step.
