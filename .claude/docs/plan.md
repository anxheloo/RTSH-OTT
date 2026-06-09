# plan.md — RTSH-OTT Build Plan

> **Lean plan.** Forward-looking work (`[ ]` / `[~]`) is kept in full so a future session can execute without re-deriving; completed steps (`[x]`) are compressed to one-liners. The **full verbose history** of every completed step (What/Why/Confidence/Trade-offs/Carry-overs) lives in **`plan-archive.md`** (frozen snapshot @ 2026-06-09, commit `7c40f5a`).
> **Testing:** `npx expo run:android` throughout. EAS cloud builds, device registration, and store submission → Phase 21.
> **Entry format** (`anxheloo-task-plan-executor`): `[x]` done · `[~]` deferred/partial · `[ ]` not started. A new `[x]` → one-liner here + full entry appended to `plan-archive.md`. A new `[~]`/`[ ]` → full **What/Why** or **Deferred-because / What-we-need / Approach**.

---

## Status snapshot — 2026-06-09

- **Done:** Phases 0–13 (tooling → store → API → hooks → UI → players → screens → auth-hardening → i18n), 18.2 (mock server), auth wizard (11.X), review fixes (11.Y "done now"), and **Phase 22.1–22.10** (design tokens/type/logo/icons, 4-tab nav, primitives, auth re-skin, domain types, Home, Guide, Search, Player+EPG+catch-up, sheet+Toast infra).
- **Active:** **Phase 22** — next is **22.11 Radio**.
- **Backlog:** deferred audit/infra items (`5.X.*`, `11.Y.4–11`), Telemetry (14), product features (15.2 geo / 15.4 mosaic / 15.5 PIP), Ads (16), Hardening (17), Handoff (18), Distribution (21), Quality gate (23). Remaining Phase 22 screens: 22.11–22.18.

---

## Design context — Phase 22 (source of truth)

> Designer delivered a full interactive HTML mockup (`.claude/docs/rtsh-tani-mobile.html`, 16 screens + overlays, Albanian copy, real RTSH logo lockup as vector). Directive: **design wins on visuals**; **keep our architecture** (Expo Router, single Zustand store, TanStack/axios, STYLE_GUIDE).

### Design facts

- **Palette (dark, flat):** bg `#000` on page `#0d0d10`; surfaces `--surf #141417` / `--surf-2 #1B1B20` / `--surf-3 #26262C`; border `--line #2A2A31`; text `#fff`; muted `--mut #9A9AA2` / `--mut-2 #6E6E77`; brand `--red #EB122F` (+ `--red-2 #ff3a52`). Header **transparent black**; bottom nav **translucent black + blur** (`rgba(10,10,12,.92)`), hairline top, active icon red, label white.
- **Type:** **Inter** (400–900). Headings 800–900, section/player title 700, labels/links/buttons 600. Sizes: 25 (welcome), 20–23 (h2), 17 (header/section), 15 (body/input), 14 (label), 13–13.5 (sub), 12–12.5 (meta), 10–11 (kicker/tag).
- **Radii:** pill inputs/search/toggle 24; buttons 27 (capsule h54); cards 14; inputs 14; list-icons 11–12; sheet 24 top.
- **Logo:** full lockup as vector (red mark `#EB122F` + "RADIO TELEVIZIONI SHQIPTAR" tagline recolored white). Header 25px, splash 52px.
- **Nav (4 tabs):** `Kreu` · `Guida` · `Kërko` · `Profili`. Radio = Home toggle (+ radio routes), not a tab. Catch-up folded into the Player day-strip. Mosaic opens from a Home header icon.
- **16 screens:** splash, login, register, terms, onboard, home, guide, search, profile, settings, player(+EPG+catch-up), radio-list, radio-player, mosaic, parental(PIN), geo-block. **Overlays:** bottom sheet (options/quality), ad popup, toast.

### Decisions (design-wins)

