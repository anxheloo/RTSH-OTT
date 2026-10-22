---
paths:
  - "src/lib/monitoring.ts"
  - "src/app/_layout.tsx"
  - "src/store/createUserSlice.ts"
  - "metro.config.js"
  - "jest.setup.ts"
  - "app.config.ts"
  - "package.json"
---

# Observability (crash / error monitoring)

## How it works today (built 2026-07-29 — closes 14.1 / 5.X.12 / 11.Y.6)

`@sentry/react-native` **7.11.0** — the version `expo install` pins for SDK 57
(`expo/bundledNativeModules.json` → `~7.11.0`). npm's latest is 8.20.0; **do not chase it**, the pin
is the SDK-compatible one. Several APIs the Sentry docs show are 8.x-only — see Known gaps.

- **`lib/monitoring.ts`** is the single `Sentry.init` site (in `lib/` because it is platform infra,
  beside `keychain.ts` / `tokenVault.ts` — not a domain API call). Armed from `app/_layout.tsx` at
  module scope in **its own guard, before** the `setupAuthRefresh` / `setupFocusManager` / `initI18n`
  block, so everything after it is reportable and a reporter failure cannot wedge boot.
- **DSN is public, auth token is secret.** The DSN only permits *writing* events and is hardcoded in
  `monitoring.ts` — same convention and rationale as `API_BASE_URL` in `api/client.ts` (one value,
  bundled identically for local / EAS / OTA, env surface stays honestly documented as
  `EXPO_PUBLIC_API_MODE` only). `SENTRY_AUTH_TOKEN` can publish releases to the org and lives in
  exactly one place — **`eas env` at `sensitive` visibility** — reaching EAS Build by injection and
  the local OTA upload via `eas env:exec`. It is never in the tree and never in `.env`. DSN abuse is
  answered by spike protection + rate limits on the Sentry project, not by hiding it.
- **EU region.** The org `acsolutions-1a` is on `ingest.de.sentry.io`. Every tool that talks to it —
  the config plugin, `sentry-cli`, `sentry-expo-upload-sourcemaps` — must use `https://de.sentry.io/`.
  An upload sent to `sentry.io` lands nowhere **with no error anywhere**; traces just stay minified.
- **Environments — derived from the BINARY, not from `extra` (reworked 2026-07-31).** `environment`
  comes from **`Application.applicationId`**'s suffix (`.dev` → development, `.preview` → preview,
  else production), mirroring `getVariantValues()` in `app.config.ts`. Without an environment split
  every build pools into one stream: simulator noise beside real user crashes, a meaningless
  crash-free rate, and "alert me on a new issue in production" becomes inexpressible.

  It originally read `extra.appVariant` (the same build-time → runtime mechanism as
  `extra.devicePlatform`). **That is wrong for this signal and must not be restored.** `extra` is not
  baked once at build time — it is whatever process minted the *current manifest* evaluated
  `app.config.ts` to, and `expo-constants` resolves
  `rawUpdatesManifest ?? rawDevLauncherManifest ?? rawAppConfig`, so a **dev server** or an **OTA
  update** manifest silently outranks the binary's own copy. Two processes routinely evaluate that
  config with `APP_VARIANT` unset — where `app.config.ts` falls back to `'production'`:
  - **Metro.** `npm start` (`package.json`, no `APP_VARIANT`; only `start:dev` sets it) served a
    `.dev` simulator build a manifest saying `production` → issue `REACT-NATIVE-RTSH-OTT-2` landed
    in the **production** stream on 2026-07-31. This is what prompted the rework.
  - **`eas update`.** It re-evaluates the config in its own process. A shell `VAR=x cmd1 && cmd2`
    prefix binds to `cmd1` **only**, so `APP_VARIANT=production npm run ota:export && … && eas update`
    left it unset on the publish itself — every OTA shipped `appVariant: 'production'` regardless of
    channel. Fixed by prefixing `eas update` directly in all nine `eas:update:*` scripts.

  A rejected alternative: flipping `app.config.ts`'s unset-default to `'development'`. It would have
  fixed the Metro case and **broken the production OTA case** — production users' crashes filed under
  `development`, i.e. invisible. It also fails open on `ALLOW_CLEARTEXT` (`IS_DEV || IS_PREVIEW`) and
  on Sentry's `disableAutoUpload: IS_DEV`. Reading the binary's identity fixes both cases and touches
  no native config. `app.config.ts` is deliberately **unchanged**.
