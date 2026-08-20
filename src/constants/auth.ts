import { Platform } from 'react-native';

export const REFRESH_TOKEN_KEY = 'rtsh.refresh_token';

/**
 * Guest mode — browse without an account — is **iOS only**.
 *
 * App Store Guideline 5.1.1(v) forbids gating non-account features behind
 * registration and rejected this app twice for it; Google Play has no
 * equivalent rule, so Android (phone, tablet, and TV — one artifact) keeps its
 * login wall untouched.
 *
 * Read in exactly two places: whether the "continue as guest" control renders,
 * and the boot mint branch. Everywhere else the guest state is simply
 * unreachable on Android, so shared expressions evaluate exactly as before.
 *
 * If this ever widens to Android, `TVNavButton` must switch from
 * `isAuthenticated` to `hasSession` — on TV the tab bar is hidden and that
 * button is the only way to change section, so a guest would be stranded on
 * Home with no route to sign in. It is invisible on a phone.
 */
export const GUEST_MODE_ENABLED = Platform.OS === 'ios';

/**
 * Whether a guest may play a past programme (catch-up). Product decision
 * 2026-08-20: they may not.
 *
 * Isolated here because it is the highest-risk part of the guest design —
 * catch-up is replay of free broadcast and is not account-based, which is the
 * exact shape 5.1.1(v) describes. If Apple objects, flipping this to `true`
 * re-opens catch-up with no other edit.
 *
 * Do NOT wire this to `/config` or flip it after approval: changing gated
 * behavior post-review is Guideline 2.3.1.
 */
export const GUEST_CATCHUP_ALLOWED = false;