1. **Outfit → Inter.** [HIGH] Inter-only; Anton/Outfit retired; keep `Fonts` token API.
2. **Config-driven `<Tabs>` + theme-folder `TabBar` object** (base on SOLITAR's `theme/tabBar.ts`; not NativeTabs, not a hand-rolled render prop). [HIGH] Static color-agnostic `TabBar` in `theme/`; colors injected at the layout. RTSH improvements: (a) `expo-blur` translucent bar; (b) decouple active **icon** tint (red, off `focused`) from **label** tint (white via `tabBarActiveTintColor`); (c) flat hairline top. Keep `headerShown:false`.
3. **Tabs 5 → 4**, fold radio→home-toggle + catch-up→player-day-strip. [HIGH] Data layers (services/queries) stay; only the UI host moves.
4. **Full logo lockup** (mark + white tagline) from the design vector. [HIGH] Supersedes the earlier mark-only choice (mark stays available).
5. **Darken surface palette** to design tokens. [HIGH] Header transparent; re-validates 5.X.6/5.X.7/5.X.8.
6. **Dark default + light theme retained** as a feature. [HIGH] Every new token gets a light value too.
7. **Sheets: native, route-based — NOT `@gorhom`.** [HIGH] One shared typed `getModalScreenOptions({ detents, cornerRadius })`, detents tuned per sheet, in-sheet scaffold `SafeAreaView → keyboard → header → content`, alerts stay on `ModalSlice`/`ModalWrapper`. (Implemented in 22.10/22.15: settled on `presentation:'formSheet'` cross-platform per expo-router v56 docs.)
8. **Mobile-first, responsive later.** [HIGH] Grids 2-col on phones → `flexWrap` rows on tablet via `useWindowDimensions` (22.18). Applies to channel grid (22.7) + mosaic (22.12).
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
- [ ] **5.6** `useKeyboard` — superseded by `react-native-keyboard-controller` + `KeyboardProvider` (11.X.0). Close or repurpose if a custom keyboard hook is ever needed.

### Phase 5.X — Audit follow-ups
**Done:** [x] **5.X.1** domain types + services retyped · [x] **5.X.3** TanStack query hooks (channels/epg/catchup/radio/streams) + screens wired · [x] **5.X.6** semantic color tokens · [x] **5.X.7** `SHADOWS`/`OPACITY`/`Z_INDEX`/`ANIMATION` + `BORDERRADIUS` expanded · [x] **5.X.8** spacing reconciliation · [x] **5.X.11** iOS keychain accessibility · [x] **5.X.14** OTA channel explicit in `app.config.ts` · [x] **5.X.15** parental PIN (done in 12.2).

**Deferred (forward backlog):**
- [~] **5.X.2** Zod schemas at the API boundary (auth + streams first). Unblocks when real contract lands; relates to 11.Y.4.
- [~] **5.X.4** Per-call timeout overrides (`streamClient` 5s for manifests; longer for bulk EPG).
- [~] **5.X.5** `useCheckToken` rich result `{ authenticated, reason }` so UI can tell "no session" from "network error" (also resolves the 8.2 guard limbo).
- [~] **5.X.9** Decide `predictiveBackGestureEnabled` on Android.
- [~] **5.X.10** MMKV encryption (H1) — choose key-mgmt: EAS secret → native plugin → JS, or SecureStore-generate on first launch. Affects native build config.
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
- [~] **11.X.9** Final endpoint wiring — DEFERRED until real endpoints; then replace mock handlers + reconcile shapes (Zod at boundary, 5.X.2).
  - **Carry-overs:** `useChannelsQuery` → `useInfiniteQuery`; EPG by channel+date (`useEpgQuery(channelId, date)`); register step-3 birthday → native date picker.

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
- [x] **15.1** T&C acceptance — `TCGateOverlay` + `tcAcceptedAt` + `expo-web-browser`.
- [ ] **15.2** Geoblocking overlay — 451/geo error → full-screen RTSH-branded overlay + retry. (Restyled `geo` screen built in **22.14**.)
- [x] **15.3** Cellular-data gate — `useCellularGate` confirmation modal.
- [ ] **15.4** Mosaic view — 4/6/9 channel thumbnail grid, periodic refresh, tap to switch. (Design build in **22.12**.)
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
- [ ] **16.1** `services/ads.ts` — `getAdManifest(slot)`.
- [ ] **16.2** `components/Media/AdOverlay.tsx` — second expo-video instance, countdown, skip, clickthrough. (Design `adpop` → built with **22.15**.)
- [ ] **16.3** Launch ad — fetched in `useBootstrap`, before first screen.
- [ ] **16.4** Channel-switch ad — frequency-capped via `playerSlice.adsLastShownAt`.
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
- [x] **22.6 / 22.6b** Auth re-skin + domain types — merged `RegisterForm` (RHF+zod, 2-step machine), `AuthHeader`, OTP/reset re-skin, T&C checkbox; `types/domain.ts` rewritten to the design model (`package`/`isLive`/`isAdult`/`geoBlocked`/`thumbnail`, `Hero`/`Continue`/`Subscription`, `QualityId`/`CatchupDay`); fixtures updated.
- [x] **22.7** Home (Kreu) — `BrandHeader` + mosaic/profile buttons, `SearchBar`, TV/Radio `SegmentedToggle`, `HeroCarousel`, `ContinueRow`, package `FilterChipRow`, 2-col `ChannelCard` grid; new `SceneBackground`/`SectionHeader`; `useHomeFeedQuery`.
- [x] **22.8** Guide — `TabHeader` + TV/Radio toggle, `GuideRow` now/next + elapsed-progress from EPG; radio rows = name+genre+LIVE.
- [x] **22.9** Search — back + live `SearchBar`, channels wrap-grid (`ChannelCard`) + `ProgramRow` programs, recent chips; `useSearch` (300ms debounce, unmount-cleanup); `SearchBar.onSubmit`.
- [x] **22.10** Player + EPG + catch-up — portrait inline 16:9 + glass chrome (`PlayerControls` restyle); `DayStrip` (today + 7-back) + EPG/catch-up list (`CatchupBanner`, `ProgramRow` now/recorded/scheduled); `LivePlayer`→inline parent-controlled + screen-owned fullscreen/orientation; native **options + quality sheets** (`getModalScreenOptions`, `SheetOptionRow`) + **Toast** (`ToastSlice`/`ToastHost`); `PlayerSlice.videoQuality`. **ABR:** auto via native player (expo-video read-only tracks, no cap API → only Auto enforced; manual cap later via `react-native-video`). **PIP** deferred to 15.5. **Known gaps:** recorded-row tap passes EPG id vs catch-up id (backend unify); evening demo has no "now" (mock EPG ~06:00–17:35); fullscreen back not safe-area-inset in landscape.

**Remaining (22.11–22.18):**
- [ ] **22.11** Radio. `radio` list route + `radio/[id]` player (scene art, name/sub/kbps, `Equalizer` bars, prev/play/next, radio now/next). Mini-player dock (`RadioMiniPlayer` exists) restyle + background-audio (5.X.13).
- [ ] **22.12** Mosaic (`mosaic`). **2-col** grid (mobile) of channel tiles (last-frame scene + LIVE badge), tap → player. Same column logic as 22.7 so 22.18 widens to wrapped rows. Spec 4/6/9 density — design shows 12 in a 2-col scroll; confirm density control. (Enables the Home mosaic button, currently `isDisabled`.)
- [ ] **22.13** Profile + Settings. Profile (avatar initials, name/email, package badge, list rows → account/favorites/parental/settings/logout). Settings (Luajtja: cellular toggle, default-quality→sheet, parental toggle; Aplikacioni: language, notifications, cast, terms, version). Expand `SettingsSlice` (3.4) with the toggled fields. Folds the deferred `onboard` content (decision: T&C-as-checkbox over gate screens).
- [ ] **22.14** Parental + Geo. Restyle `ParentalPin` to design (lock big-icon, 4-dot PIN, keypad) as a gate before locked-channel play. `geo` full-screen overlay (globe, copy, back-to-home) on streams geo-error / `geo`-flagged channel. Wire into `openChannel` (lock → PIN, geo → overlay) — both spec-mandated (15.2).
- [~] **22.15** Overlays. **Partially done in 22.10:** (a) native route sheets — `getModalScreenOptions` (`presentation:'formSheet'` + `sheetAllowedDetents:'fitToContents'` + grabber + corner) + `SheetOptionRow` ✅; (b) `Toast` — `ToastSlice` + root `ToastHost` ✅. **Remaining:** (c) `AdOverlay` (creative + REKLAMË + skip countdown; app-open + channel-open slots, frequency-capped) — pairs with Phase 16; (d) SOLITAR in-sheet scaffold (SafeAreaView → keyboard → header → content) for keyboard-bearing sheets; (e) scrim/background-dimming polish. Alerts stay on `ModalSlice`/`ModalWrapper`.
- [ ] **22.16** i18n sq copy. Lift exact Albanian strings from the mockup into `sq.json` (+ `en.json` parallels) for every screen; replace remaining hardcoded strings. (auth/home/guide/search/player/catchup/datetime sections already added during their builds.)
- [ ] **22.17** QA + verification pass. `npx expo run:android` (+ iOS), notched safe-area on every screen, walk the mockup `go()` graph (login→ad→home; channel→ad→player; lock→PIN; geo→overlay; day→catch-up; home-toggle→radio), `lint` + `tsc` clean. Promote per-screen [MEDIUM] visual claims to [CERTAIN].
- [~] **22.18** Tablet / iPad / **TV** large-screen pass (decisions 8 + TV scope). **Deferred until mobile (22.1–22.17) is complete + approved.** Same design, display adjustments only: `useWindowDimensions` breakpoints flip grids (22.7/22.12) 2-col → `flexWrap` rows; revisit gutters/hero/player width. **TV in v1 scope** (end-phase): focus/D-pad nav + 10-foot spacing on top of the large-screen layout (its own sub-pass after tablet). Build mobile first, then widen.

---

## Phase 22 — Design inventory & mapping (build-ready reference)

> Source: `.claude/docs/rtsh-tani-mobile.html`. Maps each design screen/icon/component/input/flow/data-shape to our codebase — **EXISTS** (reuse) · **RESTYLE** (re-skin) · **NEW** (build) — with the owning step.

### A. Screen → route map

| # | Design screen (sq) | Our route | Status | Step |
|---|---|---|---|---|
| 1 | Splash | `BrandedSplash` in `_layout` | EXISTS | 22.3 |
| 2 | Login | `(auth)/login` | RESTYLE | 22.6 |
| 3 | Register | `(auth)/register` | RESTYLE | 22.6 |
| 4 | Terms | checkbox on register (+ `TCGateOverlay`) | DONE | 22.6 |
| 5 | Onboard | folded into Settings | — | 22.13 |
| 6 | Home (Kreu) | `(app)/(tabs)/index` | DONE | 22.7 |
| 7 | Guide (Guida) | `(app)/(tabs)/guide` | DONE | 22.8 |
| 8 | Search (Kërko) | `(app)/(tabs)/search` | DONE | 22.9 |
| 9 | Profile | `(app)/(tabs)/profile` | RESTYLE | 22.13 |
| 10 | Settings | `(app)/settings` | NEW | 22.13 |
| 11 | Player + EPG + catch-up | `(app)/channel/[id]` | DONE | 22.10 |
| 12 | Radio list | `(app)/radio` | NEW | 22.11 |
| 13 | Radio player | `(app)/radio/[id]` | RESTYLE | 22.11 |
| 14 | Mosaic | `(app)/mosaic` | NEW | 22.12 |
| 15 | Parental (PIN) | `ParentalPinModal` gate | RESTYLE | 22.14 |
| 16 | Geo-block | `(app)/geo` | NEW | 22.14 |

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
| `list-item`+`tg` | `ListRow` + `Switch` | DONE/22.13 | 22.5 |
| `seg-choice` | `SegmentedChoice` | DONE | 22.5 |
| `check`/`cbox` | `Checkbox` | DONE | 22.5 |
| `sheet`/`opt-row` | `(app)` sheet routes + `getModalScreenOptions` + `SheetOptionRow` | DONE | 22.10/22.15 |
| `toast` | `Toast` (`ToastSlice`/`ToastHost`) | DONE | 22.10/22.15 |
| `center-pad`/`big-ic` | `CenteredMessage` (geo/parental) | NEW | 22.14 |
| `pin`/`keypad` | `ParentalPinModal`/`ParentalPinPad` | RESTYLE | 22.14 |
| `mos-grid`/`mos` | `MosaicTile` + grid | NEW | 22.12 |
| `rp-art`/`eq` | `RadioPlayer` art + `Equalizer` | RESTYLE/NEW | 22.11 |
| `radio-item` | `StationRow` | RESTYLE | 22.11 |
| `adpop`/`ad-*` | `AdOverlay` | NEW | 22.15/Ph16 |
| mini-player dock | `RadioMiniPlayer` | RESTYLE | 22.11 |

### D. Inputs / controls
`pill-input` → `ReusableInput` pill · `inp` (labeled) → `ReusableInput` labeled · `select.inp` → option sheet (not a native `<select>`) · `check` → `Checkbox` · `seg-choice` → `SegmentedChoice` · `tg` → `Switch` · `keypad` → `ParentalPinPad` · `track`+`knob` → player seek. RHF + zod for forms.

### E. Flow graph (mockup `go()`)
- **Boot:** splash → login (ours: `BrandedSplash` until bootstrap → guard routes).
- **Login** `Hyr` → ad(app-open) → home · register link.
- **Register** → terms (checkbox) → onboard(→Settings) → ad → home.
- **Home:** search→search · grid→mosaic · user→profile · TV/Radio toggle · channel tap→`openChannel`.
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

## Reference
- Archive (full done-step history): `.claude/docs/plan-archive.md`
- Style guide: `.claude/rules/STYLE_GUIDE.md` · Architecture: `.claude/rules/ARCHITECTURE.md`
- Project memory: `.claude/memory/` · Design mockup: `.claude/docs/rtsh-tani-mobile.html`
- Original spec: `../assets/4._DST_-_OTT.docx`