- **PII is scrubbed on BOTH channels.** `beforeSend` scrubs the event; `beforeBreadcrumb` scrubs
  breadcrumbs, which Sentry collects *separately*. The second hook is not optional here — `client.ts`
  sets `Authorization: Bearer <token>` on every request and Sentry's default HTTP breadcrumb
  integration records request metadata, so a token reaches Sentry **past a flawless `beforeSend`**.
  Console breadcrumbs are dropped outright (the style guide bans committed `console.log`, so they are
  pure noise and the one place a stray token would surface). The deep scrubber **fails CLOSED**: at
  `MAX_SCRUB_DEPTH` it returns `[redacted]`, never the raw subtree. This is the ISO 27001
  "no credentials in logs" obligation enforced in code.
- **`sendDefaultPii: false`** — deliberate. Sentry's own docs example ships `true`; that is
  defensible (IP-geo + headers improve grouping) but this app holds auth tokens and carries a store
  data-safety declaration. Flipping it is a recorded decision and must be re-declared to
  `docs/publish/AUDIT.md` (item 24.6, third-party SDK disclosure).
- **User context.** `store/createUserSlice.ts` is the single chokepoint: `setMonitoringUser(user.id)`
  on `login`, `clearMonitoringUser()` on `logout`. **Opaque account id only, never the email.**
  Without an identity Sentry cannot separate "one user hit this 400 times" from "400 users hit it
  once"; without the clear-on-logout a shared device (the living-room STB) attributes the next
  person's crashes to whoever signed in last.
- **Error boundary.** The existing expo-router `ErrorBoundary` in `app/_layout.tsx` now **reports and
  still shows the recoverable fallback**. The `Sentry.captureException` call is explicit because
  7.11.0 predates `Sentry.wrapExpoRouterErrorBoundary` and the Metro
  `autoWrapExpoRouterErrorBoundary` option (both 8.16+). expo-router *swallows* render errors, so
  without that call Sentry never sees them. The boundary stays otherwise dependency-free.
- **`Sentry.wrap(RootLayout)`** is required, not decorative: it installs the React error handler +
  `TouchEventBoundary` (touch breadcrumbs, rage-tap detection) and roots app-start spans.
- **Navigation instrumentation.** `reactNavigationIntegration({ enableTimeToInitialDisplay: true })`,
  bound in `RootLayoutNav` via `registerNavigationContainer(useNavigationContainerRef())`. A crash
  with no route attached is half a crash.
- **Tracing** is on at `__DEV__ ? 1.0 : 0.2`. `1.0` in production is a metered-spend bug — every
  transaction is billed. Replay, structured logging and profiling are **deliberately not enabled**
  (user decision 2026-07-29): replay is of limited value on a 10-foot TV UI and would expand the
  data-safety declaration.
- **`ignoreErrors`** filters only *known-transient* conditions this app already handles by design
  (offline `Network Error`, axios cancel on fast navigation, axios timeout). Do not extend the list
  without a written reason — an unexplained filter is how a real bug stays invisible for months.
