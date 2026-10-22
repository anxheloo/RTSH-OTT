---
paths:
  - "src/store/storage.ts"
  - "src/store/useAppStore.ts"
  - "src/constants/storage.ts"
  - "src/lib/keychain.ts"
  - "src/lib/tokenVault.ts"
---

# Persistence boundaries

| Data                                                                                                        | Storage                                                                                          | Why                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Refresh token                                                                                               | Keychain (`expo-secure-store`) **if "remember me" is on**, else **in-memory only** (token vault) | Hardware-backed when persisted; "remember me" off keeps it out of at-rest storage → fresh start on next launch. See Auth flow → Remember me |
| User profile (`user`), settings, theme mode, **device parental config (`parentalEnabled` + `parentalPin`)** | MMKV (Zustand persist, **plaintext by design** — see decision below)                             | Fast sync read; persistence survives reinstalls per-platform behavior                                                                       |
| Access token                                                                                                | In-memory only (Zustand)                                                                         | Short-lived; survives only this app session                                                                                                 |
| Server data (channels, EPG, catch-up)                                                                       | TanStack Query cache                                                                             | Coming with `queries/` layer                                                                                                                |
| Resume positions per program                                                                                | MMKV (separate key)                                                                              | Frequent writes, no sync needed                                                                                                             |

## Known gaps

- **MMKV plaintext — accepted risk, won't encrypt (decided 2026-06-10, 5.X.10).** Real secrets are keychain-only (refresh token) or memory-only (access token); the MMKV blob holds only low-sensitivity PII (email / displayName / subscription tier) + boolean settings, and the OS sandbox blocks other apps from reading it. Encryption would only defend a physical-device-compromise + file-extraction scenario, leaking non-credential data — not worth the async-boot refactor. **Invariant (amended 2026-06-15):** never persist a real _credential_ into this plaintext blob (keep auth tokens in keychain). The device parental `pin` (in `ParentalSlice`) is a deliberate exception — it's content gating, not a credential (see Parental control), so plaintext persistence is acceptable for it specifically. The lightweight guard is the `user` field-whitelist (5.X.17), not encryption.
- **Writes are best-effort (2026-10-06).** `store/storage.ts` swallows a failed MMKV write. zustand's persist writes synchronously inside every `set()`, AFTER the state is applied, so a throwing write (a box with a full disk) used to escape from whatever action triggered it — `setRememberMe` threw before the login request was sent (REACT-NATIVE-RTSH-OTT-2M), the NetInfo listener threw on every change (-2J). State stays correct in memory; only persistence is lost. Locked by `store/__tests__/storage.test.ts`.
- ~~**`user` blob unbounded.**~~ **Resolved (5.X.17).** `persistUser()` in the store's `partialize` (`store/useAppStore.ts`) whitelists the exact fields that reach the plaintext MMKV blob (`id`, `email`, `displayName`, `username`, `age`, `location`, `gender`, `educationLevel`, `avatarUrl`, `subscription`) — a future sensitive `User` field (a token, a verification secret) can't silently land on disk; it must be added to the list on purpose. This is the chosen mitigation in place of encryption.
- `clearAppStorage(keys)` now takes explicit keys to avoid nuking unrelated MMKV caches on logout — done in 5.5a.

---
