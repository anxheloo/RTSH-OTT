---
paths:
  - "src/store/createParentalSlice.ts"
  - "src/hooks/useParentalGuard.ts"
  - "src/components/ParentalPin/**"
  - "src/utils/pin.ts"
  - "src/app/**/settings.tsx"
  - "src/app/**/channel/**"
---

# Parental control (content gate)

## How it works today (post 22.14 / 22.14b / 22.14d; **device-level rewrite 2026-06-16**)

> **Model change 2026-06-16 (product decision).** The PIN is now handled **entirely on the client and is device-level, not account-level**. It is never sent to or read from the backend and is not carried on the user object. The config lives in `ParentalSlice` (`parentalEnabled` + `parentalPin`) and is persisted to MMKV alongside settings. This supersedes the 2026-06-15 "rides on the user object" model (and the older keychain-verifier + server-KDF design before that). Plaintext MMKV persistence of the PIN remains a deliberate, written exception to the "never persist a secret in plaintext" invariant — it's content gating, not a credential. See Persistence boundaries.

- **Device-level, client owns everything.** The config belongs to the device, so it survives logout/login and a second account on the same device inherits the same gate. There are **no parental endpoints, no mutations, no cross-device sync**. `ParentalSlice` is the single source of truth and holds both the config and the lockout UX state (5-try client lockout):
  - **`parentalEnabled: boolean`** — drives whether adult content is gated.
  - **`parentalPin: string | null`** — the device PIN, `null` until first set.
  - **`setParentalConfig({ enabled?, pin? })`** — the only writer. Setting a `pin` stores it; toggling `enabled` keeps the existing PIN so re-enable needs no re-entry.
- **Setup + toggle (Settings switch):**
  - **First enable, no PIN yet** → `ParentalPinModal mode="set"` (enter + confirm); on confirm the modal calls `setParentalConfig({ enabled: true, pin })`.
  - **Re-enable when a PIN exists** → `setParentalConfig({ enabled: true })` directly (no re-entry — turning protection on isn't a downgrade).
  - **Disable** → `ParentalPinModal mode="verify"` (local PIN check) first, then `setParentalConfig({ enabled: false })` — removing the gate is the sensitive direction.
- **Verify is a local hash compare (updated — audit 2026-07-03).** What's stored in `parentalPin` is a **SHA-256 hex digest**, not the raw digits: `ParentalPinModal` hashes on set (`hashPin`) and on verify (`verifyPin`, `utils/pin.ts` via `expo-crypto`). Still fully local — no network, no keychain — so the frequent live re-checks (22.14c) stay free; the hash just keeps the raw digit string out of the plaintext MMKV blob.
- **Gating keys on `parentalEnabled` and the EPG row's `isAdult`.** Adult content is gated **only when `parentalEnabled` is true** — a user who never set a PIN sees adult content ungated (their choice). The flag always comes from the **EPG item** (`EpgItem.isAdult`), never the `PlaybackDecision` response (which carries no adult flag). `useParentalGuard`'s `enabled` ANDs-in `parentalEnabled`. Settings/Profile/channel read `useAppStore((s) => s.parentalEnabled)`.
- **Hydration is automatic.** `parentalEnabled` + `parentalPin` are in the persist `partialize`, so the gate is known before any network on warm boot — no separate flag to seed, no dependency on a user payload.
- **One screen guard, two triggers — `useParentalGuard(channelId, { isLive, enabled })`** (22.14c + recorded-path gate, 2026-06-24). One PIN, one `ParentalPinModal`, one per-id verified set; the trigger differs by what you're watching:
  - **Live (continuous, only while `isLive`).** A clean live channel can roll into an 18+ programme mid-watch, so the guard watches today's EPG and re-gates on the transition. It derives the airing adult programme from a `nowTs` timestamp held in state (render stays pure), arms a single `setTimeout` to the next programme edge that chains boundary→boundary, and re-evaluates on app-foreground (RN timers throttle while backgrounded). On entry to an `isAdult` programme the player unmounts (no A/V leak) and the verify modal shows; cancel stays blocked (`blockedDismissed`) with a re-unlock affordance; resolution is once-per-`programId`. The live branch is disabled when `!isLive` (so a recording isn't gated by whatever airs live now).
  - **Recorded (on-demand, at the tap).** Tapping a past programme plays a _known_ item — nothing to time-match — so `guard.guardPlay(program, onAllowed)` keys on that item's own `isAdult` and runs `onAllowed` (the `setSelectedProgramId` swap) only after the PIN verifies, so the signed stream URL is never fetched pre-PIN. Clean items play immediately.
  - **Future/scheduled** rows are non-playable (`ProgramRow` `disabled`), so there's no playback to gate.
  - Verification is the local compare (no network per boundary or per tap). A pending recorded gate takes precedence over a live prompt in the shared modal.

## Why these choices

- **Content gating, not a credential.** A 4–6 digit PIN that only blocks adult-flagged content isn't a real secret; the threat model is a curious child on a shared device, not an attacker. So it lives entirely client-side, verification is a local SHA-256 compare (`utils/pin.ts` — a hash, not KDF: keeps raw digits out of MMKV without credential-grade machinery), and there's no keychain cache and no server round-trip. **Boundary:** never reuse this PIN to gate anything that matters (purchases, account changes).
- **Device-level, not account-level (2026-06-16).** The gate protects _this device's_ viewing, regardless of who is signed in — so it's owned by the device (MMKV), not the account. It persists across logout/login and is intentionally NOT synced across a user's devices (each device sets its own PIN). Simpler than the account model and matches how a shared living-room device is actually used. **One exception clears it: account deletion** (`DELETE /users/me` → `clearParentalConfig`, see Auth flow 5a) — deletion erases the device's account data, so the gate goes with it; logout/login do not.
- **Content-level, not app-entry.** The PIN gates adult-flagged content (channel/program `isAdult`), not app launch — the `(auth)`/`(app)` guard is separate and keys on `isAuthenticated` only. A FaceID/PIN app-lock is a deliberately deferred, separate gate.

## Known gaps

- **Change-PIN / forgot-PIN deferred.** Change-PIN would extend `ParentalPinModal` (verify old → set new); forgot-PIN on a device-level client-only PIN means a local reset flow (UI not built). No backend involvement either way.
- **Per-device by design — no sync.** A user with multiple devices sets the PIN separately on each. Intentional (device-level), not a defect, but worth stating: a change on one device does not propagate.
- **Geo-blocking is CDN-enforced on channel open** (2026-06-22), with a **per-programme client look-ahead added 2026-07-01** — see Real-time → Geo. Whole-channel geo surfaces via the `PlaybackDecision`/`GEO_BLOCK` push; per-programme geo rides a `decision` flag on each EPG row (`useLiveProgramBlock` stops live at the boundary; a `programId`-scoped `GEO_BLOCK`/`GEO_LIFT` flips the cached row live). The flag is a UX look-ahead only — hard enforcement stays CDN/signed-URL. Tracked **15.2 / 11.X.9**.
- ~~**Catch-up/VOD program-level gate**~~ — **closed 2026-06-24.** Recorded playback now gates on the tapped programme's own `isAdult` at selection (`guard.guardPlay`), before the stream fetch. Both live (22.14c) and recorded paths are covered by `useParentalGuard`.
- **Channel-level gate still off** — the channel list / `PlaybackDecision` carry no `isAdult`, so there is no whole-channel lock. By design the per-programme gate covers every adult slot precisely (a channel mixes adult + clean programmes, so a channel lock would over-block clean recordings). Wire a channel-level check only if the backend adds channel `isAdult` and the product wants it.

---