- **Readable stack traces — three paths, all wired.**
  - *EAS Build* + *local release builds* (`expo run:* --variant release` / `--configuration Release`):
    the `@sentry/react-native/expo` config plugin generates the iOS build phase (dSYMs + JS maps) and,
    on Android, `sentry.gradle` uploads the Hermes `.hbc.map`. `disableAutoUpload` is
    `IS_DEV` — dev builds skip the wait, preview/production never do. Needs `SENTRY_AUTH_TOKEN` in
    the build environment, which EAS injects from `eas env` automatically.
  - *Android R8 (on since 2026-09-15)*: `expo-build-properties` → `enableMinifyInReleaseBuilds: true`,
    release variant only. Driven by Play's DEX-optimization warning (obfuscation 1%, ≥25% required by
    Feb 2027). **No `extraProguardRules`**: every reflection-heavy dep (RN core, expo-modules-core,
    media3, Nitro/MMKV, Reanimated, sentry-android) ships its own consumer keep rules — add one only
    when R8 names a missing class. `mapping.txt` reaches **Play** inside the AAB automatically, and
    **Sentry** only through the Sentry Android Gradle Plugin, which the Expo plugin applies **only**
    with `experimental_android.enableAndroidGradlePlugin` (`withSentry.js`) — without it native
    Android traces stay obfuscated with no error anywhere. Its `tracingInstrumentation` and
    `autoInstallation` stay off (plugin defaults), so there is no runtime change.
    **R8 *optimization* stays off — tried and reverted 2026-10-19.** The Expo template's
    `proguard-android.txt` carries `-dontoptimize`, so R8 only shrinks and renames; Play Console
    flags this ("Improve your app's memory and performance with R8 optimization"). Switching to
    `proguard-android-optimize.txt` broke the app on a local production build: the register form's
    `@expo/ui` dropdown threw an NPE in `expo.modules.kotlin.records.ReflectionRecordConversionStrategy`
    (Expo records are read by Kotlin reflection, and the optimizer strips what it needs). The
    exception killed the React instance, so the screen went black. It also shrank the packaged
    Baseline Profile from ~43 KB to ~26 KB. Revisit only with keep rules for Expo `Record` classes
    and a full device pass. **AGP 9 drops `proguard-android.txt` entirely**, so this returns at the
    SDK upgrade that brings AGP 9 (this SDK is on 8.12).
    `enableShrinkResourcesInReleaseBuilds` is deliberately **off**: RN resolves bundled image assets
    by name at runtime, which the resource shrinker can strip. Verified on a local preview release
    build: 95% of classes renamed, `Uploaded a total of 1 new mapping files`, and a real-backend smoke
    pass on Pixel 6 API 33 + `RTSH_TV_API34` (login, live + catch-up HLS, radio foreground service +
    background, register-form native pickers, Custom Tabs, cold-restart session) with no
    missing-class crash. **Local-build trap:** `./gradlew assembleRelease` bundles with the
    publisher's `.env` *and* Metro's transform cache, exactly like `ota:export` — pin
    `EXPO_PUBLIC_API_MODE=real` inline **and** clear `$TMPDIR/metro-cache`, then confirm the APK's
    `assets/index.android.bundle` contains no fixture string (`Radio Studentore`). Pinning alone
    shipped mock on this run.
  - *EAS Update (OTA)*: an OTA bundle is **new JS**, so it needs its own upload or every crash on
    OTA'd code is unreadable — precisely the code shipped fastest and tested least. Each
    preview/production `eas:update:*` script is `export → upload → publish`:
    `APP_VARIANT=x npm run ota:export && npm run ota:sourcemaps:<preview|prod> && APP_VARIANT=x eas update --skip-bundler …`.
    **Upload BEFORE publish, never after** — a failed upload must abort the `&&` chain rather than
    leave a live update whose crashes are unreadable. **`expo export --source-maps` is mandatory —
    the flag defaults to `false`**, and without it the uploader finds nothing and silently succeeds.
    The upload step pulls the token via `eas env:exec` (see Known gaps); dev scripts omit it.
  - Symbolication itself rides **Debug IDs** injected by `getSentryExpoConfig` in `metro.config.js`,
    so it does not depend on `release`/`dist` strings matching the uploaded artifact — historically
    the commonest "maps uploaded, traces still minified" cause.
