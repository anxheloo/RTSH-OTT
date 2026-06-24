# plan.md — RTSH-OTT Build Plan

> **Lean plan.** Forward-looking work (`[ ]` / `[~]`) is kept in full so a future session can execute without re-deriving; completed steps (`[x]`) are compressed to one-liners. The **full verbose history** of every completed step (What/Why/Confidence/Trade-offs/Carry-overs) lives in **`plan-archive.md`** (frozen snapshot @ 2026-06-09, commit `7c40f5a`).
> **Testing:** `npx expo run:android` throughout. EAS cloud builds, device registration, and store submission → Phase 21.
> **Entry format** (`anxheloo-task-plan-executor`): `[x]` done · `[~]` deferred/partial · `[ ]` not started. A new `[x]` → one-liner here + full entry appended to `plan-archive.md`. A new `[~]`/`[ ]` → full **What/Why** or **Deferred-because / What-we-need / Approach**.

---

## Status snapshot — 2026-06-23

- **Done:** Phases 0–13 (tooling → store → API → hooks → UI → players → screens → auth-hardening → i18n), 18.2 (mock server), auth wizard (11.X) incl. 11.X.13 (account self-service + cross-device sync), review fixes (11.Y), and **Phase 22.1–22.16** (design tokens/type/logo/icons, 4-tab nav, primitives, auth re-skin, domain types, Home, Guide, Search, Player+EPG+catch-up, Radio, Profile/Settings, parental+geo client, adaptive quality, AdOverlay, skeleton strategy, i18n sq). Plus the 2026-06-18 API reconciliation (stream layer → `PlaybackDecisionDTO`), the 2026-06-22 server-driven Guide + now-playing matcher, and **22.X** (2026-06-23 device-identity reconciliation — headers removed, registration mutation, `deviceClass` on playback).
- **Active:** **Phase 22** — **22.17 QA + verification pass** (`expo run` on device, walk the mockup graph, promote [MEDIUM] visual claims). 22.18 (large-screen/TV) deferred until mobile is approved.
- **Backlog:** deferred audit/infra items (`5.X.*`, `11.Y.4–11`), Telemetry (14), product features (15.2 geo-CDN / 15.5 PIP; 15.4 mosaic cut 2026-06-11), Ads (16), Hardening (17), Handoff (18), Distribution (21), Quality gate (23), **Store readiness & submission (24)**. Remaining Phase 22 screens: 22.14b/14c, 22.15(c–e), 22.16–22.18.
- **End-to-end execution order (user 2026-06-10):** mobile run/test/fix (22.17) → large-screen pass (22.18: portrait-lock browse + landscape player on phone/tablet/iPad; TV = separate always-landscape + D-pad target) → backend wiring (11.X.9) → final audit + plan sync (23) → store readiness & submit (24 requirements + 21 pipeline).

---

## Design context — Phase 22 (source of truth)

> Designer delivered a full interactive HTML mockup (`.claude/docs/rtsh-tani-mobile.html`, 16 screens + overlays, Albanian copy, real RTSH logo lockup as vector). Directive: **design wins on visuals**; **keep our architecture** (Expo Router, single Zustand store, TanStack/axios, STYLE_GUIDE).

### Design facts

- **Palette (dark, flat):** bg `#000` on page `#0d0d10`; surfaces `--surf #141417` / `--surf-2 #1B1B20` / `--surf-3 #26262C`; border `--line #2A2A31`; text `#fff`; muted `--mut #9A9AA2` / `--mut-2 #6E6E77`; brand `--red #EB122F` (+ `--red-2 #ff3a52`). Header **transparent black**; bottom nav **translucent black + blur** (`rgba(10,10,12,.92)`), hairline top, active icon red, label white.
- **Type:** **Inter** (400–900). Headings 800–900, section/player title 700, labels/links/buttons 600. Sizes: 25 (welcome), 20–23 (h2), 17 (header/section), 15 (body/input), 14 (label), 13–13.5 (sub), 12–12.5 (meta), 10–11 (kicker/tag).
- **Radii:** pill inputs/search/toggle 24; buttons 27 (capsule h54); cards 14; inputs 14; list-icons 11–12; sheet 24 top.
- **Logo:** full lockup as vector (red mark `#EB122F` + "RADIO TELEVIZIONI SHQIPTAR" tagline recolored white). Header 25px, splash 52px.
- **Nav (4 tabs):** `Kreu` · `Guida` · `Kërko` · `Profili`. Radio = Home toggle (+ radio routes), not a tab. Catch-up folded into the Player day-strip. ~~Mosaic~~ (cut by user 2026-06-11, see 22.14f). All four tabs share `BrandHeader` (logo taps back to Kreu).
- **15 screens:** splash, login, register, terms, onboard, home, guide, search, profile, settings, player(+EPG+catch-up), radio-list, radio-player, parental(PIN), geo-block. **Overlays:** bottom sheet (options/quality), ad popup, toast.

### Decisions (design-wins)

