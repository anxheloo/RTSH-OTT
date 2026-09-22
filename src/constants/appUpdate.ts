/**
 * Store-update switch — tells users of THIS version that a newer one is in the
 * App Store / Play Store. Something an OTA cannot deliver (native code, icons),
 * so the only thing we can do is send them to the store.
 *
 *   'off'    — nothing shown. ALWAYS the value on `main`.
 *   'notice' — a strip under the brand header that cannot be closed; tap opens the store.
 *   'block'  — the blocking `forceUpdate` modal; the app is unusable until updated.
 *
 * Turned on ONLY in an OTA published to an OLDER runtime, from that release's
 * git tag (runbook: CLAUDE.md → Releasing). Never commit a non-'off' value to
 * `main`: the next store build would embed it and show the notice to users who
 * already have the newest version. `appUpdate.test.ts` fails if it happens.
 */
export type StoreUpdateMode = 'off' | 'notice' | 'block';

export const STORE_UPDATE_MODE: StoreUpdateMode = 'off';
