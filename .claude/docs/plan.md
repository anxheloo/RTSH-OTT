# plan.md — RTSH-OTT Build Plan

> **Single plan file.** `plan-archive.md` has been folded in and deleted (2026-07-08) — it was the verbose precursor of the same history already condensed below; nothing load-bearing was lost. Forward-looking work (`[ ]` / `[~]`) is kept in full so a future session can execute without re-deriving. Completed steps (`[x]`) are one-liners or short paragraphs — for the mechanics/rationale of a cross-cutting flow (auth, theme, boot, network, persistence, radio audio, parental, real-time, device identity, responsive/TV), read `rules/ARCHITECTURE.md`, which is kept current every session; this file tracks phase/step completion, not flow mechanics.
> **Testing:** `npx expo run:android` / `run:ios` throughout. EAS cloud builds, device registration, and store submission → Phase 21.
> **Entry format** (`anxheloo-task-plan-executor`): `[x]` done · `[~]` deferred/partial · `[ ]` not started.

---

## Status snapshot — 2026-07-08

- **Done:** Phases 0–13, 18.2 (mock server, still used for `EXPO_PUBLIC_API_MODE=mock` dev/CI), the auth wizard (11.X) incl. account self-service/cross-device sync/delete account, review fixes (11.Y), all of **Phase 22.1–22.16** (design implementation, every screen), the SDK 56→57 upgrade, the real-time STOMP layer (presence/watch-time/mid-roll/geo, ads infra Phase 16), and the **Android TV/STB 10-foot UX pass** (22.18-TV — focus/D-pad nav, guide drawer, header route menu; `Platform.isTV`-gated, mobile untouched). **11.X.9 backend wiring is DONE** — the app now runs against the real backend with real endpoints and real data (not mocks) for auth, channels, EPG, guide, catch-up, radio, ads, and realtime.
- **Tested to date:** physical Android device, iOS simulator, Android TV emulator — "seems to work fine" per manual pass (2026-07-08). Not yet tested: real physical iOS device, Android tablet, iPad, Android TV box, Android STB unit.
- **Active / remaining:** Sentry (14.1/5.X.12, deferred by user), store-readiness compliance work (24) + the EAS/store submission pipeline (21), physical-device coverage above, and the formal QA/audit sign-off passes (22.17, 23).
- **Backlog:** deferred audit/infra items (`5.X.*`, `11.Y.4–11`), Telemetry re-enable decision (14.2/14.3), remaining product-feature verification (15.2 geo-CDN hard-enforcement confirm, 15.5 PIP entitlement confirm), ad funnel analytics (16.6), Hardening (17), Handoff polish (18), Quality gate (23), **Store readiness & submission (24)**.
- **End-to-end execution order (user 2026-06-10):** mobile run/test/fix (22.17) → large-screen pass (22.18) → ~~backend wiring (11.X.9)~~ **done** → final audit + plan sync (23) → store readiness & submit (24 requirements + 21 pipeline).