- **Releases.** `release` = `applicationId@nativeApplicationVersion`, `dist` = `nativeBuildVersion`
  (both from `expo-application`) — used for release health, not symbolication. The OTA identity rides
  **tags** (`ota_update_id`, `ota_channel`, `app_variant`) rather than being folded into `dist`,
  because `runtimeVersion` policy is `appVersion`: two devices on the same binary can run different
  JS, and without the tag an OTA-introduced crash is indistinguishable from a store-build crash.
- **Jest.** `@sentry/react-native` is mocked in `jest.setup.ts`. This is not a native-module
  convenience — `createUserSlice.ts` imports the monitoring seam, so an un-mocked SDK would make the
  **test suite send events to the production project**: CI noise indistinguishable from real user
  crashes, plus quota spent on it.
- **The boundary.** `eas env` secrets → `docs`/EAS (Phase 21.1–21.12); OTA rollback on a bad release
  → `useOTA` + `eas update` (see CLAUDE.md); store data-safety **declarations** for the new SDK →
  `docs/publish/AUDIT.md` 24.6. This section instruments; the audit declares.

## Known gaps

- **Symbol upload: PROVEN 2026-07-29** (was listed here as unproven; corrected against Sentry's own
  records). All four builds off commit `44d62b18` uploaded successfully — verified in Sentry, not
  inferred from a build log:
  - **JS source maps** for every build, under releases `1.0.0 (4)`/`(6)`/`(7)`/`(10)` with matching
    `Dist`. That the release strings line up is the load-bearing part: it means the string the SDK
    reports and the string the artifacts were uploaded under **agree**, which is the "empty release"
    trap avoided (nothing errors when they disagree — the release just silently holds no events).
  - **iOS native dSYMs** (`RTSHTANI`, `RTSHTANIPreview`, plus `React`/`libavif`), ~133 MiB each —
    the dyld / OOM / ANR frames that never reach the JS handler.
  - Implies two things that could not be checked statically: `SENTRY_AUTH_TOKEN` does reach the EAS
    builders, and the **EU regional `url`** is correct. A wrong region would have produced an empty
    Source Maps page with no error anywhere.
- **Event delivery: PROVEN 2026-07-31** (this bullet previously read "STILL UNPROVEN: no real event
  has been confirmed to land" — that is now stale; corrected against Sentry's own records, not
  inferred). Two issues exist in `acsolutions-1a/react-native-rtsh-ott`:
  - `REACT-NATIVE-RTSH-OTT-1` — `Error: PROVE-RTSH-OBSERVABILITY: verifying Sentry pipeline`,
    first seen **2026-07-30**, culprit `TouchableOpacity.props.onPress (src/app/_layout.tsx)`. The
    deliberate proof throw.
  - `REACT-NATIVE-RTSH-OTT-2` — `Invariant Violation: 'new NativeEventEmitter()' requires a non-null
    argument`, first seen **2026-07-31**. An unsolicited real error, i.e. the pipeline catches
    things nobody planted.

  Both carry local `/Users/...` culprit paths, so both came from a **dev** build — which also
  confirms `Sentry.init` has no `__DEV__` gate and dev events send tagged `environment: development`.
  What this does **not** yet prove: a **release**-build event (native crashes, TTID, slow/frozen
  frames need a native build — never Expo Go), and symbolication actually resolving against the
  uploaded maps on a store or OTA build. Sentry's "Set up the SDK" onboarding banner is gone now
  that events have arrived; if it ever reappears it reflects an empty project, NOT a misconfigured
  SDK, and **running the suggested wizard would overwrite this setup** with its defaults
  (`sendDefaultPii: true`, `tracesSampleRate: 1.0`, no `beforeSend`/`beforeBreadcrumb`).
