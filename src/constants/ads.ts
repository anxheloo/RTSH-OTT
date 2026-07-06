/**
 * Ad-orchestration constants.
 */

/**
 * How long to wait after the ad's host screen has settled before revealing the
 * preroll overlay (app-open + channel-change). Eases the ad in a couple seconds
 * after the page has rendered instead of snapping it up the instant it's
 * fetched. Consumed via `useDelayedReveal` at both preroll sites.
 */
export const AD_REVEAL_DELAY_MS = 2500;

/**
 * Fallback viewing window for a mid-roll that arrives WITHOUT a usable
 * `validUntil` (absent / unparseable / zero-width). A scheduled break is a moment
 * in time; if the client only reaches its `startTime` more than this late — e.g.
 * the app was backgrounded across the break (RN suspends JS timers), so the
 * scheduler re-evaluates late on foreground — the break is treated as missed and
 * skipped rather than shown arbitrarily late. `validUntil`, when the backend sends
 * a valid one, is authoritative and overrides this. Fire-now ads (no `startTime`)
 * have no reference instant and are exempt. Consumed by `midrollLapsed` (`@/realtime`).
 */
export const MIDROLL_MAX_STALENESS_MS = 5 * 60 * 1000; // 5 min
