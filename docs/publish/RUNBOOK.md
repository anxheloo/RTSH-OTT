# RUNBOOK — Android / Google Play, first production submission

Written 2026-08-14 against console state read the same day. **Every 🔴 step is yours to click.**
Nothing in this file is run automatically, and nothing is sent for review without your say-so.

Console: developer `6801667389174391983` · app `4975999587846851502` · package `al.rtsh.tani`
Base URL for every console link below:
`https://play.google.com/console/u/0/developers/6801667389174391983/app/4975999587846851502/`

**Where you already are:** org account verified as RTSH, app registered, both store listings live,
feature graphic uploaded, 10 of 11 App content declarations actioned, internal-testing release
(version code 12) uploaded and working, submit chain proven. The build→submit→track pipeline has
already been exercised once, so steps 5–7 are a repeat, not new ground.

---

## Step 0 — commit the engineering fix (2 min)

Already done in the working tree; this just records it.

```bash
git add package.json package-lock.json docs/publish scripts
git commit -m "fix(deps): clear Hermes V1 memory regression; align SDK 57 patch set"
```

What changed and why: `expo` 57.0.8 → **57.0.13** and the `react-native` alias
`react-native-tvos` 0.86.0-2 → **0.86.2-0**. The alias bump is the part that mattered — Hermes
ships inside React Native, so bumping `expo` alone did **not** clear it (`expo install --fix`
cannot retarget an npm alias). Verified after: doctor **21/21**, `tsc` clean, **111/111** tests,
lint clean.

---

## Step 1 — 🔴 Foreground service declaration — THE LAST BLOCKER (5 min)

`app-content/overview` → **Foreground service permissions** → *Start declaration*

Currently flagged **"Declaration overdue"**; it is the only App content item still open and it
blocks releasing. One question, tick **both**:

- ☑ **Media playback** — background radio
- ☑ **Show picture in picture** — live TV PiP
- ☐ Other

Description (if asked) → copy from `CONSOLE_TASKS.md §3.3`.
If it asks for a demo video → ~30s screen recording of radio playing with the screen locked,
showing the lock-screen controls, uploaded unlisted to YouTube.

Save the declaration. **Do not** submit anything for review yet.

---

## Step 2 — 🔴 Sign-in details free text (2 min)

`app-content/testing-credentials` → edit **User Account** → *"Any other information required to
access your app"* (currently **empty**)

Paste the block from `CONSOLE_TASKS.md §3.2`. It tells the reviewer the account skips the email
OTP and that no VPN or Albanian IP is needed — the two things Google's own guidance panel on that
screen asks you to state. Credentials themselves (`ott@rtsh.al`) are already correct.

---

## Step 3 — 🔴 Select countries and regions for PRODUCTION (2 min)

`tracks/production` → **Countries / regions** → add.

**This is not done yet** — found on the dashboard's own production checklist on 2026-08-14. It is
independent of the internal-testing track's country settings, and production cannot roll out
without it. For an Albanian public broadcaster with a diaspora audience, "all countries" is the
straightforward choice; restrict only if RTSH legal says otherwise.