- ~~**Alerting is the Sentry default only.**~~ **Closed 2026-08-01 — the two floor rules exist and
  were verified via MCP** (config read back, not assumed):
  - **`New issue in latest production release`** (issue rule `734519`) — trigger *First seen event*,
    action filter *Latest release*, `environment: production`, email action. This is the
    bad-ship alarm the default rule cannot express.
  - **`Production crash-free session rate`** (metric rule `10001584932`) — aggregate
    `percentage(sessions_crashed, sessions)`, 60-min window, `environment: production`,
    **critical below 98 / warning below 99.5**, email on both triggers.
  - The auto-created **`Send a notification for high priority issues`** (`728141`) stays as the
    catch-all. It is deliberately left `environment: null` (fires on dev/preview too) — it is the
    only standing proof the notify path works; it **fired 2026-07-31T10:55Z** for
    `REACT-NATIVE-RTSH-OTT-2`. Scope it to production once the app is live.
  - A fourth rule (`Notify anxheloo`, `734524`) was created by accident during the same session —
    *any* new issue, no environment and no release filter — and **deleted the same day**. It would
    have double-emailed every production issue alongside `734519` and fired on every dev error.

  **Both new rules will read as silent until launch, and that is correct, not broken.** Every
  `preview`/`production` release currently reports `firstEvent: null` — only the two `.dev` releases
  have ever produced events, so there is no production traffic for either rule to evaluate.

  **Alert rules are dashboard-only.** Three automation paths were tested and all fail: the Sentry
  MCP exposes `find_alert_rules` / `get_alert_rule` but **no create**; `sentry-cli` has no `alerts`
  command at all; and the REST API rejects the `eas env` token with **403** (it is scoped to
  releases/sourcemaps, and cannot even *read* alert rules). Creating or deleting one means
  `https://acsolutions-1a.sentry.io/alerts/new/` by hand — do not plan an automated path for it.
- **Rule 2 depends on sessions actually being sent, which is NOT yet proven.** `Sentry.init` does not
  disable `enableAutoSessionTracking` (defaults `true`), so sessions *should* flow — but no query
  available here can confirm it (`firstEvent` tracks errors, not sessions, and the MCP exposes no
  sessions dataset). **Verification owed at launch:** open rule `10001584932` against a release that
  has real usage; a "no data" crash-free-rate chart means session tracking is not reaching the
  server and the rule is decorative.
- **`beforeSend` does not see native crashes.** dyld / OOM / ANR bypass the JS layer entirely. They
  are protected by what never reaches native context, not by that hook.
- **Commit association is not wired.** Without linking the repo in Sentry, a crash cannot point at a
  suspect commit — the single biggest cut in time-to-diagnosis, and one `sentry-cli` step in the
  release flow.
