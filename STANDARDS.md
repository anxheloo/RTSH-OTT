# STANDARDS.md — Production Expo / React Native Reference

A portable, project-agnostic reference for building an Expo app to a gold-standard
bar. Distilled from the RTSH-OTT codebase and hardened during a dedicated
standards pass. Copy this into a new project and adapt.

Each rule is **decision + why**. Where a choice is a project preference rather
than a universal, it's marked _(preference)_. Where a rule is Expo/RN-specific
(not general web), it's marked _(RN)_.

> Grounding note: this pass could not run its intended side-by-side against the
> Code with Beto reference repos (MCP unavailable at authoring time). Rules below
> are grounded in current industry standard + the official Expo 56 / Zustand /
> TanStack Query v5 docs. Revisit the structure sections against CWB's repos when
> the connection recovers.

---

## 0. Operating discipline (non-negotiable)

- **Verify before "done."** `tsc --noEmit` + lint must pass before any claim of
  completion. Evidence before assertion.
- **One concern per commit.** Small, reviewable, independently-building commits.
  A reader should understand the change from the subject line.
- **Doc-sync in the same change.** If a change alters documented behavior, update
  the docs in the same commit — never leave them stale.
- **Logic-preserving by default.** A change that alters runtime behavior, and
  especially one that changes what a backend/API sees, is a separate, explicit
  decision — never a side effect of a cleanup.
- **No `console.*` in commits** except an intentional, `__DEV__`-gated diagnostic
  (or a real logger/Sentry breadcrumb). Temporary debug logging is removed before
  merge.

---

## 1. Project structure

Layer-based `src/` (not feature-first at the top level), with one clearly-named
folder per concern:

```
src/
  app/          Expo Router routes (file-based)
  api/          client + endpoints + services + queries + mutations + mocks
  components/   Reusable* primitives + domain components (foldered)
  hooks/        cross-cutting React hooks
  store/        Zustand slices + composed store
  theme/        design tokens (colors, spacing, fonts, …)
  responsive/   device-size decisions (portable, self-contained)
  lib/          platform/security infra (keychain, token vault) — NOT api calls
  constants/    all compile-time literals (one folder)
  types/        domain types + zod-inferred types
  utils/        pure helpers
  i18n/         translations
  features/<x>/ cohesive domain logic (schemas, errors) when it earns a folder
```

Rules:

- **Never name two things "services."** Domain API calls live in `api/services/`.
  Platform/security infra (keychain, token vault, native wrappers) lives in
  **`lib/`**. A top-level `services/` next to `api/services/` is a naming
  collision that confuses every newcomer.
- **One `constants/` folder** for all literals. Don't split a separate `config/`
  for what are really constants (keys, URLs) — "config" implies runtime/env
  configuration, not string literals.
- **`features/<domain>/` when it earns it.** Cohesive domain logic (e.g. a
  feature's zod schemas + error mapping) belongs together, not scattered into
  `types/` and elsewhere. Don't force a feature-folder for a single file, and
  don't scatter a cohesive one for the sake of "consistency."
- **Barrels: complete or absent — never partial.** A barrel (`index.ts`) that
  silently omits some of its folder's exports is a landmine (an importer gets
  `undefined`). Barrel at genuine public boundaries (a component library folder,
  a token set); direct-import for single-consumer infra is fine. **Export the
  component/hook, not its `Props` type** — Props import directly from the file.
- **`@/` path alias, always.** No deep relative imports (`../../../`).
- **Import order** is enforced (React/RN core → third-party → `@/` internal by
  layer → relative). Automate it (`eslint-plugin-simple-import-sort`), don't
  hand-maintain it.

---

## 2. State — Zustand slices _(RN/any)_

Single store composed from slices; MMKV-persisted with an explicit `partialize`.