1. **Outfit → Inter.** [HIGH] Inter-only; Anton/Outfit retired; keep `Fonts` token API.
2. **Config-driven `<Tabs>` + theme-folder `TabBar` object** (base on SOLITAR's `theme/tabBar.ts`; not NativeTabs, not a hand-rolled render prop). [HIGH] Static color-agnostic `TabBar` in `theme/`; colors injected at the layout. RTSH improvements: (a) `expo-blur` translucent bar; (b) decouple active **icon** tint (red, off `focused`) from **label** tint (white via `tabBarActiveTintColor`); (c) flat hairline top. Keep `headerShown:false`.
3. **Tabs 5 → 4**, fold radio→home-toggle + catch-up→player-day-strip. [HIGH] Data layers (services/queries) stay; only the UI host moves.
4. **Full logo lockup** (mark + white tagline) from the design vector. [HIGH] Supersedes the earlier mark-only choice (mark stays available).
5. **Darken surface palette** to design tokens. [HIGH] Header transparent; re-validates 5.X.6/5.X.7/5.X.8.
6. **Dark default + light theme retained** as a feature. [HIGH] Every new token gets a light value too.
7. **Sheets: native, route-based — NOT `@gorhom`.** [HIGH] One shared typed `getModalScreenOptions({ detents, cornerRadius })`, detents tuned per sheet, in-sheet scaffold `SafeAreaView → keyboard → header → content`, alerts stay on `ModalSlice`/`ModalWrapper`. (Implemented in 22.10/22.15: settled on `presentation:'formSheet'` cross-platform per expo-router v56 docs.)
8. **Mobile-first, responsive later.** [HIGH] Grids 2-col on phones → wider on tablet/TV. Applies to the channel grid (22.7); ~~mosaic (22.12)~~ cut 2026-06-11. *(Down-payment landed 2026-06-18: portable **`@/responsive`** module — `useResponsiveGrid()` drives the Home grid's `numColumns` by device class + orientation (shortest-side `sw600dp` classifier: phone 2/2, tablet 3/4, TV 4/4), and `scaled()` applies a per-class step (phone 1 / tablet 1.15 / TV 1.3) to `FONTSIZE`/`SPACING`/control tokens. Supersedes the earlier `floor(width/180)`. 22.18 now owns the rest: content max-width clamps, hero/player width, TV focus/D-pad nav + on-device tuning.)*
9. **Auth: keep OTP, re-skin the wizard; do NOT delete it.** [HIGH] Flow: `login → register (single merged form) → OTP → tokens → home`; T&C = checkbox on register. ⚠️ **Backend-ordering flag [MEDIUM]:** design merges creds+details pre-OTP but the step-machine splits creds→OTP→details; reconcile when `/auth/register` contract lands. Mock posts all fields at step 1 then OTP. Tracked in 22.6.

### Supersessions / re-validations

- Phase 8 (5 tabs) → superseded by 22.4 (4 tabs). · 5.X.6/5.X.7/5.X.8 (design tokens) → reconciled in 22.1. · 2.1 fonts → 22.2 (Inter). · 3.4 SettingsSlice → expand in 22.13. · 3.5 PlayerSlice → confirmed in 22.10/22.11. · 11.Y.9 skeletons → ride per-screen steps. · Session logo work → extended in 22.3.

---

## Completed phases — one-line index (full detail in `plan-archive.md`)

> Two iteration passes (2026-06-03 code-quality cleanup + SOLITAR org alignment; 2026-06-04 multi-step-auth + logo→expo-image) are archived in full. Their net effects are folded into the entries below + `rules/ARCHITECTURE.md`.

### Phase 0–2 — Tooling, Structure, Theme
- [x] **0.1–0.9** Toolchain (Node 20, expo-doctor 21/21), bootstrap (SDK 56 · RN 0.85.3 · strict TS · aliases), EAS init + `APP_VARIANT` variants, ESLint/Prettier + import-sort, zod env reader. (0.4–0.6 → Phase 21.)
- [x] **1.1–1.3** Folder tree + barrels, path aliases verified, README (commands + env matrix).
- [x] **2.1–2.5** `fonts`/`borders`/`spacing`/`colors` tokens + `ThemeSlice` (system/light/dark, `resolveColors`). Re-valued to the design palette/Inter in 22.1–22.2.

### Phase 3 — Store, Storage & Providers
- [x] **3.1–3.4, 3.6, 3.9, 3.10** MMKV + `zustandStorage` + scoped `clearAppStorage`, User/Settings/Modal slices, `useAppStore` (persist + `partialize` + `onRehydrateStorage` re-theme), keychain wrapper (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`).
- [~] **3.5** `createPlayerSlice` shape — confirmed by design (radio cross-screen state + `videoQuality`); largely realized in 9.1 + 22.10. Revisit only if resume-position state moves into the slice.
- [~] **3.7 / 3.8** `ChannelsSlice` (favorites/recently-watched) / `EpgSlice` (reminders) — likely TanStack-Query or MMKV-hook, not slices. Build only when favorites/reminders land in a design step.
- [~] **3.11** Native deps — `react-native-keyboard-controller` + `react-native-gesture-handler` installed; **`@gorhom/bottom-sheet` dropped** (decision 7 — native route sheets).

### Phase 4 — API Layer
- [x] **4.1–4.4, 4.6, 4.7** axios + TanStack `client` (staleTime 5m), interceptors (single-flight refresh via bare `refreshClient`, logout on terminal fail), `endpoints`, 8 services, auth mutations + `setupAuthRefresh()`, `api` barrel.
- [~] **4.5** query hooks — delivered as **5.X.3**. · [~] **4.8** MSW → delivered as a custom axios-adapter mock (**18.2**).

### Phase 5 — Core Hooks
- [x] **5.1–5.5, 5.5a, 5.7, 5.8, 5.9** `useCheckToken` (keychain-only, offline-first), `useAppState`, `useOTA`, `useNetworkReconnect`→later `useNetworkMonitor` (11.Y.2), `useOrientation`, audit-fix pass (5.5a), `useHaptic`, `useBootstrap` (root orchestrator), hooks barrel.
  - **`useHaptic` wired (2026-06-16):** hook was scaffolded here but never consumed. Now live: `selection()` in `Switch`/`Checkbox`/`SegmentedToggle`/`SegmentedChoice`/`FilterChipRow`; `light()` per PIN digit + `selection()` on backspace + `error()` on wrong PIN in `ParentalPinPad`; `success()` before each `onSuccess()` in `ParentalPinModal`; `ReusableBtn` gains opt-in `haptic='light'|'medium'|'none'` prop (default `'none'`). `hapticsEnabled` toggle wired in Settings (was persisted but uncontrolled). Pattern + avoidance rules added to `STYLE_GUIDE.md`.
- [ ] **5.6** `useKeyboard` — superseded by `react-native-keyboard-controller` + `KeyboardProvider` (11.X.0). Close or repurpose if a custom keyboard hook is ever needed.

### Phase 5.X — Audit follow-ups
**Done:** [x] **5.X.1** domain types + services retyped · [x] **5.X.3** TanStack query hooks (channels/epg/catchup/radio/streams) + screens wired · [x] **5.X.6** semantic color tokens · [x] **5.X.7** `SHADOWS`/`OPACITY`/`Z_INDEX`/`ANIMATION` + `BORDERRADIUS` expanded · [x] **5.X.8** spacing reconciliation · [x] **5.X.11** iOS keychain accessibility · [x] **5.X.14** OTA channel explicit in `app.config.ts` · [x] **5.X.15** parental PIN (done in 12.2).

**Deferred (forward backlog):**
- [~] **5.X.2** Zod schemas at the API boundary. **Auth slice DONE in 22.14d** (`userSchema`/`authResponseSchema`; `login`/`refresh`/`getMe`/`updateProfile`/register-completion validated). **Remaining:** streams + the other domain services; reconcile envelope (11.Y.5) when the real contract lands.
- [~] **5.X.4** Per-call timeout overrides (`streamClient` 5s for manifests; longer for bulk EPG).
- [~] **5.X.5** `useCheckToken` rich result `{ authenticated, reason }` so UI can tell "no session" from "network error" (also resolves the 8.2 guard limbo). **Evaluated + deliberately deferred 2026-06-15 (11.X.13):** the only un-handled state is `needs-hydration` (refresh token present, `user` un-fetchable) which is iOS-reinstall-**offline** only; current login fallback is acceptable, building the tri-state + hold/retry is YAGNI until a real user hits it.
- [~] **5.X.9** Decide `predictiveBackGestureEnabled` on Android.
- [x] **5.X.10** MMKV encryption — **DECIDED: accepted risk, won't encrypt (2026-06-10).** Rationale: every real secret is keychain-only (refresh token, parental PIN verifier) or memory-only (access token); the MMKV blob holds only low-sensitivity PII (email/displayName/subscription tier) + boolean settings, and the OS sandbox already blocks other apps from reading it. Encryption would defend only a physical-device-compromise + file-extraction scenario, leaking non-credential data — poor cost/benefit vs the async-boot refactor it requires. **Invariant that keeps this safe:** never persist a real secret into the plaintext MMKV blob (enforced lightweight by **5.X.17** field-whitelist, not encryption).
- [~] **5.X.12** Sentry init — DSN as EAS secret, init before `<Stack/>`, replace `__DEV__ console.warn` patterns. Pairs with Phase 14 / 11.Y.6.
- [~] **5.X.13** Background audio + PiP entitlements in `app.config.ts` (iOS `UIBackgroundModes:['audio']`, Android `foregroundServiceType`). **Prereq for 15.5 PIP + 22.11 background radio.**
- [~] **5.X.16** Re-evaluate the TypeScript pin (`~6.0.3` ahead of SDK 56 baseline); run `expo-doctor`, pin if issues surface.
- [~] **5.X.17** Whitelist persisted `user` fields (`{ id, email, displayName }`) once the backend `User` shape is fixed (currently unbounded blob). Relates to 5.X.10.

### Phase 6 — Core UI Components
- [x] **6.1–6.8** `ReusableText` (variants), `ReusableInput` (focus/error/password), `ReusableBtn` (variants/loading), `ReusableImage` (expo-image/blurhash/disk), Layout primitives (`FullScreenLoader`/`TabHeader`/`OfflineBanner`), `ModalWrapper`, empty-states, barrels. (Variant tables re-scaled to design in 22.2; modal stack → single-modal in 11.Y.2.)

### Phase 7 — Form Layer
- [x] **7.1–7.3** Form approach (plain state for simple forms; **RHF added later** for the multi-step wizard, 11.X.0), zod schemas in `features/auth/schemas.ts`.

### Phase 8 — Navigation
- [x] **8.1–8.8** typedRoutes, `Stack.Protected` guards (keyed on `isAuthenticated` only, 11.Y.1), `(auth)` stack, `(app)` stack with player modals, 5-tab bar (**superseded by 22.4** → 4 tabs), deep-link scheme `rtshtani://`.

### Phase 9 — Video & Audio Players
- [x] **9.1–9.8** expo-video/expo-audio + plugins, `VideoPlayer` (base, render-overlay, PIP props), `PlayerControls` (**restyled to design in 22.10**), `LivePlayer` (**→ inline parent-controlled in 22.10**), `VodPlayer` (resume positions), fullscreen/orientation, `RadioPlayer`, `RadioMiniPlayer`. **Open risk:** `VideoSource.headers` may not forward to AES-128 key requests — validate on a real stream; fallback `react-native-video`.

### Phase 10–13 — Lists, Scaffolds, Auth-hardening, i18n
- [x] **10.1–10.2** FlashList v2 + `AnimatedFlashList`.
- [x] **11.1–11.10** Screen scaffolds (login/register/forgot, live/epg/catchup/radio/profile, channel/program modals) — **all restyled in Phase 22**; `player/[id]` dead route deleted.
- [x] **12.1–12.2 + rotation** Single-flight refresh verified, **parental PIN** (SHA-256+salt keychain, 5-try lockout, `ParentalPinPad`/`ParentalPinModal`), app orientation `default`.
- [x] **13.1–13.4** i18next (sq default, en fallback), namespaces, language switcher.

### Phase 11.X — Server-driven multi-step auth (mock-first)
- [x] **11.X.0–11.X.8 + 11.X.5a + 11.X.7a** RHF + `KeyboardProvider`, wizard endpoints/services/mocks/mutations, `StepHeader`/`OtpVerify`/`AuthScreen`/`TermsNotice`, login/register/forgot rebuilt as step machines, `PLAYER_COLORS` extraction + reuse pass, boot manual-wipe recovery, dead-code removal. **All re-skinned in 22.6.**
- [~] **11.X.9** Final endpoint wiring — **auth slice DONE 2026-06-12 (see 11.X.12)**; remaining domains (channels/EPG/catchup/radio/streams→playback, search, packages, guide) still deferred until their shapes are reviewed against the swagger.
  - **Carry-overs:** `useChannelsQuery` → `useInfiniteQuery`; EPG by channel+date (`useEpgQuery(channelId, date)`); ~~register birthday field → native date picker~~ — **done (2026-06-18):** `DatePickerInput` (`@react-native-community/datetimepicker`) + `CountryPickerInput` (`react-native-country-picker-modal`) added to `RegisterForm`; ~~parental endpoints reconcile~~ — **done** (22.14h `/parental`; 11.X.13 added `PATCH`; `GET`/`verify-pin` intentionally unused — local model).

- [x] **11.X.12** Auth endpoints reconciled against the live swagger (`/v3/api-docs/end-user`, 2026-06-12; decisions agreed with backend).
  - **What:** `/api/v1` prefix on `baseURL` (`API_BASE_URL`, trailing-slash safe); real auth routes (`register/resend-otp`, `reset-password/*`; dropped `REGISTER_DETAILS`/`RESET_RESEND`); refresh = `{refreshToken}` → `{accessToken}` only (**no rotation**, no user → keychain never rewritten, manual-wipe boot always `getMe`); logout POSTs `{refreshToken}` from keychain; register single-shot (all profile data + `acceptTerms`, mapped to wire `termsAccepted` at the service boundary; no `confirmPassword`) → OTP verify auto-login; reset rides one-time `resetToken`, success = `notify` modal + `router.replace('/login')`; `userDtoSchema` validate+transform (int64 id→string, `username`→`displayName`, `birthDate`→`age`, `city`+`country`→`location`, UPPERCASE enums→domain unions); `/users/me` GET/PATCH bare DTO + real `UpdateProfileRequestDTO` payload; register form `age`/`location` → `birthDate`/`city`/`country` (en+sq keys); `DeviceType` enum confirmed from `DeviceInfoDTO` (`TABLET_IPADOS`/`ANDROID_TV`, no `UNKNOWN`); mocks rewritten wire-shaped (DTO user, resetToken db, refresh extras), mock adapter now also intercepts `refreshClient` and **rejects 4xx like real axios** (previously resolved them — error paths were untestable in mock mode). Dead 3-step register leftovers deleted (`RegisterCredentialsForm`/`RegisterDetailsForm` + schemas + orphaned i18n keys).
  - **Follow-up hardening (same day):** single-flight refresh dedup moved **inside `refreshAccessToken`** (shared by interceptor + boot background refresh); the 401 interceptor **never logs out** — only a confirmed 401/403 inside `refreshAccessToken` wipes the session (transient null ≠ logout); boot case (b) skips the background refresh when a token already landed via case (c); failed manual-wipe recovery clears the stray access token before falling to `(auth)`.
  - **Confidence:** tsc + lint clean [CERTAIN]; route/shape parity with swagger [HIGH — read from the live spec]; register field mapping (birthDate/city/country) [HIGH]; reset resend = re-call forgot-password [MEDIUM — confirm it replaces the live code].
  - **Carry-overs (backend asks, 2026-06-12):** add `parentalPinSet: boolean` to `UserDTO` (client already optional-accepts); drop `confirmPassword` from register + reset DTOs server-side; confirm forgot-password resend semantics. ~~add `POST /devices`~~ — **delivered as `PUT /users/me/device`** (bare `DeviceInfoDTO` body), client repointed same day (see 11.X.11 note).
- [x] **11.X.10** Device identity + request headers (backend header spec, 2026-06-11).
  - **What:** pure `utils/device.ts` (`getDevicePlatform` w/ build-time `APP_PLATFORM=androidstb` override → `extra.devicePlatform`; `getOrCreateDeviceId` — keychain UUID `rtsh.device_id`; `buildDeviceHeaders`; `openStoreListing`) + one-shot `useDeviceIdentity` in `useBootstrap` stamping `X-Device-Id`/`X-Device-Platform`/`X-App-Version` onto `apiClient` defaults. `Accept-Language` (store locale) in the request interceptor; **426 → blocking `forceUpdate` modal** (new `ModalType`, `ModalWrapper` copy `update.*` en+sq, CTA = store listing, non-dismissible). Unauth `GET /app/version?platform=…` (`getAppVersion` + `AppVersionInfo`/`DevicePlatform` types + mock). Installed `expo-application` (~56.0.3, doc-verified current).
  - **Why:** backend spec mandates these headers on every call (concurrency limits, ABR-ladder selection, force-update gate); built contract-first so all later endpoint work rides it. Keychain over MMKV: iOS reinstall keeps device identity (no ghost concurrency slots).
  - **Confidence:** tsc + lint clean [CERTAIN]; header values correct per spec [HIGH]; 426 modal blocking behavior [HIGH — code-level; visual verify in 22.17]; boot race (first ~ms requests may lack X-Device-* headers) is acceptable [MEDIUM — confirm with backend that headers are metadata, not auth].
  - **Trade-offs / known gaps:** boot race (fix = async interceptor awaiting memoized headers, only if backend requires); iOS `IOS_APP_STORE_ID` placeholder → 426 CTA no-op on iOS until Phase 24 listing; STB self-update orchestration (boot check → download → install) deferred to 22.18 `androidstb` build; CDN requests carry no headers (edge enforcement rides signed URLs, 15.2).
  - **Carry-overs:** confirm 426-body `{ storeUrl }` override + exact `/app/version` shape at 11.X.9; STB self-update flow → 22.18.
  - **⚠️ SUPERSEDED (2026-06-23, user decision — see 22.X below):** the **request headers were removed entirely**. `buildDeviceHeaders`, `getDevicePlatform`, and the `DEVICE_HEADERS` map were deleted; `X-Device-Id`/`X-Device-Platform`/`X-App-Version` are no longer stamped. `Accept-Language` + `Authorization` remain. `getOrCreateDeviceId`, `openStoreListing`, the 426 modal, and `GET /app/version` all stay. **Divergence from the backend header spec** — the 426 gate can't compare version per-request without `X-App-Version` (logged in ARCHITECTURE → Device identity → Divergence). Marked temporary.

- [x] **11.X.11** Device registration (originally `POST /devices` per the 2026-06-12 payload snippet; **reconciled same day to `PUT /users/me/device`** from the live swagger — bare `DeviceInfoDTO` body, no `{ device }` envelope).
  - **What:** `DeviceType`/`DeviceRegistration` types; `getDeviceType()` (expo-device `deviceType` × `Platform.OS`, STB build-flag wins) + `buildDeviceRegistration()` in `utils/device.ts` (`deviceKey` = the same keychain `X-Device-Id` UUID); `services/devices.ts` `registerDevice` (`PUT USERS_ROUTES.DEVICE`, bare body); mock handler. Trigger lives in `useDeviceIdentity`: effect on `isAuthenticated → true` (login, register completion, cold boot w/ session — exactly one send per app session), fire-and-forget, errors swallowed.
  - **Why:** backend keeps a per-account device registry ("manage my devices", analytics — **no device cap**, confirmed 2026-06-12); keyed on the same UUID as the header so registry and identity never drift. Auth-transition trigger over "home screen open": survives deep links, no re-fire on tab returns, covers app/OS updates via the next cold boot.
  - **Confidence:** tsc + lint clean [CERTAIN]; trigger coverage (login/register/boot) [HIGH — all paths flip `isAuthenticated`]; `type` enum values [CERTAIN — confirmed from `DeviceInfoDTO` in 11.X.12]; response shape ignored [HIGH — client needs nothing back].
  - **Trade-offs / known gaps:** no local dedupe — re-sends identical payloads on every boot (accepted: one tiny request, idempotent PUT); cold-boot send may ride the 401-refresh retry (token lands ms later — harmless).
  - **⚠️ SUPERSEDED (2026-06-23 — see 22.X below):** trigger changed from "`isAuthenticated → true` in `useBootstrap`" to **once on Home-screen mount**; the hand-rolled `useEffect`/`try-catch` was replaced by `useRegisterDeviceMutation` (`meta: SILENT_ERROR`). The PUT body is unchanged. `deviceKey` is still the keychain UUID (no longer "= the `X-Device-Id` header" since that header is gone).

- [x] **11.X.13** Account self-service + cross-device profile sync + parental disable (2026-06-15, swagger-reconciled; scope = auth · parental · `/users/me` · device). Playback/EPG/channels/ads reconciliation still deferred (the big next pass).
  - **Change password** — `POST /users/me/change-password { oldPassword, newPassword, logoutOtherDevices? }` → **rotated** `{ accessToken, refreshToken }`. `services/users.ts changePassword` (`tokenPairSchema`); `useChangePasswordMutation` rewrites the keychain refresh + swaps the in-memory access token (rotation footgun owned in one place). New authenticated screen `app/(app)/change-password.tsx` (RHF+zod `changePasswordSchema`: old/new/confirm + "log out other devices" `Switch`), entry row in Settings → Account, route registered, i18n en+sq. **No separate `logout-others` endpoint** — folded into the flag. `authErrorMessage` extended with a stable-`code` map (`auth.invalid_old_password`/`auth.password_unchanged`).
  - **Parental disable/toggle built** (supersedes 22.14h "setup only / switch locks"). Settings switch: no PIN → `POST /parental { enabled, pin }` (create); PIN exists → `PATCH /parental { enabled }` (toggle). **No `currentPin`** — disabling verifies the PIN locally first (`ParentalPinModal mode="verify"`), re-enabling needs none. Change-PIN reuses the same `PATCH` + `newPin` (UI not built); forgot-PIN still has no endpoint.
  - **Cross-device sync (no sockets)** — `useMeQuery` (`GET /users/me` on foreground + reconnect + 5-min active-only poll, `staleTime 60s`, mirrored to store) + `setupFocusManager` (AppState→`focusManager`), mounted in `useBootstrap`. A parental/profile change on one device reaches the others on re-engagement; clearing local data can't disable the gate (`getMe` re-hydrates it). Deliberately **not** tied to access-token refresh (hot 401 path). Real-time enforcement during active playback is a server concern (playback decision / heartbeat) — deferred.
  - **Reference-grade pass** — parental writes moved to **mutation hooks** (`useSetupParentalMutation`/`useUpdateParentalMutation`) owning the call + store mirror in `onSuccess`, matching login/change-password; the user-object merge centralised in one slice action `UserSlice.setParentalConfig(partial)`; `ParentalPinModal` + `settings.tsx` are now dumb consumers (get `isPending`/`error`). `logout(refreshToken, logoutOtherDevices=false)` now sends the flag; `educationLevel` mapped in `userDtoSchema`; `tokenPairSchema` added.
  - **Confidence:** tsc + lint clean, en/sq parity [CERTAIN]; rotation keychain rewrite + sync triggers correct [HIGH]; cross-device freshness bounded by re-engagement/interval (advisory, not real-time) [HIGH — by design].
  - **Backend confirmations (built per agreement, flagged vs OpenAPI doc):** `PATCH /parental` sends **no `currentPin`** (doc lists it required); `POST /parental` sends `{ enabled, pin }` (doc setup DTO is `{ pin, maxAllowedAge? }`). `maxAllowedAge` accepted but unused (age-rating gating is a playback-phase concern).
  - **Deferred deliberately:** offline-wipe boot `needs-hydration` tri-state (5.X.5) — iOS-reinstall-offline only, login fallback is fine (YAGNI); JWT-embedded user data (anti-pattern — credential ≠ data API); sockets (advisory sync doesn't need them).
  - **Follow-up:** change-PIN UI + forgot-PIN reset flow; unit tests on the pure seams (services, slices, `userDtoSchema`, gate predicate) — the reference-grade capstone.

### Phase 11.Y — Codebase review follow-ups
- [x] **11.Y.1–11.Y.3, 11.Y.12** Guard on `isAuthenticated` only; offline = informational `noInternet` modal + **modal/network simplified to RTSH/SOLITAR single-modal shape** (`useNetworkMonitor` + `createNetworkSlice`); doc drift fixed; `SafeAreaProvider` + `ScreenLayout` (5 tabs migrated).

**Deferred — land with endpoint wiring (11.X.9):**
- [~] **11.Y.4** Runtime validation at the API boundary (Zod). *Needs real response shapes.* Approach: parse each service response with a co-located Zod schema (or typed `http()` wrapper); parse failure → typed `ApiError` → `apiError` modal. Relates to 5.X.2.
- [~] **11.Y.5** Pin one response envelope. *Backend-defined.* Today services disagree (`data.channels` vs bare `data`). Approach: agree one shape, centralize unwrapping in `http()`, align all services in one pass.
- [~] **11.Y.6** Root `ErrorBoundary` + Sentry. *Needs DSN (EAS secret).* Approach: `ErrorBoundary` around root `Stack` (themed fallback + reset); `@sentry/react-native` init in `_layout`. Relates to 5.X.12 / Phase 14.
- [~] **11.Y.7** Query-key factory (`api/queryKeys.ts`) so invalidations can't drift. Low risk; ride the wiring pass.
- [~] **11.Y.8** Drop `(createPlayerSlice as any)` — give `PlayerSlice` the `StateCreator<AppStore,...>` signature like its siblings. Chore.
- [~] **11.Y.9** Skeleton loaders for data screens — pairs with real data + design.
- [~] **11.Y.10** Tests — start with pure logic (`authFlow` mock machine, `authErrorMessage`, store `login/logout`, `useCheckToken` branches). High value before launch.
- [~] **11.Y.11** MMKV encryption / `user` whitelist before real PII persists. Relates to 5.X.10 / 5.X.17.

### Phase 18.2 — Mock server
- [x] **18.2** Custom axios-adapter mock (`EXPO_PUBLIC_API_MODE=mock`): 19 channels, 7-day EPG generator (any date), 20 catch-up, 13 radio, auth step-machine, config. Installed at `_layout` module scope before first render.

---

## Remaining work — `[ ]` / `[~]`

### Phase 14 — Telemetry
- [ ] **14.1** `@sentry/react-native` — init before providers, scrub PII in `beforeSend`.
- [ ] **14.2** `services/analytics.ts` — provider-agnostic `track/identify/screen`, no-op stub v1.
- [ ] **14.3** Settings toggle: "Send anonymous analytics".

### Phase 15 — RTSH Product Features
- [x] **15.1** T&C acceptance — **simplified 2026-06-17:** the `TCGateOverlay` blocking gate + `tcAcceptedAt` flag + `acceptTC` were removed as redundant (acceptance is account-level, enforced once at register; login never re-prompts). Now just the register `acceptTerms` checkbox (zod-required, → wire `termsAccepted`) with an inline `expo-web-browser` link to the T&C URL.
- [ ] **15.2** Geoblocking overlay — 451/geo error → full-screen RTSH-branded overlay + retry. (Restyled `geo` screen built in **22.14**.)
  - **Backend contract (Phase 18.1 `API.md` / 11.X.9 wiring):** geo enforced at the **CDN edge by user IP**, access via backend-issued **signed, short-lived playback URLs** — the client cannot geolocate and must not try. Streams endpoint returns a **typed `451` / `{code:"GEO_BLOCKED"}`** → overlay. Client must **branch a `403` on manifest/AES-key requests**: *expiry* → silently re-fetch the signed URL; *geo* → overlay (ties to the open AES-128 `VideoSource.headers` risk). Region change mid-session is naturally re-checked at the edge on the next signed-URL refresh.
- [x] **15.3** Cellular-data gate — `useCellularGate` confirmation modal.
- [x] **15.4** ~~Mosaic view~~ **REMOVED** (user 2026-06-11, see 22.14f). Feature cut: route/tile/entry-points deleted; periodic snapshot refresh moot. CLAUDE.md mandatory-features list updated.
- [ ] **15.5** Picture-in-Picture + iOS background video (spec-mandated; canonical PIP step).
  - **Goal:** the live/VOD player shrinks into a floating PIP window and keeps playing on background or on a PIP control, gated by `settings.backgroundVideoAllowed`. Built on `expo-video` (SDK 56), no extra dep.
  - **Scope / API (verified vs docs.expo.dev v56 `sdk/video`):**
    1. **Config plugin** (`app.config.ts`, prereq **5.X.13**): `['expo-video', { supportsBackgroundPlayback: true, supportsPictureInPicture: true }]` → iOS adds `audio` to `UIBackgroundModes`; Android sets `android:supportsPictureInPicture`. **Dev-client rebuild required.**
    2. **`VideoView` props** in `VideoPlayer.tsx`: `allowsPictureInPicture` + `startsPictureInPictureAutomatically={settings.backgroundVideoAllowed}`. Guard behind `Video.isPictureInPictureSupported()`.
    3. **Manual control:** PIP row in the player **options sheet** (22.10) calls the **`VideoView` ref**'s `startPictureInPicture()` / `stopPictureInPicture()` (wrap in try/catch) — requires threading the ref out of `VideoPlayer`/`LivePlayer` to the sheet or via an event/store bridge.
    4. **Events:** `onPictureInPictureStart` / `onPictureInPictureStop` → `PlayerSlice` (`isPictureInPicture`).
    5. **Constraint:** one player in PIP at a time — stop PIP before opening another player (radio/ad second instance must not contend).
  - **Settings wiring:** `backgroundVideoAllowed` exists in `SettingsSlice`; expose the toggle in Settings (22.13) and read it for auto-PIP + whether the PIP row shows.
  - **Verify when built:** dev-client rebuild → background mid-playback (auto-PIP) + tap manual PIP; audio+video continue; returning restores fullscreen. iOS + Android.
  - **Depends on:** 5.X.13 (entitlements) + 22.10 (options sheet hosts the control). The 22.10 options sheet already has the `onOpenOptions` seam; PIP row was deferred here.
- [x] **15.6** Foreground refresh — channels + EPG invalidated on app foreground.

### Phase 16 — Ad Infrastructure
- [x] **16.1** `services/ads.ts` — `getAdManifest(slot)` returns the slot's `AdCreative` or null; **server-authoritative** (mock gates on `config.ads.launchEnabled`). Endpoint `ADS_ROUTES.MANIFEST(slot)`, `useAdQuery(slot)`, `fixtures/ads.ts` (NOVA launch creative — static, design `adpop`). Real manifest/targeting → backend.
- [x] **16.2** `AdOverlay` — design `adpop` static image creative + REKLAMË + skip countdown (built in **22.15c**). (Second `expo-video` instance = future video-ad capability, not v1.)
- [x] **16.3** Launch ad — `LaunchAdHost` (mounted above the router in `(app)/_layout`) shows the `launch` creative once per session via `useAdQuery('launch')`. (Pre-demo wiring; `useBootstrap`-prefetch is an optional refinement.)
- [~] **16.4** Channel-switch ad — wired in `channel/[id].tsx` (`useAdQuery({placement:'CHANNEL_CHANGE'})` → `AdOverlay`, `adDone` state). **Preroll gating done:** the content player stays unmounted while the ad is active (`adPending = !!channelAd && !adDone` folded into the player gate → skeleton in the 16:9 slot), so the live stream never autoplays (audio/CDN, or a second VIDEO-ad surface) behind the overlay. **Remaining:** frequency-cap via `playerSlice.adsLastShownAt`.
- [ ] **16.5** Scheduled ads — timer from `/config` triggers `AdOverlay`.
- [ ] **16.6** Analytics: impression, skip, complete, clickthrough.

### Phase 17 — Client-side Hardening
- [ ] **17.1** Secure storage audit — refresh token keychain-only, no tokens in logs/Sentry.
- [ ] **17.2** Accessibility — labels/roles everywhere, contrast, screen-reader flow.
- [ ] **17.3** Performance budget — cold start <2s, TTI <3s mid-Android, scroll >58fps, bundle <25MB.
- [ ] **17.4** i18n completeness — script flags missing keys, fails CI.
- [ ] **17.5** Privacy policy + T&C URLs from `/config` in profile.

### Phase 18 — Backend-readiness Handoff
- [ ] **18.1** `docs/API.md` (OpenAPI) from current services.
- [ ] **18.3** `EXPO_PUBLIC_API_MODE` env switching + dev-menu quick switcher.
- [ ] **18.4** `config/featureFlags.ts` — local + remote from `/config`.

### Phase 21 — Device Testing & Distribution (deferred until feature-complete)
- [ ] **21.1–21.12** Register devices; EAS env vars + source-maps→Sentry; dev/preview builds; EAS Update channels; **iOS** App Store Connect prep → submit → TestFlight/review; **Android** Play prep → 14-day closed testing (≥12 testers) → submit/staged rollout; rejection buffer.

---

## Phase 22 — Design Implementation (active)

> Build order foundation-first (tokens → type → logo → nav → primitives) then per-screen. A screen step is "done" when it matches the HTML on a notched device (light verification = `npx expo run:android`). Albanian copy verbatim from the mockup (22.16). Keep STYLE_GUIDE throughout.

**Done (22.1–22.10) — one-liners; full entries in `plan-archive.md`:**
- [x] **22.1** Token reconciliation — `darkTheme` re-valued to the design; new tokens `surfaceHigh`/`primaryBright`/`mutedDim`/`tabBarBorder` (+ later `primarySoft`/`primaryBorder`), `pill_input:24`/`button:27` radii, `space_18`; light values too. Legacy `pill`/`pill_sm`/`space_15` kept until screens migrate.
- [x] **22.2** Typography → **Inter** — `Fonts` remapped (400–900), `useFonts` loads Inter only, `ReusableText` VARIANTS re-scaled to the design ramp. Anton/Outfit retired (dep removal → 23.4).
- [x] **22.3 / 22.3b** Logo + icon system — `RtshLogoFull` lockup; **`react-native-svg-transformer` + raw `.svg`** under `assets/icons/{Player,TabBar,General,Auth,Brand}/` + barrels; `Icon`/`IconButton` wrappers in `components/Icons/`. (Needs dev-client rebuild + `--clear`.)
- [x] **22.4** Nav restructure — 4-tab shell (Kreu/Guida/Kërko/Profili), `theme/tabBar.ts` config, `expo-blur` frosted bar, active-icon-red/label-white decoupled; `epg`→`guide`, `radio`→`(app)/radio`, `catchup` tab removed.
- [x] **22.5** Shared primitives — `SegmentedToggle`, `SegmentedChoice`, `FilterChipRow`, `SearchBar` (button/input), `Switch`, `Checkbox`, `ListRow`.
- [x] **22.6 / 22.6b** Auth re-skin + domain types — merged `RegisterForm` (RHF+zod, 2-step machine), `AuthHeader`, OTP/reset re-skin, T&C checkbox; `types/domain.ts` rewritten to the design model (`package`/`isLive`/`isAdult`/`geoBlocked`/`thumbnail`, `Hero`/`Continue`/`Subscription`, `QualityId`/`CatchupDay`); fixtures updated. **2026-06-18:** `RegisterForm` gains `CountryPickerInput` + `DatePickerInput` (native pickers); `RadioStation` type removed (consolidated into `Channel`); `PlaybackDecision` + `EpgItem` playback-embed added to `domain.ts`; `Rendition`/`StreamManifest` removed.
- [x] **22.7** Home (Kreu) — `BrandHeader` + mosaic/profile buttons, `SearchBar`, TV/Radio `SegmentedToggle`, `HeroCarousel`, `ContinueRow`, package `FilterChipRow`, 2-col `ChannelCard` grid; new `SceneBackground`/`SectionHeader`; `useHomeFeedQuery`. *(Superseded in part by 22.14f: mosaic button, `ContinueRow` rail and the "Guida" section link removed.)* *(2026-06-17: recomposed to a single `FlashList` — `BrowseControls` (search + toggle) + hero now ride in `ListHeaderComponent` and scroll up with content (non-sticky); native responsive `numColumns`; per-screen `LinearGradient` fades extracted to reusable `EdgeFade` (Layout). See STYLE_GUIDE → Lists & Screen Composition.)*
- [x] **22.8** Guide — `TabHeader` + TV/Radio toggle, `GuideRow` now/next + elapsed-progress from EPG; radio rows = name+genre+LIVE. *(Superseded in part by 22.14f: header → shared `BrandHeader`, toggle moved into the body.)* *(2026-06-17: toggle moved into `ListHeaderComponent` (scrolls with rows), dropped the gratuitous `key={mode}` (column count constant), fade removed.)*
- [x] **22.9** Search — back + live `SearchBar`, channels wrap-grid (`ChannelCard`) + `ProgramRow` programs, recent chips; `useSearch` (300ms debounce, unmount-cleanup); `SearchBar.onSubmit`. *(Superseded in part by 22.14f: header → shared `BrandHeader`, channel results grid → `SearchResultRow` list.)*
- [x] **22.10** Player + EPG + catch-up — portrait inline 16:9 + glass chrome (`PlayerControls` restyle); `DayStrip` (today + 7-back) + EPG/catch-up list (`CatchupBanner`, `ProgramRow` now/recorded/scheduled); `LivePlayer`→inline parent-controlled + screen-owned fullscreen/orientation; native **options + quality sheets** (`getModalScreenOptions`, `SheetOptionRow`) + **Toast** (`ToastSlice`/`ToastHost`); `PlayerSlice.videoQuality`. **ABR:** auto via native player (expo-video read-only tracks, no cap API). **Quality selection wired in 22.14e** (manual = swap source to a child URL; `auto` = master/native ABR; sheet filtered to real renditions). **PIP** deferred to 15.5. **Known gaps:** recorded-row tap passes EPG id vs catch-up id (backend unify); evening demo has no "now" (mock EPG ~06:00–17:35); fullscreen back not safe-area-inset in landscape.

**Remaining (22.11–22.18):**
- [x] **22.11** Radio. Moved the audio engine into a store-driven `RadioAudioHost` (mounted above the router in `(app)/_layout`) so playback survives navigation; routes/mini-player only mutate `PlayerSlice`. New `radio/index.tsx` (catalogue) + `radio/[id].tsx` (player) replace the old combined `radio.tsx`; new `Equalizer`, restyled `StationRow` (design `radio-item`) + `RadioMiniPlayer` (real icons + eq, nav → player); `RadioPlayer` repurposed as the presentational now-playing core. `useRadioStationQuery`, `radio` i18n, `close.svg`. Home/guide radio taps → player. **Gap:** no radio-EPG source → programme section shows only the live-now row. **Background-while-locked still needs 5.X.13 entitlements.** tsc + lint clean. (full entry → plan-archive.md)
- [x] **22.12** Mosaic (`mosaic`). **REMOVED 2026-06-11** — user cut the feature entirely (22.14f): `mosaic.tsx` + `MosaicTile` deleted, Home grid button + route registration + i18n stripped, 15.4 closed. Historical entry below kept for context.
  - **What:** New `MosaicTile` (memoized; `SceneBackground` + red LIVE badge + name-over-scrim, design `.mos`) + `(app)/mosaic.tsx` route (`TabHeader` back + centered "Mozaik", muted subtitle, 2-col `FlashList` of all `useChannelsQuery` channels → `openChannel`). Registered `mosaic` in `(app)/_layout` (default push). Home `home-mosaic-btn` un-disabled → `router.push('/(app)/mosaic')`. New `mosaic.{title,subtitle}` i18n in en/sq.
  - **Why:** spec-mandated mosaic view (15.4) + design screen 14; un-blocks the previously-disabled Home grid button.
  - **Confidence:** route + navigation wired [CERTAIN]; tsc + lint clean [CERTAIN]; visual match to mockup [MEDIUM — would raise to HIGH by `expo run:android` on a notched device].
  - **Trade-offs / known gaps:**
    1. **No 4/6/9 density control.** Design shows a flat 2-col scroll of channels; spec mentions 4/6/9 density. Followed design (decision: design wins on visuals). Raise by: confirming with product whether a density selector is wanted; if so add a `SegmentedChoice` header writing tile count.
    2. **No live snapshots / periodic refresh.** Tiles use static `thumbnailUrl` (no backend snapshot feed). Same gap as `ChannelCard`. Raise by: a snapshot endpoint + `refetchInterval`.
    3. LIVE badge uses `radius_8` (app-wide badge consistency) vs design's 4px — negligible.
  - **Carry-overs:** density-control decision + live-snapshot refresh ride 15.4 / backend wiring. 2-col → wrapped rows widening ride 22.18.
- [x] **22.13** Profile + Settings. Profile restyled to nav-only rows; new Settings route with grouped toggles/sheets; SettingsSlice expanded.
  - **What:** `profile.tsx` rewritten — centered avatar (initials) + name/email + package badge, then `ListRow`s → account/favorites (coming-soon toast), parental/settings (→ settings), logout (confirmation modal). New `settings.tsx` — "Luajtja" (cellular `Switch`, default-quality row → quality sheet w/ `?target=default`, parental `Switch`) + "Aplikacioni" (language row → `language.tsx` sheet, notifications `Switch`, cast disabled-stub `Switch`, theme row → `theme.tsx` sheet, terms → `WebBrowser` `LINKS.TERMS`, version from `expo-constants`). New sheets `language.tsx`/`theme.tsx` (mirror `quality.tsx` + `SheetOptionRow`); `quality.tsx` gained a `target` param (default vs active player). `SettingsSlice` +`defaultQuality`/`notificationsEnabled` (+setters, persisted in partialize); `ParentalSlice` +`clearPin`. Routes registered in `(app)/_layout` (settings push; language/theme/quality as `getModalScreenOptions` sheets). 12 General icons added (shield/wifi/bell/doc/out/cast/quality/info/user + heart). Full `profile`/`settings` i18n in en+sq (verbatim Albanian, key parity verified).
  - **Why:** spec-mandated Settings (CLAUDE.md product features) + design screens 9/10; moves all toggles out of the legacy profile into a dedicated screen; light theme (decision 6) needed a home after leaving profile.
  - **Confidence:** tsc + lint clean, en/sq key parity verified [CERTAIN]; nav graph (profile→settings→sheets, parental set/clear) wired [HIGH]; parental binary-model matches spec/`ParentalSlice` [HIGH]; visual match to mockup [MEDIUM — `expo run:android` on device].
  - **Trade-offs / known gaps:**
    1. ~~**`defaultQuality` has no effect yet**~~ **Resolved in 22.14e** — `channel/[id]` seeds `videoQuality = defaultQuality` on mount and the resolver drives the player source from it.
    2. **Theme row uses `LayersIcon`** (no palette/appearance icon exists). Raise by: adding a dedicated theme icon from the design set; or accept Layers.
    3. **Cast = disabled stub** (out of scope v1) and **notifications = stored flag, no native wiring** (no push setup). Both intentional; wire when those features land.
    4. **Parental age-tiers (7/12/16/18) not implemented** — binary PIN gate only; the design's "12+" is cosmetic. Revisit if product wants per-age gating (would expand `ParentalSlice` + 22.14 gate).
    5. Language/Theme as native sheets (design chev rows didn't specify the sub-UI) — reasonable faithful choice; confirm in 22.17.
  - **Open questions:** none blocking. (Worker subagent stopped mid-step after profile/slices/icons/i18n; director finished settings.tsx + sheets + route wiring + fixed a profile font-family bug where inline `style.fontWeight` bypassed the Inter face → now uses `ReusableText` weight props.)
  - **Carry-overs:** `defaultQuality`→player wiring (gap 1); onboard content (parental + cellular intro) is now covered by Settings, so the deferred `onboard` screen needs no separate build.
- [x] **22.14** Parental + Geo (client). `ParentalPin` restyled to the full-screen design; geo handled **inline** in the channel (no standalone route — user call 2026-06-09); gating wired at the channel seam.
  - **What:** `ParentalPinModal` rewritten to the design `sParental` (back header, big lock-icon tile, title + contextual subtitle, then `ParentalPinPad`); `ParentalPinPad` title made optional + lockout copy → i18n. New `CenteredMessage` primitive (`center-pad`/`big-ic`, Layout barrel). Gating in `channel/[id]`: `channel.geoBlocked` → **inline** `CenteredMessage` (globe + copy + back) in place of player+EPG; `channel.isAdult` → `ParentalPinModal` verify before play, playback blocked until verified (no LivePlayer mount → no audio leak), cancel → `router.back()`. New `parental` + `geo` i18n (en+sq, verbatim Albanian, parity verified).
  - **Why:** spec-mandated (CLAUDE.md geoblocking + parental; 15.2); `channel/[id]` did no gating. Geo as inline state (not a route) per user — block the channel content based on the CDN/stream error rather than navigating to a dead-end screen.
  - **Confidence:** tsc + lint clean, i18n parity verified [CERTAIN]; gate logic correct (no player mount while locked; geo replaces body) [HIGH]; visual match to `sParental`/`sGeo` [MEDIUM — `expo run:android`].
  - **Trade-offs / known gaps:**
    1. **Geo trigger is `channel.geoBlocked` (flag), not the live CDN/stream error.** Real trigger = streams `451/GEO_BLOCKED`; rides 15.2 backend contract + 11.X.9. Raise by: branching `useChannelStreamQuery` error on the typed geo code.
    2. **Open-gate uses channel-level `isAdult`.** Program-level live re-check is 22.14c. Cancel → leave channel (channel-level); the "stay blocked, pick another program" UX is the live-program path (22.14c).
    3. **Verify still keychain-only** (per-account backend sync is 22.14b).
  - **Carry-overs:** 22.14b (backend PIN), 22.14c (live re-check). `CenteredMessage` now available for other empty/blocked states.
- [x] **22.14b** Backend-synced parental PIN (mock-first). PIN is **per-account** → backend is source of truth, keychain is an offline/fast-recheck cache. `ParentalPinModal` set → `POST /users/parental-pin`; verify → backend-authoritative on a fresh device then keychain-cached; clear → `DELETE /users/parental-pin`. `parentalPinSet: boolean` rides the auth/`getMe` response → hydrates `isPinSet` so a fresh device gates. Mock handlers + `fixtures/parental.ts` (stateful) + service + endpoints added. Security rationale: a 4-digit PIN is low-entropy (10⁴) → ship the raw PIN over TLS to a KDF + server-lockout endpoint rather than a crackable hash to new devices. Real KDF/lockout policy is backend-owned (confirm at 11.X.9). (full entry → plan-archive.md)
- [x] **22.14d** Auth-flow hardening (brainstorm 2026-06-10). Three surgical fixes from the auth-flow review:
  - **(1) PIN-gated parental disable.** Turning the gate OFF in Settings now requires entering the current PIN (`ParentalPinModal mode="verify"`) before `clearParentalPin()` + keychain wipe — a child could previously bypass the control by flipping the switch. Replaced the confirmation modal with the verify gate.
  - **(2) Zod at the auth boundary (5.X.2, auth slice).** `userSchema` + `authResponseSchema` (`z.looseObject`, keeps unknown fields, `avatarUrl` nullish) in `types/domain.ts`; `login()` + `refresh()` validate before any token reaches the keychain; register-completion `safeParse`s → `apiError` modal on a malformed payload. A missing/garbage token is now rejected at the boundary instead of silently persisting `undefined`.
  - **(3) `getMe`/`updateProfile` envelope fix.** Users endpoints return `{ user }` (vs the bare auth shape) — both services now unwrap `.user` + validate. This repaired the **manual-wipe recovery path** (`useCheckToken` state-3 → `getMe`), which was handing back the envelope as the user.
  - **Token-model decision (documented, no code):** keep **dual access+refresh** even with always-on sessions — short-lived access JWT (stateless fast-path) + revocable rotating refresh (cold-path). Rationale lives in `ARCHITECTURE.md → Auth flow`.
  - tsc + lint clean. Docs synced (`ARCHITECTURE.md` auth+parental, `CLAUDE.md` parental bullet + persistence table). Real KDF/lockout + endpoint envelope reconcile at 11.X.9.
- [x] **22.14c** Live parental re-check (program-change re-prompt). `useLiveParentalGuard(channelId)` watches **today's** EPG for the channel: derives the airing adult programme from a `nowTs` state timestamp (pure render; no wall-clock read in render — satisfies `react-hooks/purity`), arms **one** `setTimeout` to the next programme edge (+250 ms) that chains boundary→boundary, and re-evaluates on **app-foreground** (`useAppState`, since RN timers throttle backgrounded). On transition into an `isAdult` programme → player unmounts (no A/V leak) + `ParentalPinModal mode="verify"`; success resumes, **cancel stays blocked** with a `CenteredMessage` re-unlock affordance (not a dead end). Resolves **once per `programId`** (verified stays unlocked; the next programme re-locks naturally as the id changes). **Overlap-safe:** scans *all* airing entries so an 18+ slot can't hide behind a clean one. Disabled for already-adult channels (channel-level gate covers them). Local verify via the 22.14b keychain cache (no network per boundary). Mock EPG gains a today-only 18+ test programme (~2 min out) so the re-check is observable in any session. New `parental.live_blocked`/`unlock` i18n (en+sq). Wired into `channel/[id]`. tsc + lint clean, i18n parity verified. **VOD/catch-up** stays a single open-time check (out of scope here). _(Superseded 2026-06-24: `useLiveParentalGuard` renamed to `useParentalGuard(channelId, { isLive, enabled })` — now also gates recorded playback at the tap via `guardPlay`, keyed on the EPG row's `isAdult`, before the stream fetch. See ARCHITECTURE.md → Parental control + update log 2026-06-24.)_
- [x] **22.14e** Adaptive video quality (Auto + manual). Brainstorm 2026-06-11 (`docs/superpowers/specs/2026-06-11-adaptive-quality-design.md`). Wires the quality picker (22.10/22.13 left it inert) into the real player + closes 22.13 gap 1.
  - **What:** New `Rendition` type (`domain.ts`) + `StreamManifest` gains `masterUrl?` + `renditions?` (back-compat; `hlsUrl` stays the always-present fallback). New pure `utils/resolveStreamSource.ts` — `resolveStreamSource(manifest, quality)` (fallback chain: manual→child URL; `auto`→`masterUrl ?? 720p child ?? first ?? hlsUrl`) + `availableQualityIds(manifest)`. `channel/[id]` resolves the player source from `videoQuality`, **seeds `videoQuality` from `defaultQuality` on mount** (closes 22.13 gap 1), and publishes the stream's renditions to `PlayerSlice.availableQualities`. `VideoPlayer` does an in-place `player.replace()` on source change (quality swap survives fullscreen/PiP; last-URI ref skips the redundant initial replace). `quality.tsx` now shows **Auto + only the renditions the stream offers** (default-target still lists all). Mock `/streams` returns the public Mux **master** as `masterUrl` → real native ABR works today.
  - **⚠️ SUPERSEDED (2026-06-18, API reconciliation):** `StreamManifest`/`Rendition` types and `services/streams.ts` + `useStreamQueries.ts` were deleted — the `/streams/channel/{id}` endpoint does not exist. Stream URLs now come from `GET /channels/{id}` as `PlaybackDecisionDTO.streams: Record<string, string>` (`master` + optional fixed-rendition keys `720`/`576`/`360`). `resolveStreamSource`/`availableQualityIds` rewritten for `Record<string, string>`. EPG items embed the same playback fields for programme swaps. `useChannelQuery` renamed `useChannelPlaybackQuery`. See ARCHITECTURE.md 2026-06-18 entry.
  - **Why:** spec-mandated quality picker; expo-video 56.1.2 exposes `availableVideoTracks`/`videoTrack` **read-only** (no cap API), so manual = swap source to a child URL, `auto` = feed the master (native ABR). Forward-compatible: when the backend returns a `masterUrl`, `auto` becomes true ABR with no code change.
  - **Confidence:** tsc + lint clean [CERTAIN]; resolver fallback logic correct [HIGH]; in-place replace + quality-swap UX on a real device [MEDIUM — verify in 22.17 with `expo run`].
  - **Trade-offs / known gaps / VERIFY LATER:**
    1. **Interim `auto` is NOT adaptive** — with 4 separate child URLs and no master, `auto` = fixed **720p** (we will not hand-roll ABR). True ABR needs `masterUrl`. A public master (mock) gives real ABR today; the day backend ships `masterUrl`, it flips automatically. Intentional.
    2. **Manual switch rebuffers** (source swap) on expo-video. For *seamless* manual + true single-master ABR, migrate the live player to **react-native-video** (`selectedVideoTrack`/`maxBitRate`) once master + CDN behavior are known — resolver + sheet stay; only the engine changes.
    3. ~~**Backend contract unconfirmed** — does `/streams` return `masterUrl` / `renditions` / only `hlsUrl`?~~ **RESOLVED (2026-06-18):** `/streams` does not exist. Stream URLs come from `GET /channels/{id}` as `PlaybackDecisionDTO.streams: Record<string, string>`. `docs/API.md → Channels` section added. `StreamManifest`/`Rendition` removed.
    4. **Analytics (per-user bandwidth/consumption) deliberately NOT built** — owned by **CDN access logs** later (billing-grade source of truth). No client heartbeat. Decision 2026-06-11.
    5. AES-128 key-header forwarding still unvalidated on a real RTSH stream (pre-existing TODO, `VideoPlayer`/`LivePlayer`).
- [x] **22.14f** UI consistency pass (user feedback 2026-06-11).
  - **What:** (1) `SCREEN_PADDING = 10` token (`theme/spacing.ts`) — single horizontal-gutter knob applied to `BrandHeader`/`TabHeader`/`BrowseControls`/`SectionHeader`/`FilterChipRow`/`HeroCarousel`/`GuideRow`/`ProgramRow`/`StationRow`/`SearchResultRow` + the home/guide/search/profile/settings/channel screens (was a 15/16/18/20 mix); home grid cells use per-column insets (`cellLeft`/`cellRight`) so the FlashList stays full-bleed and edge cards sit exactly at `SCREEN_PADDING`. (2) Tab-bar icons get `marginBottom: 2` (`tabBarIconStyle`). (3) **Mosaic removed** (route, `MosaicTile`, Home button, i18n, 15.4 closed). (4) **Continue-watching removed end-to-end** (Home rail, `ContinueRow`/`ContinueCard`, `HomeFeed.continueWatching`, `ContinueItem` type, mock fixture, i18n). (5) "Guida" action link dropped from the "Kanalet TV" `SectionHeader`. (6) **Shared header:** all four tabs render `BrandHeader` (`onLogoPress` → Kreu on Guida/Kërko/Profili); guide's TV/Radio toggle and search's input moved below the header mirroring Home's `BrowseControls` position; search channel results render as a `SearchResultRow` list (design `.radio-item`+`.srch-thumb` HTML from user: scene thumb + name/meta + chevron) instead of a grid; Profili's header settings icon removed (Settings reachable via its row). (7) **expo-blur warning fixed:** Android can't satisfy the new `blurTarget` API from `tabBarBackground` (BlurTargetView must wrap the content *behind* the bar, which lives inside the navigator) → platform gate: iOS keeps native `BlurView`, Android renders a near-opaque `colors.tabBarSolid` (new theme token) — explicit version of what the silent `'none'` fallback already did.
  - **Why:** user QA feedback after 22.14e — inconsistent gutters (~20 visual), cramped tab icons, mosaic + continue-watching + Guida link cut, header unification, noisy blur warning.
  - **Confidence:** tsc + lint clean [CERTAIN]; visual result on device [MEDIUM — verify in 22.17 `expo run:android`]; `SearchResultRow` thumb size 78×46 inferred from design HTML without CSS [LOW — confirm against the mockup, trivially tunable].
  - **Trade-offs / known gaps:** modal sheets (`quality`/`language`/`theme`/`player-options`, `SheetOptionRow`) deliberately keep their 20px inner padding — they're floating surfaces, not screen edges. Floating overlays (`RadioMiniPlayer`, `ToastHost`) likewise unchanged. Android tab bar has no real blur until expo-blur's `blurTarget` works with navigator-owned backgrounds (or we wrap the navigator in `BlurTargetView` — undocumented, revisit if design demands it).
- [x] **22.14g** Profile/account/parental fixes (user feedback 2026-06-11).
  - **What:** (1) **Favorites row removed from Profile** (row + `profile.favorites` i18n; feature still backlog via planned `ChannelsSlice`, just no dead "coming soon" entry). (2) **Account details screen** — new `(app)/account.tsx` (read-only `ListRow` list: username/email/age/location/gender), opened from Profile's "Të dhënat e llogarisë" row (was a coming-soon toast). `User` (`domain.ts`) gains optional `username`/`age`/`location`/`gender` (register-time details; `userSchema` deliberately untouched — `looseObject` passes them through, and adding them to the runtime guard would let a `null` break login). Mock `mockUser` seeds them; register mock (`authFlow.ts`) captures step-1 `age`/`location`/`gender` (already in `RegisterStartPayload`) and echoes them on the step-3 user via `buildRegisteredUser`. (3) **Parental PIN pad fix** — `ParentalPinPad` keypad grid used `width:'100%'` inside an auto-width centered parent, which Yoga collapses (keypad rendered collapsed → "no pads" when enabling the gate); container now `alignSelf:'stretch'`. Settings parental row is also tappable (full-row tap = toggle, not just the small `Switch`).
  - **Confidence:** tsc + lint + i18n parity clean [CERTAIN]; keypad-collapse root cause [HIGH — Yoga %-in-auto-parent; verify visually in 22.17]; account fields match register form [CERTAIN].
  - **Gap:** account screen is read-only; editing + real `/users/me` field contract at **11.X.9**.
- [x] **22.14h** Parental PIN model simplified (product decision 2026-06-15, swagger-reconciled). The PIN is **content gating, not a credential**, so it moved off the keychain/KDF design onto the **user object**: `User.parentalPin = { enabled, pin }` (`userDtoSchema` `nullish`), persisted in the MMKV `user` blob.
  - **What:** verify is now a **local string compare** against `user.parentalPin.pin` (no network, no `SHA-256`/keychain); gating keys on `enabled` (`needsPin`/`useLiveParentalGuard` AND-in `parentalEnabled`; Settings/Profile read `!!user.parentalPin.enabled`). Setup → `POST /parental { pin }` then `updateUserSlice` mirrors `{ enabled:true, pin }` onto the user. Removed: `verifyParentalPin`/`clearParentalPin` services, `PARENTAL_PIN`/`PARENTAL_PIN_VERIFY` endpoints (→ `PARENTAL: '/parental'`), `ParentalSlice.isPinSet`/`setIsPinSet`/`clearPin` + its `partialize` entry, `PARENTAL_PIN_KEY`, keychain caching in the modal. Mock `fixtures/parental.ts` + handler rewritten to the `{ enabled, pin }` shape on a single `POST /parental`. New `UserSlice.updateUserSlice` partial setter.
  - **Why:** a 4–6 digit PIN that only blocks adult-flagged content isn't a real secret (threat model = curious child on a shared device); carrying it on the user object satisfies the cross-device requirement with far less machinery. Persistence-boundary invariant amended to allow `pin` as a documented plaintext exception.
  - ~~**v1 = setup only.** Settings switch locks once enabled.~~ **Superseded by 11.X.13 (2026-06-15):** disable/toggle wired via `PATCH /parental { enabled }` (local PIN verify before disable, no `currentPin`); switch no longer locks. Change-PIN / forgot-PIN still deferred.
  - tsc + lint clean. Docs synced (`ARCHITECTURE.md` parental+persistence+log, `CLAUDE.md` storage/slice/feature, `docs/API.md` parental contract). **Backend ask:** add `parentalPin: { enabled, pin } | null` to `UserDTO` on login/register-verify/`getMe`; ~~drop `maxAllowedAge` from `POST /parental`~~ (kept optional, unused client-side — 11.X.13).
  - **Follow-up:** ~~wire disable~~ (done, 11.X.13) + change-PIN (`PATCH /parental` + `newPin`) and a forgot-PIN reset flow. (Orphaned `utils/crypto.ts` removed.)
- [~] **22.15** Overlays. **Done:** (a) native route sheets — `getModalScreenOptions` (`presentation:'formSheet'` + `sheetAllowedDetents:'fitToContents'` + grabber + corner) + `SheetOptionRow` (22.10) ✅; (b) `Toast` — `ToastSlice` + root `ToastHost` (22.10) ✅; (c) **`AdOverlay` component** (design `adpop`) ✅ — `components/Media/AdOverlay.tsx`: centered 3:4 creative card (brand row + tag/headline/subtitle + white CTA over creative art or a brand-dark surface), top-right `REKLAMË` label, bottom-right skip control with a mount-anchored countdown (`useSkipCountdown` — timestamp-derived, lint-pure) that flips to a red, tappable "skip" at 0. Prop-driven (`AdCreative` + `AdSlot` types in `domain.ts`); CTA → `onClickthrough` or in-app browser; `onComplete` on skip. New `ads` i18n (en+sq). **v1 creative is static** (image/brand surface) — the CLAUDE.md "second expo-video instance" is a later video-ad capability, not v1 (design wins). tsc + lint + i18n parity clean. **Remaining:** the **slot orchestration** — launch (16.3, in `useBootstrap`), channel-switch frequency-capped via `playerSlice.adsLastShownAt` (16.4), scheduled from `/config` (16.5), + `getAdManifest` service (16.1) + analytics (16.6) — all **Phase 16**; (d) SOLITAR in-sheet scaffold (SafeAreaView → keyboard → header → content) — **deferred, no keyboard-bearing sheet exists yet**; (e) native-sheet scrim/dimming polish — minor, deferred. Alerts stay on `ModalSlice`/`ModalWrapper`.
- [x] **22.15f** Skeleton loading strategy (user 2026-06-12).
  - **What:** new `Skeleton` primitive (`Layout/Skeleton.tsx`, Reanimated opacity pulse on `colors.skeleton`) + per-row siblings `ChannelCardSkeleton` / `StationRowSkeleton` / `GuideRowSkeleton` / `ProgramRowSkeleton` mirroring real-row footprints. Data screens no longer block on `FullScreenLoader`: Home (hero + grid + radio list via `ListEmptyComponent` / `HeroCarousel isLoading`), Guide (8 skeleton rows), Radio list (`AnimatedFlashList` gained `skeletonComponent`), Radio player (header + art/text skeleton body), and **channel/[id]** — route renders instantly, the player slot holds a `Skeleton` until `stream` **and** `channel` queries resolve (`mediaPending`), EPG list shows `ProgramRowSkeleton`s. Strategy codified in STYLE_GUIDE → "Loading States — Skeleton Strategy" (+ avoid-table row).
  - **Why:** tapping a channel showed a blocking full-screen spinner before the player screen appeared; user wants instant navigation with per-region skeletons as the app-wide loading convention.
  - **Confidence:** tsc + lint clean on all touched files [CERTAIN]; player mount gated on `streamLoading || channelLoading` so adult/geo gates can't flash gated content [HIGH]; visual fidelity of skeleton footprints on device [MEDIUM — verify in 22.17 `expo run:android`].
  - **Trade-offs / known gaps:** `program/[id]` (pure full-screen VOD player) keeps `FullScreenLoader` by design — documented as the player-surface exception; Search filters cached queries client-side, no skeleton needed. Pre-existing lint errors in `useBlurAndUnMount.ts` (import sort + ref-write-in-render) are untouched/out of scope — flag to user.
- [x] **22.15g** Mock latency + screen transitions (user 2026-06-12, follow-up to 22.15f).
  - **What:** data mock handlers (`/home`, `/channels`, `/channels/:id`, `/streams/*`, `/radio`, `/radio/:id`, `/catchup/:id`) gained realistic `delay`s (300–600ms) — they responded synchronously, so `isLoading` lasted ~1 frame and the 22.15f skeletons never rendered in mock mode. Transitions: `(app)` Stack default `animation: 'slide_from_right'` (matches the auth stack; covers settings/account/radio routes), player modals `channel/[id]` + `program/[id]` switched `fade` → `slide_from_bottom`. STYLE_GUIDE → Navigation updated.
  - **Why:** user reported skeletons never visible (root cause: zero mock latency, not the skeleton code) and asked for visible screen-transition animations.
  - **Confidence:** root cause (instant mock responses) [HIGH — delays exist on auth/EPG routes and those states were visible]; skeletons now visible on device [MEDIUM — verify visually; delays are mock-only so prod behavior depends on real API latency]; transition choice (`slide_from_bottom` for players) is a design call, trivially revertible to `fade`.
- [x] **22.16** i18n sq copy. Lift exact Albanian strings from the mockup into `sq.json` (+ `en.json` parallels) for every screen; replace remaining hardcoded strings.
  - **What:** Corrected 4 existing keys to match mockup exactly (`auth.login.remember_me`, `forgot_password`, `sign_up`, `settings.notifications.subtitle`). Added 6 new namespaces/sub-keys: `nav` (tab labels), `onboard` (11 keys for the initial-setup screen), `settings.default_quality`, `settings.cast`, `datetime.day_names` (7 day abbreviations), `search.all_channels`, `profile.account.subtitle_alt`, `empty` (channels/epg/catchup empty states + retry). Wired `t()` in `EmptyChannelsState`, `EmptyEpgState`, `EmptyCatchupState` (were hardcoded English), and `PlayerControls` (LIVE tag). All other screens were already fully i18n'd.
  - **Why:** Design mandate — all user-visible copy must come from i18n so the Albanian UI is exact-match to the mockup and the EN fallback is always defined.
  - **Confidence:** 259 keys, perfect sq/en parity (node parse verified) [CERTAIN]; tsc clean [CERTAIN]; hardcoded-string sweep across all 16 candidate files [HIGH — read each file; only the 4 listed had remaining literals; others were already wired].
  - **Trade-offs / known gaps:** `nav.*` and `onboard.*` keys are seeded but no source files consume them yet — the tab bar uses hardcoded strings in `theme/tabBar.ts` and the onboard screen is still pending. These keys are ready; the wiring lands when those screens are built/confirmed.
  - **Carry-overs:** Wire `onboard.*` when the onboard screen is finalized. `nav.*` already wired into `(tabs)/_layout.tsx` tab titles in this step.
- [ ] **22.17** QA + verification pass. `npx expo run:android` (+ iOS), notched safe-area on every screen, walk the mockup `go()` graph (login→ad→home; channel→ad→player; lock→PIN; geo→overlay; day→catch-up; home-toggle→radio), `lint` + `tsc` clean. Promote per-screen [MEDIUM] visual claims to [CERTAIN].
- [~] **22.18** Tablet / iPad / **TV** large-screen pass (decisions 8 + TV scope). **Deferred until mobile (22.1–22.17) is complete + approved.** *Foundation landed 2026-06-18:* the portable **`@/responsive`** module (device-class + orientation grid columns via shortest-side classifier, `scaled()` per-class token step) is in place and wired to the Home grid + `FONTSIZE`/`SPACING`/control tokens. **Remaining for this step:** content max-width clamps, hero/player width on large screens, the other screens' layouts, on-device tuning of `GRID_COLUMNS`/`UI_SCALE`, and **TV** focus/D-pad nav + 10-foot spacing (its own sub-pass after tablet). ~~Mosaic density (4/6/9)~~ — moot, mosaic cut 2026-06-11 (22.14f). Build mobile first, then widen.
  - **Orientation scope — decided 2026-06-10 (the rule to execute):** browsing UI is **portrait-locked on ALL touch devices** (phone *and* tablet *and* iPad); the **only** landscape surface is the **fullscreen player** (live/VOD). Industry standard (Netflix/Disney+/YouTube): lists/tab-bar/cards are designed for a tall viewport and look broken forced into landscape. So the responsive pass is *scale the portrait layout up* for bigger screens (wider margins, larger type, 3-up grids) — **not** design new landscape browse layouts. Accepted trade: a portrait-locked iPad held sideways shows letterboxing / blown-up phone UI.
  - **TV is the explicit exception:** a TV is a fixed-landscape display with **no portrait/rotation** — so the *entire* TV browse UI is landscape by definition and needs **D-pad/focus navigation**. TV is therefore a **separate build target** (not a variation of the phone rule): always-landscape layout + focus engine, built after the tablet/iPad sub-pass.
  - **Implementation seam:** `useOrientation` (5.5) + `expo-screen-orientation` already exist — lock app to portrait, unlock→landscape only on player fullscreen enter, re-lock on exit (the player already owns fullscreen/orientation per 22.10). Per-target matrix: **Phone** portrait browse / landscape player · **Tablet+iPad** portrait browse (scaled up) / landscape player · **TV** always-landscape browse + D-pad / native-landscape player.
- [x] **22.X** Device info out of headers; registration → mutation on Home; `deviceClass` → playback query param (user decision 2026-06-23, **marked temporary**). Supersedes 11.X.10 / 11.X.11 (see their inline notes).
  - **What:** (1) **Deleted the request-header stamp** — `buildDeviceHeaders`, `getDevicePlatform`, `DEVICE_HEADERS` removed from `utils/device.ts`; `X-Device-Id`/`X-Device-Platform`/`X-App-Version` are no longer sent (`Authorization` + `Accept-Language` remain). (2) **`useDeviceIdentity` moved** from `(app)/_layout.tsx` to the **Home screen** (`(tabs)/index.tsx`) and rewritten to fire **`useRegisterDeviceMutation`** (new mutation hook) once on mount — replaced the hand-rolled `useEffect`/`try-catch`. (3) **`SILENT_ERROR`** meta added to `client.ts` (fully suppresses the global `apiError` modal at any status; the existing `INLINE_CLIENT_ERROR` only mutes 4xx) — used by the registration mutation since a metadata PUT failing is non-actionable. (4) **`DeviceClass` (`MOBILE|TV|STB`)** type + `getDeviceClass()` (derived from `getDeviceType()` via an exhaustive `Record`) → sent as a **`deviceClass` query param** on `getChannelById` (`GET /channels/{id}`) + `getCatchupPlayback` (`GET /channels/{channelId}/epg/{programId}`) so the backend serves a platform-specific player URL. **Not** added to the `DeviceRegistration` body (user call). `getOrCreateDeviceId`, `openStoreListing`, 426 modal, `GET /app/version` untouched.
  - **Why:** user wants device info off the headers for now. `deviceClass` rides the **playback request** (the URL driver), not the registry — stateless, and immune to multi-device ambiguity (one account, phone + TV) + the fire-and-forget registration race.
  - **⚠️ Divergence from requirements (backend header spec 11.X.10, 2026-06-11):** that spec mandated `X-Device-Id`/`X-Device-Platform`/`X-App-Version` on **every** call (concurrency limits, ABR selection, force-update gate). We now send **none**. Consequences: **426 version gate can't compare per-request** (no `X-App-Version`; `appVersion` still in the registration body if backend keys off it); **no per-request device correlation** (only `deviceKey` in the body + `deviceClass` on playback). Full divergence note in `ARCHITECTURE.md → Device identity → Divergence from the header spec`. Revisit when the backend contract is finalized.
  - **Confidence:** tsc + lint clean [CERTAIN]; `deviceClass` derivation correct [CERTAIN — exhaustive `Record` over `DeviceType`]; backend accepts `deviceClass` as the query-param key [LOW — unconfirmed; one-line change otherwise]; 426 gate impact acceptable "for the moment" [MEDIUM — confirm with backend whether a per-request version gate is still required].
  - **Docs synced:** `ARCHITECTURE.md` (Device identity section rewritten + Divergence subsection + log), `docs/API.md` (headers table, PUT trigger, `deviceClass` on both playback endpoints), `CLAUDE.md` (networking bullet + `APP_PLATFORM` ref).

---

## Phase 22 — Design inventory & mapping (build-ready reference)

> Source: `.claude/docs/rtsh-tani-mobile.html`. Maps each design screen/icon/component/input/flow/data-shape to our codebase — **EXISTS** (reuse) · **RESTYLE** (re-skin) · **NEW** (build) — with the owning step.

### A. Screen → route map

| # | Design screen (sq) | Our route | Status | Step |
|---|---|---|---|---|
| 1 | Splash | `BrandedSplash` in `_layout` | EXISTS | 22.3 |
| 2 | Login | `(auth)/login` | RESTYLE | 22.6 |
| 3 | Register | `(auth)/register` | RESTYLE | 22.6 |
| 4 | Terms | checkbox on register (+ inline web-browser link; `TCGateOverlay` removed 2026-06-17) | DONE | 22.6 |
| 5 | Onboard | folded into Settings | — | 22.13 |
| 6 | Home (Kreu) | `(app)/(tabs)/index` | DONE | 22.7 |
| 7 | Guide (Guida) | `(app)/(tabs)/guide` | DONE | 22.8 |
| 8 | Search (Kërko) | `(app)/(tabs)/search` | DONE | 22.9 |
| 9 | Profile | `(app)/(tabs)/profile` | DONE | 22.13 |
| 10 | Settings | `(app)/settings` | DONE | 22.13 |
| 11 | Player + EPG + catch-up | `(app)/channel/[id]` | DONE | 22.10 |
| 12 | Radio list | `(app)/radio` | NEW | 22.11 |
| 13 | Radio player | `(app)/radio/[id]` | RESTYLE | 22.11 |
| 14 | Mosaic | ~~`(app)/mosaic`~~ | REMOVED (22.14f) | 22.12 |
| 15 | Parental (PIN) | `ParentalPinModal` gate | DONE | 22.14 |
| 16 | Geo-block | inline in `channel/[id]` (`CenteredMessage`) | DONE | 22.14 |

### B. Icon inventory
- **EXISTS:** `user`→Profile · `search`→Search · `mail`→Mail · `key`→Key · `back`→ChevronLeft · `play`→Play · `pause`→Pause · `full`→Fullscreen · `chev`→ChevronRight · `settings`→Settings · `home`→Home · `clock`→Clock · `lang`→Language · `check`→Check · `grid`/`lock`/`globe`/`radio`/`guide` (added in 22.4/22.7).
- **NEW (per screen as used):** `shield` (parental) · `wifi` (cellular) · `bell` · `doc` (terms) · `out` (logout) · `tv` · `pkg` · `quality` · `info` · `heart` (favorites) · `cast` · `arrow` (ad CTA). Outline/stroke style to match design.

### C. Component inventory (design widget → our component)

| Design widget | Our component | Status | Step |
|---|---|---|---|
| `logo` lockup | `RtshLogoFull` (+ `RtshLogo` mark) | DONE | 22.3 |
| `hdr` | `BrandHeader` / `TabHeader` / `AuthHeader` | DONE | 22.3/22.4/22.6 |
| `pfp`/`iconbtn` | `IconButton` | DONE | 22.5 |
| `searchbar` | `SearchBar` | DONE | 22.5 |
| `toggle2` | `SegmentedToggle` | DONE | 22.5 |
| `chip`/`chiprow` | `FilterChipRow` | DONE | 22.5 |
| `btn-red`/`btn-ghost` | `ReusableBtn` | DONE | 22.5 |
| `hero`+`dots` | `HeroCarousel` | DONE | 22.7 |
| `hcard`+`pgbar` | `ContinueRow`/`ContinueCard` | DONE | 22.7 |
| `card`+`clogo`+`tagchip`+`nm` | `ChannelCard` | DONE | 22.7 |
| `scene`+scrim | `SceneBackground` | DONE | 22.7 |
| `sec-h` | `SectionHeader` | DONE | 22.7 |
| `bottomnav` | `theme/tabBar.ts` + `(tabs)/_layout` | DONE | 22.4 |
| `video`/`top`/`ttl`/`ctrl`/`track`+`knob`/`livetag` | `VideoPlayer`/`LivePlayer`/`PlayerControls` | DONE | 22.10 |
| `daystrip`/`day` | `DayStrip` | DONE | 22.10 |
| `cubanner` | `CatchupBanner` | DONE | 22.10 |
| `prog` | `ProgramRow` | DONE | 22.9/22.10 |
| `gitem` (now/next) | `GuideRow` | DONE | 22.8 |
| `list-item`+`tg` | `ListRow` + `Switch` | DONE | 22.5/22.13 |
| `seg-choice` | `SegmentedChoice` | DONE | 22.5 |
| `check`/`cbox` | `Checkbox` | DONE | 22.5 |
| `sheet`/`opt-row` | `(app)` sheet routes + `getModalScreenOptions` + `SheetOptionRow` | DONE | 22.10/22.15 |
| `toast` | `Toast` (`ToastSlice`/`ToastHost`) | DONE | 22.10/22.15 |
| `center-pad`/`big-ic` | `CenteredMessage` (geo/parental) | DONE | 22.14 |
| `pin`/`keypad` | `ParentalPinModal`/`ParentalPinPad` | DONE | 22.14 |
| `mos-grid`/`mos` | ~~`MosaicTile` + grid~~ | REMOVED (22.14f) | 22.12 |
| `srch-thumb` | `SearchResultRow` | DONE | 22.14f |
| `rp-art`/`eq` | `RadioPlayer` art + `Equalizer` | RESTYLE/NEW | 22.11 |
| `radio-item` | `StationRow` | RESTYLE | 22.11 |
| `adpop`/`ad-*` | `AdOverlay` | DONE (component; slots → Ph16) | 22.15 |
| mini-player dock | `RadioMiniPlayer` | RESTYLE | 22.11 |

### D. Inputs / controls
`pill-input` → `ReusableInput` pill · `inp` (labeled) → `ReusableInput` labeled · `select.inp` → option sheet (not a native `<select>`) · `check` → `Checkbox` · `seg-choice` → `SegmentedChoice` · `tg` → `Switch` · `keypad` → `ParentalPinPad` · `track`+`knob` → player seek. RHF + zod for forms.

### E. Flow graph (mockup `go()`)
- **Boot:** splash → login (ours: `BrandedSplash` until bootstrap → guard routes).
- **Login** `Hyr` → ad(app-open) → home · register link.
- **Register** → terms (checkbox) → onboard(→Settings) → ad → home.
- **Home:** search→search · ~~grid→mosaic~~ (cut 22.14f) · user→profile · TV/Radio toggle · channel tap→`openChannel`.
- **openChannel:** `lock`→PIN→ad→player · `geo`→geo · else→ad→player.
- **Player:** back→home · settings→options sheet · day-strip today=EPG/live, past=catch-up · quality sheet→toast.
- **Guide:** TV/Radio toggle · row→player/radio. **Profile**→settings; logout→login.
- **Ad:** 5s countdown, skip ~4s. Slots app-open + channel-open (frequency-capped) → Phase 16 + 22.15.

### F. Data shapes — reconciled in 22.6b (`types/domain.ts`)
`CH`→`Channel` (package + isLive + isAdult + geoBlocked + thumbnail) · `PKGS`→package filter · `RADIO`→`RadioStation` (+kbps/artwork) · `DAYS`→`CatchupDay` · `EPG`→`EpgItem` (+isLive) · `QUAL`→`QualityOption`/`QualityId` · gradients `g1–g6` → real `logoUrl`/poster, gradient fallback. Hero/Continue/Subscription added (design-inferred — validate vs backend).

---

## Phase 23 — Role-model quality gate (final audit)

> **Goal (user 2026-06-06):** a reference-grade Expo project other teams copy — excellent structure, dynamic/reusable components + helpers, clean self-explanatory code, clear flow. These standards **guide every Phase 22 step as built**; this phase is the formal sign-off. Run after 22.1–22.18 + feature phases (15/16).

- [~] **23.1** Structure — one responsibility/file; folders match STYLE_GUIDE; JSDoc'd barrels (component/hook only); zero `../../`; `utils/` bucketed once ≥3 files.
- [~] **23.2** Reusable/dynamic — prop-driven variants + defaults, theme-tokened (no hardcoded colors/sizes/radii/spacing), portable (no store coupling in shared primitives); varying config in `theme/`/config modules.
- [~] **23.3** Functions/helpers — pure, single-responsibility, typed, colocated, unit-tested for non-trivial ones; no business logic stuck in components.
- [~] **23.4** Clean code — JSDoc (the *why*) on non-trivial files; intention-revealing names; no `console.log`/`any`/magic numbers/dead code; `tsc` strict zero errors, `expo lint` zero warnings. Includes removing unused `@expo-google-fonts/anton` + `Outfit-*.ttf` (from 22.2) and any decision-9 unused auth forms.
- [~] **23.5** Flow & docs current — CLAUDE.md + `rules/ARCHITECTURE.md` (auth/theme/boot/network/nav/modals/player/ads/**localization**) + STYLE_GUIDE match shipped code; README current; no stale plan markers.
- [~] **23.6** Type safety — TS strict; Zod (or typed `http()`) at every API boundary (11.Y.4/5.X.2); discriminated unions over enums; precise `XProps`; no un-narrowed `unknown`.
- [~] **23.7** Performance — `FlashList` for long lists; `React.memo`+`displayName` only where it pays; stable callbacks; `expo-image`; selector subscriptions; reanimated on UI thread.
- [~] **23.8** Consistency & a11y — one pattern per concern; `testID` on interactive leaves; a11y labels/roles; RTL-safe; light+dark; safe-area on notch+tablet.
- [~] **23.9** Verification gate — `lint` + `tsc` + tests green; `expo-doctor` clean; cold-boot + full `go()`-graph on iOS+Android device; no red-box. Promote Phase 22 [MEDIUM] visual claims to [CERTAIN].

---

## Phase 24 — Store readiness & submission (App Store + Play Store)

> **Goal (user 2026-06-10):** after mobile QA (22.17), the large-screen pass (22.18), and backend wiring (11.X.9), do a final cross-cut so the app is **submittable** to both stores. This phase is the publishing checklist + compliance work that has **code/asset consequences** (privacy manifests, data-safety forms, content rating, account deletion, age gate) — start accruing takeaways here *as we hit them*, don't discover them at upload. Runs alongside / after Phase 21 (the EAS build + submit mechanics); 24 is the *requirements*, 21 is the *pipeline*.

**Apple — App Store**
- [ ] **24.1** **Privacy manifest** — `PrivacyInfo.xcprivacy` declaring data types collected (email, displayName, subscription tier, any analytics) + **required-reason APIs** (UserDefaults/MMKV file timestamp, keychain). Expo: config-plugin or manual; verify in the prebuild output.
- [ ] **24.2** **App Privacy "nutrition label"** in App Store Connect — must match 24.1 + actual backend collection. Tie to the real `/config` + analytics decision (Phase 14).
- [ ] **24.3** **ATT (App Tracking Transparency)** — only if analytics/ads do cross-app tracking. v1 ads are first-party static creatives → likely **no IDFA / no ATT prompt**; confirm when ad targeting is defined (Phase 16). Document the "no tracking" stance either way.
- [ ] **24.4** **Account deletion (mandatory)** — Apple requires in-app account deletion for any app with account creation. Needs a backend `DELETE /users/me` + a Profile/Settings entry. **Has code consequences** — surface early.
- [ ] **24.5** **Age rating / content** — the 18+ parental content drives the questionnaire; ensure the parental gate is demonstrable to review (App Review will test it). Provide a **demo account** + note the PIN flow in review notes.
- [ ] **24.6** **Sign in / data minimization, export-compliance (uses HTTPS → encryption declaration), 3rd-party SDK disclosures** (Sentry), and required marketing assets (icon, screenshots per device class — incl. iPad if we ship iPad, TV if we ship tvOS later).

**Google — Play Store**
- [ ] **24.7** **Data safety form** — Play's equivalent of 24.2; must match actual collection. Keep one source-of-truth data inventory feeding both 24.2 + 24.7.
- [ ] **24.8** **Content rating (IARC questionnaire)** — driven by the 18+ content; gate must be present.
- [ ] **24.9** **Account deletion** — Play also requires a deletion path **and** a public web URL to request deletion (not just in-app). Pairs with 24.4.
- [ ] **24.10** **Target API level + 16KB page size + foreground-service declaration** — RN 0.85/SDK 56 should satisfy target API; the **radio foreground service** (5.X.13) needs a Play **foreground-service-type justification** + privacy-policy mention.
- [ ] **24.11** **Closed testing requirement** — new personal Play accounts need **14-day / ≥12-tester** closed testing before production (already noted in 21). Sequence this early — it's a 2-week wall-clock gate.

**Cross-cutting**
- [ ] **24.12** **Privacy policy + Terms URLs** — public, reachable, wired from `/config` into Profile (overlaps 17.5 / 15.1). Both stores require a privacy-policy URL.
- [ ] **24.13** **Single data-inventory doc** (`docs/PRIVACY.md`) — what we collect / why / where stored / retention — the source feeding 24.1/24.2/24.7. Write once, reuse in both consoles.
- [ ] **24.14** **Demo/review credentials + reviewer notes** — mock-free build pointing at staging, a test account, and notes explaining the parental PIN, geo overlay, and any region-locked content so reviewers aren't blocked.

> **Key takeaway for a future session:** the items with *code/asset consequences* (24.1 privacy manifest, 24.4/24.9 account deletion, 24.5/24.8 age gate, 24.10 foreground-service justification, 24.12 policy URLs) must be resolved **before** the final builds in Phase 21 — discovering them at upload re-opens feature phases. Treat 24.13 (data inventory) as the first task; everything else references it.

---

## Reference
- Archive (full done-step history): `.claude/docs/plan-archive.md`
- Style guide: `.claude/rules/STYLE_GUIDE.md` · Architecture: `.claude/rules/ARCHITECTURE.md`
- Project memory: `.claude/memory/` · Design mockup: `.claude/docs/rtsh-tani-mobile.html`
- Original spec: `../assets/4._DST_-_OTT.docx`