- **OTA bundles on the PUBLISHER'S MACHINE — this shipped a mock bundle to preview once
  (2026-08-01).** `eas update` bundles locally (that is what `--skip-bundler` skips), so the
  publishing laptop's `.env` **and Metro cache** decide what devices receive. This bullet previously
  read *"safe today because `EXPO_PUBLIC_API_MODE` is the only env var the app reads"* — that was
  wrong, and it is precisely the var that caused the incident.

  **What happened:** a mock-mode `expo export` earlier that day populated Metro's transform cache.
  A later publish ran with `.env = dev` but reused the cached result, so the **mock** bundle went to
  the `preview` channel. `rm -rf dist` did not help — it removes the output, not the cache.

  **This was a REGRESSION introduced by the `--skip-bundler` split, not a pre-existing hazard.**
  The prior one-line script (`eas update --channel preview --environment preview`) was immune, for a
  reason nothing documented — eas-cli does this (`build/commands/update/index.js`):

  ```js
  clearCache: flags['clear-cache'] ? true : !!flags['environment'],
  ```

  **Passing `--environment` silently forces `clearCache: true`**, so eas-cli ran `expo export --clear`
  on every publish. It also passed the EAS environment's variables into that export as `extraEnv`
  (`build/project/publish.js`). Moving the export out to a manual `expo export` for Sentry source maps
  discarded **both** protections at once. Restored explicitly: `--clear` plus a pinned
  `EXPO_PUBLIC_API_MODE` in `ota:export`. **Any future change that hand-rolls a step eas-cli used to
  perform must re-audit what that step was silently doing** — the `--clear` was invisible in every
  log and doc, and only appears in eas-cli's source.

  **Two script families exist on purpose.** `eas:update:<env>` is the plain one-liner — eas-cli
  bundles, so it keeps the implicit `--clear` *and* the `extraEnv` injection for free; **prefer it
  whenever source maps aren't needed.** `eas:update:withSentry:<env>[:platform]` does the local
  `ota:export` → map upload → `--skip-bundler` publish, and must re-create by hand both protections
  that `--skip-bundler` discards. **Never drop `--environment` from either family to "simplify" it:**
  that flag is what turns on the cache clear.

  `EXPO_PUBLIC_API_MODE=real` is pinned in **`ota:export` only** — the path that actually shipped the
  mock bundle. The plain scripts are deliberately left as the bare one-liner so they stay portable to
  projects that have no such variable; their exposure is small because `.env` defaults to `real` and
  is gitignored, so a fresh clone has none at all and resolves to real. If a project ever wants that
  guard on the plain path, the correct home is the environment, not the script —
  `eas env:create --name EXPO_PUBLIC_API_MODE --value real --environment preview --environment
  production` — since `--environment` injects it as `extraEnv`, which beats `.env` (dotenv does not
  override an already-set variable).

  **`APP_VARIANT` is deliberately NOT set on any update script (removed 2026-08-01).** It was added
  when `Sentry.init` read `extra.appVariant`, but that same change moved Sentry onto
  `Application.applicationId`, leaving the prefix dead. Nothing in `src/` reads `extra.appVariant`
  now, and everything else `APP_VARIANT` drives in `app.config.ts` — `ALLOW_CLEARTEXT`, bundle IDs,
  display names, icons, `disableAutoUpload` — is **native config an OTA cannot change**. Re-adding it
  would only restore a misleading no-op. It remains load-bearing for `prebuild`/`build` scripts.

  **Proven by content hash, not inference:** a `mock` export and the published bundle shared the
  filename hash `entry-14130fd4…` while `dev`/`prod` exports produced `entry-c240202b…`; the
  published bundle also carried the fixture strings (`Radio Studentore`, …) and was ~22KB larger.
  A fixed export contains **zero** fixture strings.

  **Two independent defects, both fixed in `ota:export`:**
  1. **Metro's transform cache does not invalidate on an `EXPO_PUBLIC_*` change** → `--clear`.
  2. **The export inherited the publisher's `.env`** → the value is pinned inline
     (`EXPO_PUBLIC_API_MODE=prod expo export …`), which wins because dotenv does not override an
     already-set variable.

  **Rule: `.env` is a LOCAL toggle for `expo start` only. It must never decide what a published
  bundle contains.** Note the mock gate IS eliminated at bundle time when the value is not `'mock'`
  (that is why the size differs), so the decision is frozen into the artifact — there is no runtime
  recovery from publishing the wrong one. EAS **Build** was never affected: it runs on a clean
  machine with no `.env` (gitignored) and no warm cache. **If an EAS-only `EXPO_PUBLIC_*` var is ever
  added, the local-bundling gap returns** — revisit the update scripts then.