> `rules/ARCHITECTURE.md` reflects the actual current-state of every flow as it evolves (real-time/STOMP, ads, analytics, device identity, TV, etc.) and is the doc to trust for "how does X work today" — reconcile this snapshot against it if the two ever visibly disagree.

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
7. **Sheets: native, route-based — NOT `@gorhom`.** [HIGH] One shared typed `getModalScreenOptions({ detents, cornerRadius })`, detents tuned per sheet, in-sheet scaffold `SafeAreaView → keyboard → header → content`, alerts stay on `ModalSlice`/`ModalWrapper`. (Settled on `presentation:'formSheet'` cross-platform per expo-router v56 docs.)
8. **Mobile-first, responsive later.** [HIGH] Grids 2-col on phones → wider on tablet/TV. *(Down-payment landed 2026-06-18: portable **`@/responsive`** module — `useResponsiveGrid()` drives grid `numColumns` by device class + orientation (shortest-side `sw600dp` classifier: phone 2/2, tablet 3/4, TV 4/4), `scaled()` applies a per-class step (phone 1 / tablet 1.15 / TV 1.3) to `FONTSIZE`/`SPACING`/control tokens. 22.18 owns content max-width clamps, hero/player width, TV focus/D-pad nav.)*
9. **Auth: keep OTP, re-skin the wizard; do NOT delete it.** [HIGH] Flow: `login → register (single merged form) → OTP → tokens → home`; T&C = checkbox on register. Backend-ordering was flagged [MEDIUM] pre-launch (design merges creds+details pre-OTP vs the step-machine's creds→OTP→details split) — resolved in 22.6 (mock posts all fields at step 1 then OTP; reconcile fully once the real `/auth/register` contract is final).

### Supersessions / re-validations

Phase 8 (5 tabs) → 22.4 (4 tabs). · 5.X.6/5.X.7/5.X.8 (design tokens) → 22.1. · 2.1 fonts → 22.2 (Inter). · 3.4 SettingsSlice → 22.13. · 3.5 PlayerSlice → 22.10/22.11. · 11.Y.9 skeletons → per-screen steps. · Session logo work → 22.3.

---

## Completed phases — one-line index (historical)

> Two iteration passes (2026-06-03 code-quality cleanup + SOLITAR org alignment; 2026-06-04 multi-step-auth + logo→expo-image) folded in here. Their net effects live in the entries below + `rules/ARCHITECTURE.md`.

### Phase 0–2 — Tooling, Structure, Theme
- [x] **0.1–0.9** Toolchain (Node 20, expo-doctor 21/21), bootstrap (initial SDK · strict TS · aliases), EAS init + `APP_VARIANT` variants, ESLint/Prettier + import-sort, zod env reader. (0.4–0.6 → Phase 21.)
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
- [x] **5.1–5.5, 5.5a, 5.7, 5.8, 5.9** `useCheckToken` (keychain-only, offline-first), `useAppState`, `useOTA`, `useNetworkReconnect`→later `useNetworkMonitor` (11.Y.2), `useOrientation`, audit-fix pass (5.5a), `useHaptic` (wired app-wide 2026-06-16: `Switch`/`Checkbox`/`SegmentedToggle`/`ParentalPinPad`/`ReusableBtn` opt-in `haptic` prop; pattern documented in STYLE_GUIDE), `useBootstrap` (root orchestrator, later split — see Boot/Splash in ARCHITECTURE.md), hooks barrel.
- [ ] **5.6** `useKeyboard` — superseded by `react-native-keyboard-controller` + `KeyboardProvider` (11.X.0). Close or repurpose if a custom keyboard hook is ever needed.

### Phase 5.X — Audit follow-ups
**Done:** [x] **5.X.1** domain types + services retyped · [x] **5.X.3** TanStack query hooks (channels/epg/catchup/radio/streams) + screens wired · [x] **5.X.6** semantic color tokens · [x] **5.X.7** `SHADOWS`/`OPACITY`/`Z_INDEX`/`ANIMATION` + `BORDERRADIUS` expanded · [x] **5.X.8** spacing reconciliation · [x] **5.X.11** iOS keychain accessibility · [x] **5.X.14** OTA channel explicit in `app.config.ts` · [x] **5.X.15** parental PIN (done in 12.2, later re-modeled — see Phase 22.14 family).

**Deferred (forward backlog):**
- [~] **5.X.2** Zod schemas at the API boundary. **Auth slice DONE in 22.14d** (`userSchema`/`authResponseSchema`; `login`/`refresh`/`getMe`/`updateProfile`/register-completion validated). **Remaining:** streams + the other domain services; reconcile envelope (11.Y.5) when the real contract lands.
- [~] **5.X.4** Per-call timeout overrides (`streamClient` 5s for manifests; longer for bulk EPG).
- [~] **5.X.5** `useCheckToken` rich result `{ authenticated, reason }` so UI can tell "no session" from "network error" (also resolves the 8.2 guard limbo). **Evaluated + deliberately deferred 2026-06-15 (11.X.13):** the only un-handled state is `needs-hydration` (refresh token present, `user` un-fetchable) which is iOS-reinstall-**offline** only; current login fallback is acceptable, building the tri-state + hold/retry is YAGNI until a real user hits it.
- [~] **5.X.9** Decide `predictiveBackGestureEnabled` on Android.
- [x] **5.X.10** MMKV encryption — **DECIDED: accepted risk, won't encrypt (2026-06-10).** Every real secret is keychain-only (refresh token) or memory-only (access token); the MMKV blob holds only low-sensitivity PII + boolean settings, and the OS sandbox already blocks other apps from reading it. **Invariant:** never persist a real secret into the plaintext MMKV blob (enforced lightweight by **5.X.17** field-whitelist, not encryption; the parental PIN hash is a deliberate, documented exception — see ARCHITECTURE.md → Parental control).
- [~] **5.X.12** Sentry init — DSN as EAS secret, init before `<Stack/>`, replace `__DEV__ console.warn` patterns. Pairs with Phase 14 / 11.Y.6. **Status: deferred by user 2026-07-03** — tracked in the audit backlog, not yet installed.
- [~] **5.X.13** Background audio + PiP entitlements in `app.config.ts` (iOS `UIBackgroundModes:['audio']`, Android `foregroundServiceType`). Landed for radio background audio + PIP always-on (see CLAUDE.md mandatory features) — re-verify entitlement coverage remains complete as native config evolves.
- [~] **5.X.16** Re-evaluate the TypeScript pin ahead of the SDK baseline; run `expo-doctor`, pin if issues surface.
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
- [x] **12.1–12.2 + rotation** Single-flight refresh verified, **parental PIN** (built 4-digit SHA-256+salt keychain, 5-try lockout — later re-modeled device-level, see 22.14 family), app orientation `default`.
- [x] **13.1–13.4** i18next (sq default, en fallback), namespaces, language switcher.

### Phase 11.X — Server-driven multi-step auth (mock-first)
- [x] **11.X.0–11.X.8 + 11.X.5a + 11.X.7a** RHF + `KeyboardProvider`, wizard endpoints/services/mocks/mutations, `StepHeader`/`OtpVerify`/`AuthScreen`/`TermsNotice`, login/register/forgot rebuilt as step machines, `PLAYER_COLORS` extraction + reuse pass, boot manual-wipe recovery, dead-code removal. **All re-skinned in 22.6.**
- [x] **11.X.9** Final endpoint wiring — **DONE.** Auth slice done 2026-06-12 (11.X.12); all remaining domains (channels/EPG/catchup/radio/ads/playback, search, guide) are now wired to the real backend with real endpoints and real data (confirmed 2026-07-08) — `EXPO_PUBLIC_API_MODE=mock` remains available for dev/CI but is no longer the default runtime path.
  - **Carry-overs (still open):** `useChannelsQuery` → `useInfiniteQuery` if pagination is needed; ~~register birthday field → native date picker~~ — **done (2026-06-18)**; ~~parental endpoints reconcile~~ — **done**.
- [x] **11.X.10 → superseded by 22.X.** Device identity headers built per the 2026-06-11 backend spec (`X-Device-Id`/`X-Device-Platform`/`X-App-Version` on every call, 426 blocking `forceUpdate` modal, unauth `GET /app/version`), then the header stamp was **removed entirely 2026-06-23** (22.X) in favor of no per-request device headers. `getOrCreateDeviceId`, `openStoreListing`, the 426 modal, and `GET /app/version` remain in place.
- [x] **11.X.11 → superseded by 22.X.** Device registration built as `PUT /users/me/device` (bare `DeviceInfoDTO`, `deviceKey` = keychain UUID; no device cap on the backend). Trigger later moved from "on `isAuthenticated → true`" to a dedicated `useRegisterDeviceMutation` fired once on authenticated entry (22.X); body unchanged.
- [x] **11.X.12** Auth endpoints reconciled against the live swagger (2026-06-12). `/api/v1` prefix on `baseURL`; real auth routes; refresh returns `{accessToken}` only — **no rotation** (static refresh token; revocation only via logout — see ARCHITECTURE.md → Auth flow for the accepted trade-off); single-shot register (all profile fields + `acceptTerms`→`termsAccepted`) → OTP verify auto-login; `userDtoSchema` validate+transforms the wire `UserDTO` into the domain `User` in one parse. Single-flight refresh dedup moved inside `refreshAccessToken`; the interceptor never logs out itself — only a confirmed 401/403 inside `refreshAccessToken` does. Dead 3-step register leftovers deleted.
- [x] **11.X.13** Account self-service + cross-device sync (2026-06-15). Change-password `POST /users/me/change-password` **rotates** the refresh token + folds in "log out other devices". Parental setup/toggle via `POST`/`PATCH /parental` (local PIN verify required before disable; re-enable needs none). `useMeQuery` (foreground + reconnect + 5-min active-only poll) is the advisory cross-device sync path — not real-time, and deliberately not tied to token refresh. Parental writes moved into dedicated mutation hooks.
- [x] **11.X.14** Delete account (2026-06-25). `DELETE /users/me` (access token identifies the account); the local wipe (`store.logout()` + `clearParentalConfig()` + `queryClient.clear()`) runs **only on a confirmed 200** — the one local-wipe path that also clears the device-level parental gate (logout deliberately leaves it intact).

### Phase 11.Y — Codebase review follow-ups
- [x] **11.Y.1–11.Y.3, 11.Y.12** Guard on `isAuthenticated` only; offline = informational `noInternet` modal + **modal/network simplified to RTSH/SOLITAR single-modal shape** (`useNetworkMonitor` + `createNetworkSlice`); doc drift fixed; `SafeAreaProvider` + `ScreenLayout` (5 tabs migrated).

**Deferred — land with endpoint wiring (11.X.9):**
- [~] **11.Y.4** Runtime validation at the API boundary (Zod). *Needs real response shapes.* Approach: parse each service response with a co-located Zod schema (or typed `http()` wrapper); parse failure → typed `ApiError` → `apiError` modal. Relates to 5.X.2.
- [~] **11.Y.5** Pin one response envelope. *Backend-defined.* Today services disagree (`data.channels` vs bare `data`). Approach: agree one shape, centralize unwrapping in `http()`, align all services in one pass.
- [~] **11.Y.6** Root `ErrorBoundary` + Sentry. *Needs DSN (EAS secret).* `ErrorBoundary` itself is **done** (2026-07-03, dependency-free branded retry screen — see ARCHITECTURE.md → Boot/Splash). **Remaining:** `@sentry/react-native` init. Relates to 5.X.12 / Phase 14.
- [~] **11.Y.7** Query-key factory (`api/queryKeys.ts`) so invalidations can't drift. Low risk; ride the wiring pass.
- [~] **11.Y.8** Drop `(createPlayerSlice as any)` — give `PlayerSlice` the `StateCreator<AppStore,...>` signature like its siblings. Chore.
- [~] **11.Y.9** Skeleton loaders for data screens — **largely done, 22.15f** (Skeleton primitive + per-row siblings + `ListStateView`/`ErrorState`/`Empty*State`). Re-check coverage on any new data screen.
- [~] **11.Y.10** Tests — start with pure logic (`authFlow` mock machine, `authErrorMessage`, store `login/logout`, `useCheckToken` branches). High value before launch.
- [~] **11.Y.11** MMKV encryption / `user` whitelist before real PII persists. Relates to 5.X.10 / 5.X.17.

### Phase 18.2 — Mock server
- [x] **18.2** Custom axios-adapter mock (`EXPO_PUBLIC_API_MODE=mock`): 19 channels, 7-day EPG generator (any date), 20 catch-up, 13 radio, auth step-machine, config. Installed at `_layout` module scope before first render.

### Engineering scaffolding (from the 2026-07-03 audit, now folded in — audit doc retired)
- [x] **Tests** — `jest-expo` + `@testing-library/react-native`, 77 tests / 10 suites over the pure core (`realtime/midroll`, `utils/epg`/`datetime`/`resolveStreamSource`/`pin`, `lib/tokenVault`), `authRefresh` behavior, and RNTL component tests (`AdOverlay`, `ParentalPinModal`).
- [x] **CI** — `.github/workflows/ci.yml` gates every PR + push to main (`npm ci` → `tsc --noEmit` → `expo lint --max-warnings 0` → `jest --ci`, hermetic `EXPO_PUBLIC_API_MODE=mock`); `deps-health.yml` runs weekly (`expo-doctor` + `npm audit --omit=dev --audit-level=high`).
- [x] **Root `ErrorBoundary`** — dependency-free branded retry screen, `app/_layout.tsx` (expo-router convention). See `rules/ARCHITECTURE.md → Boot/Splash gate`.
- [~] **Sentry** — still deferred by explicit user decision (14.1/5.X.12 below), not an oversight.

---

## Remaining work — `[ ]` / `[~]`

### Phase 14 — Telemetry
- [ ] **14.1** `@sentry/react-native` — init before providers, scrub PII in `beforeSend`. **Deferred by user 2026-07-03** (tracked in the audit backlog).
- [ ] **14.2** `services/analytics.ts` — provider-agnostic `track/identify/screen`. **Superseded by a fuller first-party build** (`src/analytics/`, event taxonomy, heartbeat, watch tracking — see ARCHITECTURE.md → Analytics & telemetry) — but it currently ships **disabled** (mounts commented out, pending backend ingestion confirmation). Re-enabling (or formally deferring) this is the open item.
- [ ] **14.3** Settings toggle: "Send anonymous analytics". Ride the analytics re-enable above.

### Phase 15 — RTSH Product Features
- [x] **15.1** T&C acceptance — simplified 2026-06-17 to a register-form `acceptTerms` checkbox (account-level, never re-prompted); the earlier blocking `TCGateOverlay` + `tcAcceptedAt` flag were removed as redundant.
- [ ] **15.2** Geoblocking overlay — 451/geo error → full-screen RTSH-branded overlay + retry. (Restyled `geo` UI built in **22.14**; the client-side per-programme + whole-channel geo mechanism is now built on the real-time layer — see ARCHITECTURE.md → Real-time → Geo.) **Remaining:** confirm hard-enforcement still rides CDN/signed-URL, not just the client flag.
  - **Backend contract:** geo enforced at the **CDN edge by user IP** via backend-issued **signed, short-lived playback URLs** — the client cannot geolocate and must not try. Client branches a `403` on manifest/AES-key requests: *expiry* → silently re-fetch the signed URL; *geo* → overlay.
- [x] **15.3** Cellular-data gate — `useCellularGate` confirmation modal.
- [x] **15.4** ~~Mosaic view~~ **REMOVED** (user 2026-06-11, see 22.14f). Feature cut: route/tile/entry-points deleted. CLAUDE.md mandatory-features list updated.
- [ ] **15.5 → superseded, verify entitlements only.** PIP + iOS background video are now **always-on** (no user setting; `backgroundVideoAllowed` removed 2026-06-26) — see CLAUDE.md → Mandatory product features and ARCHITECTURE.md → Player. **Remaining:** confirm the `expo-video` config plugin entitlements (`supportsBackgroundPlayback`) are wired and verified on a real device (native rebuild required); one player in PIP at a time.
- [x] **15.6** Foreground refresh — channels + EPG invalidated on app foreground.

### Phase 16 — Ad Infrastructure
- [x] **16.1** `services/ads.ts` → superseded by the merged `GET /ads` endpoint (single array per context, keyed by `placement` — see ARCHITECTURE.md → Real-time → Merged ads endpoint). Server-authoritative.
- [x] **16.2** `AdOverlay` — static creative + REKLAMË + skip countdown, self-reports its own impression on completion (`clientEventId` de-dupe).
- [x] **16.3** App-open ad — mounted above the router, slot-exclusive with the other two placements via `AdsSlice` + `useAdSlot`.
- [x] **16.4** Channel-switch (preroll) ad — content player stays unmounted while active (no autoplay-behind-overlay leak); reveal delayed 2s after the host screen settles.
- [x] **16.5** Mid-roll ads — client-scheduled (Option A) off the real-time `/topic/channel.{id}` feed; absolute ISO `startTime`/`validUntil`, staleness-bounded when `validUntil` is missing/invalid. Content stream pauses (not unmounted) for the break; live resumes at the edge on exit. See ARCHITECTURE.md → Real-time for the full scheduling model.
- [ ] **16.6** Ad analytics beyond impression — skip/complete/clickthrough breakdown reporting (impression + `watchedSeconds` already reported per-ad; a fuller funnel view is the remaining piece, if product wants it).

### Phase 17 — Client-side Hardening
- [ ] **17.1** Secure storage audit — refresh token keychain-only, no tokens in logs/Sentry (Sentry not yet installed — pairs with 5.X.12/14.1).
- [ ] **17.2** Accessibility — labels/roles everywhere, contrast, screen-reader flow. STYLE_GUIDE now mandates `accessibilityRole`/`accessibilityLabel`/`accessibilityState` on every interactive leaf (2026-07-03) — this item is the systematic sweep/verification pass, not the convention itself.
- [ ] **17.3** Performance budget — cold start <2s, TTI <3s mid-Android, scroll >58fps, bundle <25MB.
- [ ] **17.4** i18n completeness — script flags missing keys, fails CI.
- [ ] **17.5** Privacy policy + T&C URLs from `/config` in profile. Overlaps 24.12.

### Phase 18 — Backend-readiness Handoff
- [ ] **18.1** `docs/API.md` (OpenAPI) from current services — **partially exists** (referenced throughout ARCHITECTURE.md as the source of truth for `src/api/`); confirm it's fully current against the live swagger.
- [ ] **18.3** `EXPO_PUBLIC_API_MODE` env switching + dev-menu quick switcher. (The env var itself works today — **`mock|real`**, narrowed from `mock|dev|staging|prod` on 2026-08-01 since only the literal `mock` was ever branched on; a dev-menu quick switcher is the remaining polish. Note a runtime switcher cannot work as-is: the mock module is dropped from the bundle at build time when the value is not `mock`, so a switcher would need the fixtures bundled unconditionally in dev builds.)
- [ ] **18.4** `config/featureFlags.ts` — local + remote from `/config`.

### Phase 21 — Device Testing & Distribution (deferred until feature-complete)
- [ ] **21.1–21.12** Register devices; EAS env vars + source-maps→Sentry; dev/preview builds; EAS Update channels; **iOS** App Store Connect prep → submit → TestFlight/review; **Android** Play prep → 14-day closed testing (≥12 testers) → submit/staged rollout; rejection buffer. **Testing to date:** physical Android device, iOS simulator, Android TV emulator — **remaining physical-device coverage:** real iOS device, Android tablet, iPad, Android TV box, Android STB (see 22.18 + 24 for the feature/compliance work that must land first).

---

## Phase 22 — Design Implementation

> Build order foundation-first (tokens → type → logo → nav → primitives) then per-screen. A screen step is "done" when it matches the HTML on a notched device. Albanian copy verbatim from the mockup (22.16). Keep STYLE_GUIDE throughout.

### Build log — 22.1–22.16, 22.19 (done; condensed)

- [x] **22.1** Token reconciliation — `darkTheme` re-valued to the design; new tokens `surfaceHigh`/`primaryBright`/`mutedDim`/`tabBarBorder` (+ later `primarySoft`/`primaryBorder`), `pill_input:24`/`button:27` radii, `space_18`; light values too. Legacy `pill`/`pill_sm`/`space_15` kept until screens migrate.
- [x] **22.2** Typography → **Inter** — `Fonts` remapped (400–900), `useFonts` loads Inter only, `ReusableText` variants re-scaled. Anton/Outfit retired (unused-dep removal → 23.4).
- [x] **22.3 / 22.3b** Logo + icon system — `RtshLogoFull` lockup; `react-native-svg-transformer` + raw `.svg` under `assets/icons/{Player,TabBar,General,Auth,Brand}/` + barrels; `Icon`/`IconButton` wrappers. (Needs dev-client rebuild + `--clear`.)
- [x] **22.4** Nav restructure — 4-tab shell (Kreu/Guida/Kërko/Profili), `theme/tabBar.ts` config, `expo-blur` frosted bar, active-icon-red/label-white decoupled; `epg`→`guide`, `radio`→`(app)/radio`, `catchup` tab removed.
- [x] **22.5** Shared primitives — `SegmentedToggle`, `SegmentedChoice`, `FilterChipRow`, `SearchBar`, `Switch`, `Checkbox`, `ListRow`.
- [x] **22.6 / 22.6b** Auth re-skin + domain types — merged `RegisterForm` (RHF+zod, 2-step machine), `AuthHeader`, OTP/reset re-skin, T&C checkbox; `types/domain.ts` rewritten to the design model (`package`/`isLive`/`isAdult`/`geoBlocked`/`thumbnail`, `Hero`/`Continue`/`Subscription`, `QualityId`/`CatchupDay`). 2026-06-18: `RegisterForm` gained native `CountryPickerInput`/`DatePickerInput`; `PlaybackDecision` + EPG playback-embed added; `RadioStation` folded into `Channel`; `Rendition`/`StreamManifest` later removed (superseded by 22.14e's note below).
- [x] **22.7** Home (Kreu) — `BrandHeader`, `SearchBar`, TV/Radio `SegmentedToggle`, `HeroCarousel`, package `FilterChipRow`, 2-col `ChannelCard` grid, `SceneBackground`/`SectionHeader`, `useHomeFeedQuery`. Mosaic button + `ContinueRow` rail + "Guida" link later removed (22.14f). 2026-06-17: recomposed onto a single `FlashList` (`BrowseControls` + hero in `ListHeaderComponent`); `EdgeFade` extracted as the reusable fade primitive.
- [x] **22.8** Guide — `TabHeader` + TV/Radio toggle, `GuideRow` now/next + elapsed-progress from EPG. 2026-06-17: toggle moved into `ListHeaderComponent`.
- [x] **22.9** Search — back + live `SearchBar`, channels/`ProgramRow` results, recent chips, `useSearch` (300ms debounce).
- [x] **22.10** Player + EPG + catch-up — portrait inline 16:9 + glass chrome; `DayStrip` (today + 7-back) + EPG/catch-up list; `LivePlayer` → inline parent-controlled + screen-owned fullscreen/orientation; native options + quality sheets + `Toast`; `PlayerSlice.videoQuality`. **Known gaps still open:** recorded-row tap passes the EPG id vs the catch-up id (needs backend unify); fullscreen back button isn't safe-area-inset in landscape.
- [x] **22.11** Radio — `RadioAudioHost` (store-driven `expo-audio` engine mounted above the router, survives navigation); `radio/index` (catalogue) + `radio/[id]` (player) routes; `Equalizer`, restyled `StationRow`/`RadioMiniPlayer`; `RadioPlayer` now presentational-only. **Known gap:** no radio-EPG source, so the programme section shows only the live-now row.
- [x] **22.12** Mosaic — **REMOVED 2026-06-11** (user cut the feature entirely, 22.14f); 15.4 closed. No longer part of the app.
- [x] **22.13** Profile + Settings — Profile → nav-only rows (avatar/name/package badge + `ListRow`s); new Settings route (cellular toggle, default-quality→sheet, parental toggle, language/theme sheets, notifications stub, cast disabled-stub, terms link, version); `SettingsSlice` expanded. **Known gaps still open:** cast + notifications are inert stubs (no native wiring — out of scope v1 / pending push setup); parental gate is binary only, no age-tiers (7/12/16/18) despite the design's cosmetic "12+".
- [x] **22.14 family (22.14, 22.14b–22.14h)** Parental + Geo client build — iterated through several PIN models before landing on the current one. **Final state (see ARCHITECTURE.md → Parental control):** device-level `ParentalSlice` (`parentalEnabled`+`parentalPin`, SHA-256 local compare via `expo-crypto`, MMKV-persisted, no backend / no cross-device sync), gating only `isAdult`-flagged content via one shared `useParentalGuard(channelId,{isLive,enabled})` (live-boundary re-check + recorded-tap gate, unified 2026-06-24). Geo handled **inline** in `channel/[id]` (`CenteredMessage`), not a standalone route. Disabling the gate requires a PIN verify first (closes a bypass); account deletion is the only local-wipe path that also clears the device PIN (logout leaves it intact). Folded-in UI fixes: `SCREEN_PADDING` gutter token pass + mosaic/continue-watching removal (22.14f), read-only account-details screen + a parental-keypad Yoga-collapse fix (22.14g).
  - **Known gap:** the geo trigger is still the `channel.geoBlocked` flag, not a live CDN/stream `451`/`GEO_BLOCKED` error — see 15.2.
- [x] **22.14e Adaptive video quality.** Superseded 2026-06-18: stream URLs now come from `GET /channels/{id}` → `PlaybackDecisionDTO.streams: Record<string,string>` (the earlier `/streams` endpoint + `StreamManifest`/`Rendition` types were removed). `resolveStreamSource`/`availableQualityIds` resolve manual (child URL) vs `auto` (master if present, else a fixed fallback). **True ABR needs a `masterUrl` from the backend** — ships automatically once provided (mock already serves one). Manual switch rebuffers (expo-video source swap); seamless switching would need a `react-native-video` migration.
- [x] **22.15 family (22.15, 22.15f, 22.15g)** Overlays + loading/polish. Native route-based sheets (`getModalScreenOptions`, `formSheet`) + `SheetOptionRow`; `ToastSlice`/`ToastHost`; `AdOverlay` (static creative, REKLAMË label, skip countdown) — slot **orchestration** (frequency cap, scheduling, analytics) is Phase 16, now done there. Skeleton-loading strategy codified (`Skeleton` primitive + per-row `*Skeleton` siblings, `ListStateView`/`ErrorState`/`Empty*State` three-way pick — see STYLE_GUIDE → Loading States). Mock handlers given realistic latency so skeletons are actually observable in dev; screen transitions standardized (`slide_from_right` push, `slide_from_bottom` player modals).
- [x] **22.16** i18n sq copy — exact Albanian strings lifted from the mockup into `sq.json`/`en.json` for every screen (259 keys, verified sq/en parity).
- [x] **22.X** Device identity simplified (2026-06-23, marked temporary) — per-request device headers (`X-Device-Id`/`X-Device-Platform`/`X-App-Version`) removed entirely (`Authorization`+`Accept-Language` remain); registration (`PUT /users/me/device`) fires via `useRegisterDeviceMutation` once on authenticated entry; a `deviceClass` (`MOBILE|TV|STB`) query param rides the two playback GETs instead, letting the backend serve a platform-specific URL per request. **Diverges from the original backend header spec (11.X.10)** — the 426 force-update gate can no longer compare version per-request. See ARCHITECTURE.md → Device identity → Divergence.

- [x] **22.19** EPG programme-description expander (2026-07-27) — the channel screen's programme rows already rendered `p.description` but clamped it to one line, so a description was never actually readable. `ProgramRow` gained `onToggleExpand`/`expanded`/`onLayout`: passing `onToggleExpand` makes the row an expander — `numberOfLines` drops to `undefined` (RN's unlimited default, so row height flows from the text at any line count) and the press targets **split**, body = toggle, play glyph = the only playback trigger (its own `TouchableOpacity` + `hitSlop` to a ~44pt target). Consequences: a **future/`scheduled`** row is now readable-but-not-playable (`disabled` moved off the row; it renders no glyph anyway), and the Android `BlurView` scrim got `pointerEvents="none"` — `absoluteFill` was eating the new tap. A `ChevronRightIcon` rotated ±90° (reanimated `withTiming`) marks the affordance; the row root is an `Animated.View` with `LinearTransition` so it grows and its siblings slide. `expandedProgramId` lives in `channel/[id].tsx` — one id is the whole "only one row open" rule. **On TV the split is inverted** (nested focusables trap the D-pad): the glyph stays inert, row press still plays, and the drawer's `onFocus` sets `expandedProgramId`, so focus *is* expansion — unique by construction, same invariant from the same field, and the layout animation is off there (it would fight `scrollToIndex`). Call sites without `onToggleExpand` (radio now-playing, Search results) are behaviorally unchanged; pinned by tests in `components/epg/__tests__/ProgramRow.test.tsx`.

### Open — 22.17, 22.18

- [ ] **22.17** QA + verification pass. `npx expo run:android` (+ iOS), notched safe-area on every screen, walk the mockup `go()` graph (login→ad→home; channel→ad→player; lock→PIN; geo→overlay; day→catch-up; home-toggle→radio), `lint` + `tsc` clean. Promote per-screen [MEDIUM] visual claims to [CERTAIN]. **Progress to date:** extensive manual testing has happened on physical Android, iOS simulator, and the Android TV emulator (see 22.18) — formal sign-off / promotion of remaining [MEDIUM] claims is still open.

- [~] **22.18** Tablet / iPad / **TV** large-screen pass (decisions 8 + TV scope). *Foundation landed 2026-06-18:* the portable **`@/responsive`** module (device-class + orientation grid columns via shortest-side classifier, `scaled()` per-class token step) is wired to the Home grid + `FONTSIZE`/`SPACING`/control tokens. *Tablet content-width pass landed 2026-06-25:* `useContentWidth(variant)` (`CONTENT_MAX_WIDTH` form 480 / content 640 / player 820) wired across auth forms, change-password, settings, account, profile, radio, the channel player, and Guide/Search row lists. **Remaining for the tablet sub-pass:** on-device tuning of `GRID_COLUMNS`/`UI_SCALE`/`CONTENT_MAX_WIDTH`, plus real physical **iPad + Android-tablet** device testing (only emulator/simulator coverage so far).

  - **Orientation scope (decided 2026-06-10):** browsing UI is **portrait-locked on ALL touch devices** (phone, tablet, iPad); the **only** landscape surface is the fullscreen player. TV is the explicit exception — a fixed-landscape display with no portrait, so its entire browse UI is landscape-by-definition and needs D-pad/focus nav. TV is therefore a **separate build target**, built after the tablet/iPad sub-pass. Implementation seam: `useOrientation` + `expo-screen-orientation`, already wired (browse locked portrait, player unlocks landscape on fullscreen enter, re-locks on exit; TV path is orientation-guarded and needs no lock/unlock logic at all).

  - **22.18-TV — Android TV + STB enablement.** Scope decisions: local prebuild + Android TV emulator (and EAS `*_tv`/`*_stb` + Orbit) for testing; **full-polish** focus/D-pad nav across ALL screens; bottom Native Tabs approach was tried, then **superseded** — see below; STB self-update deferred to Phase E.
    - **Status (2026-07-08, branch `feat/tv-stb-sdk57`):** re-based onto SDK 57 (superseding an earlier SDK-56 attempt). **Phase A** (build & boot — `react-native-tvos` npm alias, `@react-native-tvos/config-tv` plugin, EAS `*_tv`/`*_stb` profiles + npm scripts, the `legacy-peer-deps` peer-dep fix for `react-native-nitro-modules`/`@react-native/jest-preset`) — **done**, verified on an Android TV API-34 emulator (builds, leanback launch, renders landscape, no crash). **Phase C focus foundation** (portable `src/tv/` module — `isTV`, `useTVFocus`, `tvFocusHighlight`, `TVFocusZone`; isTV-gated focus rings on 11+ shared components; the `withAndroidTVFocusFix.js` config plugin for the RN 0.80+ vertical-list focus regression #1087) — **done**, focus rings + D-pad grid nav confirmed on-device. **Phase C.3/C.4 + D (TV UX pass) — largely done, on-device iterated with the user:** the channel screen's "can't scroll into the guide" issue was root-caused to a **landscape layout** problem (portrait 16:9 video fills the whole 1080p screen, pushing the guide off-tree), fixed by going **full-screen player + a guide drawer** (single vertical `FlatList`, date strip as its header, so the D-pad flows within one list; opens centered + focused on the now-airing row). **Bottom tabs are now HIDDEN on TV** (superseding the earlier "keep tabs, make them focusable" decision) — replaced by `TVNavButton`, a route-menu `Modal` drawer in `BrandHeader`. Focus wired across `AdOverlay`, `PlayerControls` (no auto-hide on TV), `RadioMiniPlayer`, `HeroCarousel`, `ParentalPinPad`, radio transport. All TV-only / `isTV`-gated — mobile stays byte-identical throughout (re-verified: tsc 0, lint 0, jest green on every pass).
    - **Remaining:** on-device 10-foot tuning of `GRID_COLUMNS.tv`/`UI_SCALE.tv`; AES-128 stream check on TV; **Phase B** (launcher banner/icon presence — confirm in the Android TV launcher); **Phase E** (STB self-update — the `getAppVersion` poll → download/install-APK flow for sideloaded STBs with no Play Store); and physical-device verification — **an Android TV box and an Android STB unit** (emulator-only so far).
    - **Risks to validate on real hardware:** expo-video AES-128 key-header forwarding on TV; `@expo/ui` Picker D-pad focus on Android Compose; STOMP `ws://`/`wss://` over the TV network path.

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
| `hcard`+`pgbar` | `ContinueRow`/`ContinueCard` | REMOVED (22.14f) | 22.7 |
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
| `rp-art`/`eq` | `RadioPlayer` art + `Equalizer` | DONE | 22.11 |
| `radio-item` | `StationRow` | DONE | 22.11 |
| `adpop`/`ad-*` | `AdOverlay` | DONE | 22.15/Ph16 |
| mini-player dock | `RadioMiniPlayer` | DONE | 22.11 |

### D. Inputs / controls
`pill-input` → `ReusableInput` pill · `inp` (labeled) → `ReusableInput` labeled · `select.inp` → option sheet (not a native `<select>`) · `check` → `Checkbox` · `seg-choice` → `SegmentedChoice` · `tg` → `Switch` · `keypad` → `ParentalPinPad` · `track`+`knob` → player seek. RHF + zod for forms.

### E. Flow graph (mockup `go()`)
- **Boot:** splash → login (ours: native splash until boot resolves → guard routes).
- **Login** `Hyr` → ad(app-open) → home · register link.
- **Register** → terms (checkbox) → ad → home.
- **Home:** search→search · user→profile · TV/Radio toggle · channel tap→`openChannel`.
- **openChannel:** `lock`→PIN→ad→player · `geo`→geo · else→ad→player.
- **Player:** back→home · settings→options sheet · day-strip today=EPG/live, past=catch-up · quality sheet→toast.
- **Guide:** TV/Radio toggle · row→player/radio. **Profile**→settings; logout→login.
- **Ad:** app-open + channel-open (preroll) + mid-roll, one-ad-at-a-time app-wide, skip countdown.

### F. Data shapes — reconciled in 22.6b, then 2026-06-18 (`types/domain.ts`)
`CH`→`Channel` (package + isLive + isAdult + geoBlocked + thumbnail) · `RADIO` folded into `Channel` · `DAYS`→`CatchupDay` · `EPG`→`EpgItem` (+isLive, +playback embed) · `QUAL`→`QualityId` (resolved against `PlaybackDecisionDTO.streams`, not a separate manifest type).

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

> **Goal (user 2026-06-10):** after mobile QA (22.17), the large-screen pass (22.18), and backend wiring (11.X.9), do a final cross-cut so the app is **submittable** to both stores. This phase is the publishing checklist + compliance work that has **code/asset consequences** (privacy manifests, data-safety forms, content rating, account deletion, age gate) — start accruing takeaways here *as we hit them*, don't discover them at upload. Runs alongside / after Phase 21 (the EAS build + submit mechanics); 24 is the *requirements*, 21 is the *pipeline*. **This is currently the primary remaining-work phase alongside Sentry (14.1/5.X.12) and physical-device testing (21/22.18).**

**Apple — App Store**
- [ ] **24.1** **Privacy manifest** — `PrivacyInfo.xcprivacy` declaring data types collected (email, displayName, subscription tier, any analytics) + **required-reason APIs** (UserDefaults/MMKV file timestamp, keychain). Expo: config-plugin or manual; verify in the prebuild output.
- [ ] **24.2** **App Privacy "nutrition label"** in App Store Connect — must match 24.1 + actual backend collection. Tie to the real `/config` + analytics decision (Phase 14).
- [ ] **24.3** **ATT (App Tracking Transparency)** — only if analytics/ads do cross-app tracking. v1 ads are first-party static/scheduled creatives → likely **no IDFA / no ATT prompt**; document the "no tracking" stance either way.
- [x] **24.4** **Account deletion** — done (11.X.14, `DELETE /users/me` + Profile entry). Apple requirement satisfied.
- [ ] **24.5** **Age rating / content** — the 18+ parental content drives the questionnaire; ensure the parental gate is demonstrable to review (App Review will test it). Provide a **demo account** + note the PIN flow in review notes.
- [ ] **24.6** **Sign in / data minimization, export-compliance (HTTPS → encryption declaration), 3rd-party SDK disclosures** (Sentry, once installed), and required marketing assets (icon, screenshots per device class — incl. iPad, TV for tvOS/Android-TV parity messaging).

**Google — Play Store**
- [ ] **24.7** **Data safety form** — Play's equivalent of 24.2; must match actual collection. Keep one source-of-truth data inventory feeding both 24.2 + 24.7.
- [ ] **24.8** **Content rating (IARC questionnaire)** — driven by the 18+ content; gate must be present.
- [x] **24.9 (in-app half)** Account deletion in-app — done (11.X.14). **Remaining:** the public web URL to request deletion that Play also requires (not just in-app).
- [ ] **24.10** **Target API level + 16KB page size + foreground-service declaration** — the **radio foreground service** (background audio, 5.X.13) needs a Play foreground-service-type justification + privacy-policy mention.
- [ ] **24.11** **Closed testing requirement** — new personal Play accounts need **14-day / ≥12-tester** closed testing before production (also in 21). Sequence this early — it's a 2-week wall-clock gate.

**Cross-cutting**
- [ ] **24.12** **Privacy policy + Terms URLs** — public, reachable, wired from `/config` into Profile (overlaps 17.5 / 15.1). Both stores require a privacy-policy URL.
- [ ] **24.13** **Single data-inventory doc** (`docs/PRIVACY.md`) — what we collect / why / where stored / retention — the source feeding 24.1/24.2/24.7. Write once, reuse in both consoles.
- [ ] **24.14** **Demo/review credentials + reviewer notes** — a build pointing at staging with a test account, and notes explaining the parental PIN, geo overlay, and any region-locked content so reviewers aren't blocked.

> **Live audit (2026-07-14):** `docs/PUBLISHING_AUDIT.md` — severity-ranked burn-down generated by `/anxheloo-expo-publishing-audit` (re-run after fixes; resolved items disappear; the skill re-verifies official store policy live each run). It maps these Phase 24 items to concrete evidence + current policy sources.

> **Key takeaway for a future session:** the items with *code/asset consequences* (24.1 privacy manifest, 24.9 public deletion URL, 24.5/24.8 age gate, 24.10 foreground-service justification, 24.12 policy URLs) must be resolved **before** the final builds in Phase 21 — discovering them at upload re-opens feature phases. Treat 24.13 (data inventory) as the first task; everything else references it.

---

## 22.18-TV.b — Single Android artifact for phone + tablet + TV (2026-07-28) ✅

Collapses the two-build Android model (mobile prebuild vs `EXPO_TV=1` TV prebuild) into **one APK/AAB** that installs and runs on phone, tablet, Android TV and STB. Google's documented recommendation; enabled by `Platform.isTV` being a **runtime** signal on Android (`UiModeManager`), so the only build-time TV input is the manifest.

- [x] **New `plugins/withUniversalAndroidTV.js`** — always-on, Android-only, additive: leanback launcher category on the *existing* MAIN intent-filter, nine `<uses-feature required="false">` entries, TV banner. Never touches `android:icon` (that's what made `config-tv`'s `androidTVIcon` unusable in a shared build).
- [x] **`@react-native-tvos/config-tv` unregistered** (kept in devDeps for a future tvOS target) — its `EXPO_TV` gate also rewrites the iOS project into a tvOS target, so it can't run unconditionally.
- [x] **`expo-audio` → `recordAudioAndroid: false`** — `RECORD_AUDIO` implied `android.hardware.microphone` as REQUIRED, which makes Google Play hide the app from every TV device. Latent bug in the *previous* TV builds too; invisible because sideloading bypasses Play filtering. We never record.
- [x] **`plugins/withAndroidTVFocusFix.js` DELETED** — proven dead code on react-native-tvos 0.86: `enableCustomFocusSearchOnClippedElementsAndroid` already defaults `false` (Kotlin + C++ sources agree; no override in the runtime provider chain), so forcing it false was a no-op. Supersedes the 22.18 entry above, which records it as done and device-verified — accurate when written (RN 0.80-era default was `true`); upstream flipped the default at the SDK 56→57 / RN 0.86 upgrade and the plugin survived as invisible dead code. The D-pad through the channel guide is carried by the single-`FlatList` restructure, not this patch. **Re-check that default on every SDK upgrade.**
- [x] **EAS `*_tv` / `*_stb` profiles + `*:tv:*` npm scripts KEPT** by user decision — reference structure for other projects. `EXPO_TV` is now inert so they build identically; only `APP_PLATFORM=androidstb` still changes anything.
- [ ] **OPEN — STB runtime classification.** An operator STB is runtime-identical to retail Android TV, so `STB_ANDROID` still needs the build-time `APP_PLATFORM` flag. Proposed: the backend maps known operator `model` strings (already sent in the login `device` object) → `STB`, making a new box SKU a backend config row instead of an app release. **Needs backend sign-off** (loose end: the ad-impression beacon's client-side `?deviceClass=`).
- [ ] **OPEN — Play Console TV form factor.** Opt in, add TV screenshots + 1280×720 banner, pass TV review. Not automatic from the leanback intent. Feeds Phase 24.

Full mechanism + rationale: `rules/ARCHITECTURE.md → Android TV / STB`.

---

## 22.18-TV.c — `radio/[id]` made usable on TV (2026-08-06) ✅

Reported as "radio player screen is not shown correctly on Android TV". Root-caused to **two independent defects** on a booted `RTSH_TV_API34`, then fixed and re-verified by walking the remote.

- [x] **`RadioPlayer` artwork was never square — a cross-platform bug, not a TV one.** `styles.art` combined `width: '48%'` + `maxWidth: 160` + `aspectRatio: 1`, and Yoga derives the aspect-ratio height from the **percentage-resolved** width, then clamps only the width. Any parent wider than `160 / 0.48 ≈ 334dp` therefore got a 160-wide **tower**: 160×189 on phone, 160×394 on TV (an 820dp `useContentWidth('player')` column) — one box eating 73% of the TV's 540dp height, pushing the transport, day strip and entire EPG list below the fold of a screen that deliberately doesn't scroll. Fixed by clamping **both** axes (`maxHeight: ART`). Proven by hit-testing the live tree, not read off pixels.
- [x] **TV excluded from the split layout.** `splitLayout` was `tablet && isLandscape` (a deliberate 22.18 deferral). A 1080p set is **540dp tall at density 320 — shorter than the phone the stacked layout was drawn for** — while `UI_SCALE` steps tokens 1.3×, so even with the art square the schedule got ~43dp, under one row. Now `deviceClass === 'tv' || (tablet && landscape)`; per the user's call, TV/STB matches the tablet design exactly.
- [x] **Play button's focus ring was invisible** — `colors.focus` is `#EB122F`, the same value as `colors.primary`, so the ring was red-on-red on the one control that most needs feedback. Now rings in `colors.onPrimary`.
- [x] **Device-verified D-pad walk:** list ↔ day strip hand-off, strip → header back button, list row → transport at matching height, `select` toggles playback, `select` on a day chip loads that day + shows the past-day banner while radio keeps playing. The cross-scroller hazard flagged in `ARCHITECTURE.md → Android TV / STB` did **not** materialize, so the day strip was deliberately left as a sibling `FlatList` rather than folded into `ListHeaderComponent` — folding it in would make it scroll away and break tablet parity.
- [x] `tsc --noEmit` clean · `expo lint` clean · **104/104 tests**.
- [ ] **OPEN — `ReusableBtn`'s `primary` variant has the same invisible ring**, i.e. every primary CTA app-wide on TV (auth submit, confirms, PIN confirm); `destructive` needs the same check. Not fixed here to keep this change attributable. Two non-equivalent options (per-call-site token vs. changing the `focus` token itself) — decide in the 22.18 10-foot pass. See `ARCHITECTURE.md → Android TV / STB → Known gaps`.
- [ ] **OPEN — phone/tablet not re-verified on device** after the shared `RadioPlayer` art change. Off-TV the only visual delta is the art becoming genuinely square (the `splitLayout` expression is unchanged for tablet/phone, and the ring change is `isTV`-gated), but it was not seen on a device: the host disk is at 95%, so a second emulator would not boot alongside the TV one.

Full mechanism + rationale: `rules/ARCHITECTURE.md → Android TV / STB`.

---

## Reference
- Style guide: `.claude/rules/STYLE_GUIDE.md` · Architecture: `.claude/rules/ARCHITECTURE.md`
- Project memory: `.claude/memory/` · Design mockup: `.claude/docs/rtsh-tani-mobile.html`
- Original spec: `../assets/4._DST_-_OTT.docx`
