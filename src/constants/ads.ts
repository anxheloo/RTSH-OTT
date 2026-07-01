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