- **OTA symbolication pulls the token from `eas env` at publish time (reworked 2026-07-31).** The OTA
  chain's first two steps (`expo export --source-maps`, `sentry-expo-upload-sourcemaps`) run **on the
  developer's machine before `eas update` is ever invoked**, so nothing injects an EAS-side variable
  into them automatically. `ota:sourcemaps:preview` / `:prod` therefore wrap the uploader in
  **`eas env:exec <environment> '<cmd>'`**, which fetches the environment's variables and runs the
  command with them. `url`/`organization`/`project` come from the `@sentry/react-native/expo` plugin
  entry in `app.config.ts`, so the token is the only value that has to travel.

  **This requires `sensitive` visibility, and that was the whole bug.** While the var was `secret`,
  `env:exec` delivered **nothing**; after re-creating it as `sensitive` it delivers. Both directions
  proven with the same one-liner, not assumed:

  ```
  # while secret:
  $ eas env:exec preview 'test -n "$SENTRY_AUTH_TOKEN" && echo PRESENT || echo ABSENT'
  ABSENT

  # after re-creating as sensitive (2026-07-31):
  $ eas env:exec preview    …   →  PRESENT
  $ eas env:exec production …   →  PRESENT
  $ eas env:exec development …  →  ABSENT   ← correct: dev has no token and its scripts skip upload
  ```

  EAS states the rule itself in `env:exec`'s own output: *"Environment variables with visibility
  **Plain text** and **Sensitive** loaded from the … environment on EAS"* — `secret` is excluded by
  construction, because it *"can only be accessed on EAS builder and can't be read in any UI,
  **including on the website and in EAS CLI**"*, and `env:exec` is the CLI running locally.
  `sensitive` stays masked in the dashboard and obfuscated in logs, but is CLI-readable.
  **A `secret` var cannot be downgraded in place** — EAS cannot decrypt it either;
  `eas env:update --visibility sensitive` fails with *"type == SECRET can't be decrypted in any UI
  outside of EAS build environment"*. It must be **deleted and re-created** (dashboard or
  `eas env:set`) with the value re-supplied — rotate at Sentry if the original wasn't kept.

  **`ota:preflight` was deleted as redundant.** It existed to hard-fail before publishing an
  unsymbolicated bundle, but `expo-upload-sourcemaps.js` already does exactly that — it
  `process.exit(1)`s on a missing token (`scripts/expo-upload-sourcemaps.js:188-191`), so the `&&`
  chain stops before `eas update` runs. Letting the real uploader be the guard is a stronger
  guarantee than a proxy check that could drift from it. **Dev OTA scripts skip the upload entirely**
  (no token in the `development` environment, by design — matches `disableAutoUpload: IS_DEV`).

  **Status: the full chain RAN END TO END and PASSED, 2026-08-01** — first real
  `npm run eas:update:preview:ios`, against the live backend. Every link verified from the command's
  own output, not inferred:
  - `expo export --source-maps` produced the Hermes bundle + `.hbc.map`.
  - `eas env:exec` delivered the credential: *"Environment variables with visibility Plain text and
    Sensitive loaded from the preview environment on EAS: SENTRY_AUTH_TOKEN."*
  - Sentry accepted the upload — *"✅ Uploaded bundles and sourcemaps to Sentry successfully"*,
    debug id `c900b8bf-8a58-4f27-bf07-ed3d99b486fd`, org `acsolutions-1a`, EU region.
  - `eas update` published to branch `preview`, runtime `1.0.0`, update id
    `019fbdc9-e639-77fb-9be5-3d5320937a62`, commit `7886429`.

  **`Release: None` / `Dist: None` in the upload report is CORRECT, not a misconfiguration** — per
  Sentry's docs, *"uploaded source maps for updates have no associated releases, which is expected as
  updates can apply to multiple releases."* Symbolication rides the **Debug ID**, which is why the
  release/dist strings are irrelevant on this path (see "Symbolication itself rides Debug IDs" above).
  Do not "fix" this by forcing a release string onto the OTA upload.

  **On-device verification** uses the Settings → Version row, which appends `Updates.updateId`'s
  first 8 chars (`settings.tsx`). It shows the id of whichever bundle is running, so
  `RTSH TANI 1.0.0 (019fbdc9)` identifies *which JS the device is running* —
  otherwise two bundles look identical and "the update worked" is a guess.

  **Corrected 2026-08-17: the suffix is NOT empty on an embedded bundle, so its presence alone proves
  nothing.** This previously read *"It is empty on the embedded bundle and shows the id once an update
  is applied"* — false. A locally-built **production** APK displayed `RTSH TANI 1.0 (1a8e9151)` while
  `eas branch:list` showed the **production branch carrying zero updates** (only `preview` (iOS) and
  `review` have any), so no OTA could have applied: `Updates.updateId` returns the **embedded**
  update's own id. Read the suffix as "which bundle", never as "an OTA is applied"; to tell embedded
  from OTA, compare the id against `eas update:list` for that channel. `useOTA` checks once per
  **cold start** and applies silently (see → Boot / Splash gate), so a full app **force-close** is
  required to pick up a new update; backgrounding does not.