> If you distribute in the EU, the **DSA trader status** declaration applies (audit item #12) —
> it lives under the developer account, not the app.

---

## Step 4 — 🟠 Device smoke test (15 min) — do NOT skip

```bash
# 1. regenerate native against the CURRENT react-native (see note A)
APP_VARIANT=production npx expo prebuild --clean --platform android

# 2. build + install (see note B for the SENTRY_ flag)
SENTRY_DISABLE_AUTO_UPLOAD=true APP_VARIANT=production npx expo run:android --variant release
```

> **Note A — always `prebuild --clean` after a native dependency change.** `android/` is gitignored
> pure CNG, so regenerating is free. Building on a stale `android/` generated against the *previous*
> React Native risks linking the old Hermes and silently undoing the fix this build exists to ship.
> The prebuild log confirms the right one: *"Using react-native@npm:react-native-tvos@0.86.2-0"*.
>
> **Note B — a local RELEASE build FAILS without `SENTRY_DISABLE_AUTO_UPLOAD=true`.** Hit for real
> on 2026-08-14:
> `Execution failed for task ':app:createBundleReleaseJsAndAssets_SentryUpload_al.rtsh.tani@1.0+1_1'`
> → `sentry-cli ... finished with non-zero exit value 1`.
> This is **by design, not a regression**: `disableAutoUpload: IS_DEV` means release builds attempt
> the source-map upload, and `SENTRY_AUTH_TOKEN` lives only in `eas env` at `sensitive` visibility —
> EAS Build injects it, a local machine has none. Two valid fixes:
> - **Smoke test (preferred):** `SENTRY_DISABLE_AUTO_UPLOAD=true` — honoured at
>   `node_modules/@sentry/react-native/sentry.gradle:11`. Skips the upload, so no junk Sentry
>   release is created for a binary that will never ship.
> - **Faithful reproduction:** `eas env:exec production '<build command>'` — pulls the real token
>   and uploads maps, exactly as EAS Build does.
>
> Neither applies to `eas build`, which has the token injected automatically.
>
> **Also expect `versionCode 1` locally.** `appVersionSource: remote` means EAS owns the counter,
> so a local `run:android` stamps `1.0+1`. Irrelevant for a smoke test; the real build gets 15.

The RN bump is a **native** change. This project has twice shipped a build that compiled cleanly
and then died at launch (the 2026-07-29 dyld `SIGABRT`, and the regression just fixed). A release
build on real hardware is the only thing that proves it.

Check: app launches · login works · a live TV channel plays · a radio station plays and **keeps
playing with the screen locked** · lock-screen controls respond · PiP works.

---

## Step 5 — 🔴 Production build (~25 min, metered)

```bash
npm run eas:android:prod       # eas build --platform android --profile production
```

Produces an **AAB** at version code **15** (EAS remote counter is at 14, `autoIncrement` on).
`versionName` stays `1.0` from `app.config.ts`.

---

## Step 6 — 🔴 Upload to Play (~5 min, metered)

**Decide this first — see the note below.**

```bash
npm run eas:submit:android     # eas submit --platform android --latest
```

> ### ⚠️ Read before running: your submit profile can auto-publish
>
> `eas.json` sets `submit.production.android.track: "production"` with **no `releaseStatus`**.
> EAS defaults that to `COMPLETED`, which means: once Google approves the review, the app goes
> **live at 100% automatically**. There is no second confirmation.
>
> That contradicts how you said you want to work. The one-line fix makes the upload land as a
> **draft** you explicitly roll out:
>
> ```diff
>   "android": {
>     "serviceAccountKeyPath": "./rtsh-ott-5016e1d0e915.json",
> -   "track": "production"
> +   "track": "production",
> +   "releaseStatus": "draft"
>   }
> ```
>
> Valid values, read from the installed eas-cli 21.6.0 (`SubmissionAndroidReleaseStatus`):
> `completed` · `draft` · `halted`. Ask before applying — this is a behaviour change.

---

## Step 7 — 🔴 Create the release and send for review (YOUR click)

`tracks/production` → open the draft release (or *Create new release* if you used `completed`)

1. Confirm the AAB is version code **15**.
2. Add release notes (`en-US` and `sq` — both listings exist).
3. **Review the summary**, then **Send N changes for review**.

This bundles the 9 already-staged listing/declaration changes together with the release. It is the
first irreversible step: the binary enters Google review. First reviews typically take a few days.

---

## Not blocking — do when convenient

- **Account-deletion URL (audit #2, 🟠).** RTSH web adds ~4 lines of deletion *steps* + an anchor
  to §8 of the privacy page (`CONSOLE_TASKS.md §3.5`), then repoint the Data safety field. The
  cheapest item to be wrong about: a rejection here is a form edit and resubmit, not a rebuild.
- **Drop "19 RTSH television channels"** from the Play description — an inventory count that
  expires the day RTSH adds or drops a channel. Already removed from the Apple listing.
- **Export the feature-graphic source** into `assets/AppStore-PlayStore/play/feature-graphic.png`
  so the live asset is versioned instead of existing only inside Google's console.
- **Least-privilege the service account** — it currently holds *Admin (all permissions)*; it only
  needs release + store presence.
- **Android TV form factor** — the production track covers *Phones, Tablets, Chrome OS, Android
  XR*. TV needs a separate opt-in with TV screenshots + a 1280×720 banner and its own review. In
  contract scope, not in this submission.

---

## The order matters

1–3 are console work with no dependencies — do them in any order. 4 gates 5 (never build
untested native changes). 5 gates 6. 6 gates 7. Steps 1–4 cost about 25 minutes of your time;
5–6 are mostly waiting.
