# UniTrack

University sessional management app for MUET — subjects, assignments, tests,
presentations, announcements, enrollments, and role-based dashboards
(student / CR / teacher / admin).

Built with **Expo SDK 54** (expo-router, React Native 0.81, React 19) on the
front end, **Firebase** (Auth + Firestore + Storage) as the backend, and a
small **Express** server for static hosting / landing page.

---

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 20+ (tested on 24) | `node -v` |
| Java | 11+ (tested on 23) | Only for the Firestore emulator (rules tests) |
| Expo Go app | latest | For running on a physical device |

## 2. Setup

```powershell
# from the project root
npm install            # NOT `npm ci` — see "Known limitations" below
Copy-Item .env.example .env
```

Then edit `.env` and fill in the six `EXPO_PUBLIC_FIREBASE_*` values from:

> Firebase Console → Project settings → General → "Your apps" → Web app (</>)
> → "SDK setup and configuration" → Config

The confirmed project for this app is **`unitrack-15d9`**. Values are inlined
at build time — restart the dev server after changing `.env`.

## 3. Run

```powershell
npm start              # Expo dev server (scan QR with Expo Go)
npx expo start --web   # web preview
npm run server:dev     # optional Express static server on :5000
```

## 4. Firebase Console — one-time manual steps

These cannot be done from code; do them once per project:

1. **Authentication** → Sign-in method → enable **Email/Password**.
   (Registration requires email verification before first login.)
2. **Firestore Database** → Create database (production mode). The rules in
   this repo override the defaults — deploy them:
   ```powershell
   npx firebase login
   npx firebase deploy --only firestore:rules,firestore:indexes
   ```
3. **Storage** → Get started, then deploy the storage rules:
   ```powershell
   npx firebase deploy --only storage
   ```
4. **First admin account**: register normally in the app, then in the console
   open `users/{your-uid}` and set the field `role` to `"admin"`.
   Every other role is set by the registration flow (teachers additionally
   require admin approval through the in-app Admin screens).

## 5. Verifying changes

```powershell
npm run typecheck    # TypeScript, no emit
npm run lint         # ESLint (expo config)
npm run test:rules   # Firestore rules against the emulator (64 cases)
```

Rules tests need one-time (test-only, not saved to package.json):

```powershell
npm install --no-save firebase-tools "@firebase/rules-unit-testing@5"
```

`@firebase/rules-unit-testing@6` requires firebase v13; version 5 matches the
firebase v12 used here. The emulator config lives in `firebase.json`
(firestore on port 8080).

Current status (verified): `typecheck` 0 errors, `lint` 0 problems,
rules **64/64 pass**, production web bundle exports successfully.

## 6. Deployment (EAS)

```powershell
npx eas-cli login                       # Expo account that owns the project
npx eas-cli build --platform android --profile preview    # installable APK
npx eas-cli build --platform android --profile production # Play-ready AAB
npx eas-cli submit --platform android --profile production
```

Set the Firebase values as EAS environment variables so cloud builds get them
(repeat for all six names, per environment):

```powershell
npx eas-cli env:create --environment production `
  --name EXPO_PUBLIC_FIREBASE_API_KEY --value "<from Firebase Console>" --visibility plaintext
```

> **Critical**: if the `EXPO_PUBLIC_FIREBASE_*` variables are absent during a
> build, `firebaseConfig.ts` falls back to the old hard-coded project
> (`unitrack-15d9a`) and logs a warning. Always set the env vars (or update the
> fallback object) before producing a release build.

## 7. Project structure

```
app/                 expo-router screens, grouped by role:
  (auth)/            login, register
  (student)/ (teacher)/ (cr)/ (admin)/
  subject/ test/ assignment/ profile.tsx
components/ui/       Card, Button, Badge
context/AppContext.tsx   Firestore subscriptions + all mutations (source of truth)
src/services/        Firestore service modules (enrollments, testSubmissions, …)
firebaseConfig.ts    single Firebase init (env-driven)
firestore.rules      least-privilege security rules (tested)
storage.rules        Storage rules
tests/rules/         emulator test suite
server/              Express static hosting / landing page
```

Firestore is the source of truth; AsyncStorage is only an offline cache.
Document IDs for student work are deterministic
(`assignment_{id}_{uid}`, `test_{id}_{uid}`) so resubmission is structurally
impossible (create-only rules).

## 8. Known limitations

- **Lockfile drift**: `package-lock.json` predates the `firebase` /
  `expo-document-picker` additions in `package.json`. Use `npm install` (not
  `npm ci`) until the lockfile is regenerated and committed:
  `npm install --package-lock-only` (review the diff before committing).
- **Dependency drift**: `npx expo-doctor` passes 17/18 checks; 9 packages are
  a patch (and one minor) behind the versions Expo SDK 54 was tested with.
  Run `npx expo install --fix` before a release build.
- **Test answer key**: `correctIndex` ships in the `tests` collection, so
  in-app auto-scoring is advisory only; teachers re-grade submitted answers.
  Moving the key server-side (Cloud Function) is the future hardening step.
- `app.json` still contains a Replit `origin` for expo-router; harmless for
  native builds, replace it with your real web origin if you deploy web.
- The Express server (`server/`) is legacy static hosting; the app itself
  talks only to Firebase.