- **No credential lives in the tree — the "commit the token" plan was WITHDRAWN (2026-07-31).** An
  earlier decision this same day was to track `.env.sentry-build-plugin` in git, so a fresh clone of
  the private repo could publish an OTA with zero setup (the project is to live only on GitHub, with
  no local working copy). `eas env:exec` reaches that same goal without the credential ever entering
  git — publishing already requires `eas login`, so a clone that can publish can also read the var.
  The file was never created; it is **gitignored**, and the risks that plan had accepted are simply
  gone: no permanent git history, no "repo read ⇒ Sentry publish rights" for every collaborator and
  authorized GitHub App, no silent transfer at the RTSH credentials handover (contract Shtojca 5 §1),
  no standing **ISO 27001** finding for credentials at rest in source, no GitHub push-protection
  fight. **Invariant restored: there are ZERO credentials in the tree.** Signing keys stay on EAS,
  the refresh token stays in the keychain, `SENTRY_AUTH_TOKEN` stays in `eas env`. Residual exposure
  is the intended one — anyone with EAS project access can read a `sensitive` var, which is a
  smaller, revocable blast radius than git history. A further hardening, if ever wanted: run OTA
  publishes from GitHub Actions with the token as a repo secret, so no human machine reads it at all.
- **A secret must never live in `.env` — but NOT for the reason stated here until 2026-08-01.**
  The earlier entry claimed `@expo/env.load()` "exports `EXPO_PUBLIC_*` variables only", so a
  `SENTRY_AUTH_TOKEN=` line would be silently unloaded. **That was wrong, and it was wrong in a
  dangerous direction** (it implied `.env` was self-protecting). Corrected against source
  (**@expo/env 2.4.2**, `build/index.js` + `build/constants.js`):
  - `load()` assigns **every** parsed key into `process.env`, minus a hardcoded security denylist
    (`isIgnoredEnvKey` / `isLocalEnvKey` — `PATH`, `NODE_OPTIONS`, `DYLD_*`, package-manager roots…).
    There is **no `EXPO_PUBLIC_` filter**. That prefix governs **bundle inlining**, not loading.
  - The uploader (`@sentry/react-native/scripts/expo-upload-sourcemaps.js:126`) explicitly calls
    `require('@expo/env').load(projectRoot)` **before** falling through to `.env.sentry-build-plugin`
    and the shell. So a `SENTRY_AUTH_TOKEN` in `.env` **would have worked** — the opposite of the
    claim. It "working" is precisely what would have made it a durable mistake.

  The conclusion is unchanged, the reasoning is not: the token stays out of `.env` because that is a
  **credential at rest in the working tree** (one `git add -f`, one gitignore edit, or one repo
  handover from permanent exposure — contract Shtojca 5 §1), and `eas env:exec` gives the same
  access with no local copy at all. What IS true about the prefix: `EXPO_PUBLIC_*` values are inlined
  into every shipped bundle and are therefore already public — so a secret must never carry that
  prefix either.
- **Already-set env vars beat `.env`** (`@expo/env` `load()`: *"is already defined and IS NOT
  overwritten"*). This is the mechanism that makes `ota:export`'s inline `EXPO_PUBLIC_API_MODE=real`
  prefix authoritative over whatever the publisher's `.env` holds — it is load-bearing, not stylistic.
- **`react-native-tvos` alias.** Sentry installed and resolved cleanly against the alias, and Android
  TV is plain Android to the SDK. Not yet exercised on a TV/STB device.
- **Spike protection / quota alerts** not configured on the Sentry project (dashboard-side).

---