- **Canonical slice typing** — every slice creator is
  `StateCreator<AppStore, [], [], XSlice>` (first generic = the **full** store,
  last = the slice's own shape), importing `AppStore` as a **type-only** import:

  ```ts
  import type { AppStore } from './useAppStore';
  export const createXSlice: StateCreator<AppStore, [], [], XSlice> = (set) => ({ … });
  ```

  Self-typing a slice as `StateCreator<XSlice>` breaks composition under
  middleware (persist) and forces an `as any` cast in the store. Use the full-
  store form uniformly — it's the official "slices with middleware" pattern.
- **`updateXSlice: set` universal partial setter** on every slice for simple
  batched updates, plus named domain actions for complex ones. `set` is the only
  mutator; never expose raw `set` to components.
- **Selectors at the call site:** `useAppStore((s) => s.field)`. Extract a custom
  hook only when reused in 3+ places.
- **Imperative access outside React** (interceptors, services):
  `useAppStore.getState()`.
- **`onRehydrateStorage`** applies post-hydration side effects (e.g. re-resolve
  theme). Async I/O happens before `set` in async actions.

---

## 3. Persistence boundaries

| Data | Storage | Why |
|---|---|---|
| Refresh token | Keychain (secure store), or memory-only per a "remember me" choice | Hardware-backed when persisted; memory-only = fresh start next launch |
| Access token | In-memory (store) | Short-lived; ephemeral by design |
| User/settings/theme/low-sensitivity | MMKV (persist) | Fast sync reads |
| Server data | Query cache (selective persist) | Owned by TanStack |

- **Never persist a real credential in the plaintext MMKV blob.** Secrets are
  keychain- or memory-only. Non-credential content gating (e.g. a device PIN) can
  be a documented exception.
- A single **vault module** owns every read/write of the refresh token, so the
  boot check, 401 refresh, logout, and rotation stay agnostic to *where* it lives.

---

## 4. Data fetching — TanStack Query v5

- **Layering:** `services/*` (pure async fns, no hooks/store) → `queries/*` +
  `mutations/*` (hooks wrapping them). Query keys are arrays, resource-first
  (`['channels', type]`).
- **Centralized error handling.** v5 removed per-`useQuery` `onError`, so
  unexpected failures are handled **once** via `QueryCache`/`MutationCache`
  `onError` on the `QueryClient` (open a global error modal; query offers Retry,
  mutation dismisses). Do **not** react to query `error` in a `useEffect`.
- **Meta flags for opt-out**, typed via module augmentation:
  - `INLINE_CLIENT_ERROR` — forms that render their own errors: suppress the
    global modal **only for client (4xx)** failures; 5xx/network still modal.
  - `SILENT_ERROR` — fire-and-forget metadata calls: suppress at any status.
- **Named `mutationFn`** (not inline arrow). Query hooks return safe defaults
  (`data ?? []`).
- **Retry policy** never retries a 401 (let the interceptor own refresh).

---

## 5. HTTP client — axios

- **One client.** Request interceptor injects auth + locale headers; response
  interceptor refreshes on 401 and retries once.
- **Injection over import** _(pattern)_ — the client stays a thin transport: it
  knows *when* to refresh (401), not *how*. The refresh handler (which touches
  store + keychain + logout) is **registered** from one layer up
  (`registerRefreshHandler`). This breaks the client↔auth-service import cycle,
  mirroring `axios-auth-refresh`.
- **Bare instance for the refresh endpoint** so a 401 on refresh can't deadlock
  the interceptor. **Single-flight** dedup lives inside the refresh fn.
- **Only a confirmed 401/403 logs out.** Transient failures (offline, 5xx,
  timeout) never wipe the session.
- Base URL: hardcoding it in source (bundled identically for local/EAS/OTA) is a
  valid _(preference)_ — but keep the app's env surface honest: document exactly
  which env vars are actually read.

---

## 6. Boot / Splash _(RN/Expo)_

- **Native splash only.** Hold it for the whole boot; `return null` until the
  boot gates resolve so no pre-auth screen flashes on a JS/Metro reload.
- **Font gate = `fontsLoaded || fontError`** (canonical Expo `useFonts` +
  `SplashScreen` pattern). A *failed* font must fall back to system fonts and let
  the splash hide — never wedge boot.
- **One-time wiring at module scope, guarded.** Auth-refresh registration, focus
  bridge, i18n init run once at module load, wrapped so a first-run native-init
  throw on a fresh install can't abort module evaluation.
- **Keychain read in `try/finally`** so the "checked" gate always flips — the
  first secure-store read on a fresh install can throw while the OS keystore
  initializes; swallow → treat as "no session" and let the app recover.
- Boot is **offline-first**: no network round-trip gates the splash.

---

## 7. Theme & responsive _(RN)_

- **Store-driven theme, no Context.** Components read `useAppStore((s) => s.colors)`.
  Toggle swaps the `colors` object reference.
- **Tokens, no magic numbers.** Fonts, spacing, radii, colors come from token
  files.
- **Scale at the token layer only.** A per-device-class multiplier is applied
  once at the token source (`FONTSIZE`, `SPACING`) — never hand-scaled inside a
  component. Layout is reactive (columns track the window); sizing is static
  (resolved once — font jumps on rotate are jarring).
- **Physical-device classification (for the backend) is separate from
  window-classification (for layout).** Don't unify them.

---

## 8. Components

- **`Reusable*` prefix** for shared primitives; domain names for feature
  components. Props type (`XProps`) **above** the component; `StyleSheet.create`
  **after**; `export default` is the file's last statement.
- **`React.memo` only** inside virtualized lists or high-frequency renders; set
  `displayName` when memoized.
- **`testID` on interactive leaves.**
- **Modals via a single modal slice** + one wrapper — callable from anywhere
  (components, async flows, interceptors). Never `Alert.alert`, never local modal
  state.
- **Lists:** one vertically-scrolling virtualized list owns the screen; secondary
  regions go in `ListHeaderComponent`. Never nest same-orientation lists. Drive
  grid `numColumns` from a responsive hook, not a hardcoded number.

---

## 9. Logging & errors

- No `console.*` in commits. Intentional error diagnostics are `__DEV__`-gated
  (so they never ship) or routed to a logger/Sentry breadcrumb.
- User-facing failures flow through the modal slice; forms render field-actionable
  (4xx) errors inline.

---

## 10. Documentation discipline

- **Current-state docs must match the code.** When you move/rename, repoint every
  current-state reference in the same change.
- **Changelogs and historical plans are append-only, point-in-time records.**
  Don't rewrite paths inside old entries when something moves — add a *new* entry
  noting the move, so history stays truthful and the current state is discoverable.
- **Honesty about "planned vs implemented."** A reference project's docs must not
  claim a dependency is installed when it isn't. Mark planned work as planned.

---

## 11. Known gold-standard gaps (close these to reach the bar)

These are the deltas between "very good" and "reference-grade." Named honestly so
they're not mistaken for done:

- **Tests — the biggest gap.** A reference app should model at least unit tests
  for pure logic (formatters, schedulers, reducers) and component tests for
  primitives. Add `jest` + `@testing-library/react-native`.
- **Crash reporting (Sentry).** Wire it, or don't list it in the stack.
- **Barrels** — consider trimming to genuine public boundaries rather than one
  per folder, to avoid circular-import and cold-start costs. Measure before
  ripping out working ones.

---

_Derived from RTSH-OTT (Expo SDK 56 · RN 0.85 · React 19 · Zustand · TanStack
Query v5 · MMKV · Expo Router). Adapt versions and specifics per project._
