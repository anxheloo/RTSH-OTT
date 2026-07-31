/**
 * Sentry crash / error monitoring — the single `Sentry.init` site for the app.
 *
 * Closes plan items **14.1 / 5.X.12 / 11.Y.6** (deferred 2026-07-03). Lives in
 * `lib/` because that is where platform/security infra belongs (alongside
 * `keychain.ts` / `tokenVault.ts`) — it is not a domain API call.
 *
 * **Import this module for side effects at the very top of the boot chain**
 * (`app/_layout.tsx`, right after `@/polyfills`) so the SDK is armed before any
 * other module can throw. `initMonitoring()` is idempotent and safe to call twice.
 *
 * ## What this file is responsible for
 *
 * - **The DSN is PUBLIC, the auth token is SECRET.** The DSN is embedded in
 *   every shipped bundle by design — it only permits *writing* events. It is
 *   therefore hardcoded here, exactly like `API_BASE_URL` in `api/client.ts`
 *   and for the same reason (one value, bundled identically for local / EAS /
 *   OTA builds, and the app's env surface stays honestly documented as
 *   `EXPO_PUBLIC_API_MODE` only). Abuse of a public DSN is answered by spike
 *   protection + rate limits on the Sentry project, not by hiding it.
 *   `SENTRY_AUTH_TOKEN` — which can publish releases to the org — is a real
 *   secret, lives only in `eas env` / the local shell, and never appears here.
 *
 * - **`environment` separates the variants.** Without it every build pools into
 *   one stream: simulator noise sits beside real user crashes, the crash-free
 *   rate is meaningless, and "alert me on a new issue in production" cannot be
 *   expressed at all. Derived from **`Application.applicationId`** — the installed
 *   binary's own identity — and deliberately NOT from `extra.appVariant`, which a
 *   dev server or an OTA manifest can silently override. Full reasoning at the
 *   `APP_VARIANT` const below; do not "simplify" it back to `extra`.
 *
 * - **PII is scrubbed on BOTH channels.** `beforeSend` scrubs the *event*;
 *   `beforeBreadcrumb` scrubs the *breadcrumbs*, which are collected separately.
 *   That second hook is not optional here: the axios client in `api/client.ts`
 *   sets an `Authorization: Bearer <token>` header on every request, and Sentry's
 *   default HTTP breadcrumb integration records request metadata — so a token
 *   can reach Sentry past a flawless `beforeSend`. See `rules/ARCHITECTURE.md →
 *   Observability`. This is the ISO 27001 "no PII / credentials in logs"
 *   obligation from the contract, enforced in code.
 *
 * - **`sendDefaultPii: false`.** Sentry's own docs example ships `true`. That is
 *   defensible (IP-derived geo + headers improve grouping), but this app holds
 *   auth tokens and is subject to a store data-safety declaration, so the
 *   default here is off. Flipping it is a deliberate decision that must be
 *   recorded in `rules/ARCHITECTURE.md` and re-declared to the publishing audit.
 *
 * ## Known limits (do not mistake these for bugs)
 *
 * - `beforeSend` intercepts **JS-layer errors only**. Native hard crashes
 *   (dyld, OOM, ANR) bypass it entirely — they are scrubbed by what you never
 *   put in native context, not by this hook.
 * - Native crashes, slow/frozen frames and TTID require a **native build**
 *   (`expo run:*` / `eas build`); they do not work in Expo Go.
 */
import * as Sentry from '@sentry/react-native';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

/**
 * Public write-only DSN for `acsolutions-1a/react-native-rtsh-ott`.
 * NOTE the `.de.` — this org lives in Sentry's **EU region**. Every tool that
 * talks to it (the config plugin, sentry-cli, the source-map uploader) must
 * point at `https://de.sentry.io/`, not `https://sentry.io/`, or uploads land
 * in the wrong region and traces stay minified with no error anywhere.
 */
const SENTRY_DSN =
  'https://b83db61ca914abe66508b9f44c9247e5@o4511819049336832.ingest.de.sentry.io/4511819054317648';

type AppVariant = 'development' | 'preview' | 'production';

/**
 * Which variant is running, derived from the **binary's own identity** — never
 * from `extra.appVariant`.
 *
 * `extra` is NOT baked once at build time: it is whatever the process that minted
 * the *current manifest* evaluated `app.config.ts` to, and two of those processes
 * routinely run without `APP_VARIANT` set (where `app.config.ts` falls back to
 * `'production'`):
 *
 * 1. **Metro.** A dev client attached to a dev server reads the server's manifest,
 *    which outranks the config embedded in the binary (`expo-constants` resolves
 *    `rawUpdatesManifest ?? rawDevLauncherManifest ?? rawAppConfig`). A bare
 *    `npm start` therefore labels a `.dev` simulator build `production` — observed
 *    2026-07-31 on issue `REACT-NATIVE-RTSH-OTT-2`, which is what prompted this.
 * 2. **`eas update`.** It re-evaluates `app.config.ts` in its own process and
 *    embeds the result in the update manifest — which outranks the binary's copy
 *    for every user who takes the update. Note a shell `VAR=x cmd1 && cmd2` prefix
 *    binds to `cmd1` ONLY, so even the `eas:update:*` scripts left it unset until
 *    they were fixed alongside this.
 *
 * `Application.applicationId` is read from the installed binary (iOS bundle id /
 * Android package name), so no manifest — dev-server or OTA — can override it.
 * The suffixes mirror `getVariantValues()` in `app.config.ts`; keep them in sync
 * if a bundle id ever changes.
 *
 * `production` stays the fallback for an unrecognized id: mislabeling a real
 * production crash as `development` hides it from the stream that matters, which
 * is strictly worse than the reverse.
 */
const APP_VARIANT: AppVariant = ((): AppVariant => {
  const id = Application.applicationId;
  if (id?.endsWith('.dev')) return 'development';
  if (id?.endsWith('.preview')) return 'preview';
  return 'production';
})();

/**
 * Trace 20% of transactions in the field. `1.0` in production is a metered-spend
 * bug, not a style nit — every transaction is billed. Full sampling stays on in
 * dev where volume is a rounding error.
 */
const TRACES_SAMPLE_RATE = __DEV__ ? 1.0 : 0.2;

/**
 * Depth cap for the scrubber. It exists to bound work on a pathological payload,
 * NOT to give up — see `scrubValue`, which returns the redaction placeholder at
 * the cap. A cap that returned the raw value instead would leak every sensitive
 * key nested past it while tsc, lint and expo-doctor all stayed green.
 */
const MAX_SCRUB_DEPTH = 8;

const REDACTED = '[redacted]';

/**
 * Keys whose *values* never leave the device. Matched case-insensitively as a
 * substring, so `refreshToken`, `X-Auth-Token` and `accessToken` all hit.
 * Deliberately broader than strictly necessary: a false redaction costs one
 * debugging session, a false pass costs a credential.
 */
const SENSITIVE_KEY =
  /(authorization|auth|token|password|secret|cookie|session|credential|pin|email|bearer|refresh)/i;

/** Query params stripped out of any URL before it is reported. */
const SENSITIVE_QUERY_PARAM = /^(token|refreshToken|access_token|code|resetToken|pin|email)$/i;

/** Redacts sensitive query params while keeping the path — the path is the useful half. */
function scrubUrl(url: string): string {
  const [base, query] = url.split('?');
  if (!query) return base;
  const scrubbed = query
    .split('&')
    .map((pair) => {
      const [key] = pair.split('=');
      return SENSITIVE_QUERY_PARAM.test(decodeURIComponent(key)) ? `${key}=${REDACTED}` : pair;
    })
    .join('&');
  return `${base}?${scrubbed}`;
}

/**
 * Deep-redacts sensitive keys. **Fails closed**: at `MAX_SCRUB_DEPTH` it returns
 * the placeholder, never the untouched subtree.
 */
function scrubValue(value: unknown, depth = 0): unknown {
  if (depth >= MAX_SCRUB_DEPTH) return REDACTED;
  if (typeof value === 'string') return scrubUrl(value);
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(val, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Errors filtered before they burn quota or bury the signal. Every entry is a
 * *known-transient* condition this app already handles by design — an offline
 * subway commute, a cancelled request on fast navigation, a socket the OS
 * dropped on background. Do NOT extend this list without a written reason: an
 * unexplained filter is how a real bug stays invisible for months.
 */
const IGNORED_ERRORS: (string | RegExp)[] = [
  'Network Error', // axios, offline / DNS — surfaced to the user via the noInternet modal
  'AbortError',
  'canceled', // axios cancel token on fast navigation away from a screen
  /timeout of \d+ms exceeded/, // axios timeout — retried by TanStack, not a defect
  'Non-Error promise rejection captured',
];

/**
 * expo-router navigation instrumentation. Declared above `initMonitoring` because
 * the init consumes it; it is registered with the actual container via
 * `registerNavigationContainer` from the root layout once the ref exists. Without
 * it a crash tells you the app broke but not which screen the user was on.
 */
export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

let initialized = false;

/**
 * Arms Sentry. Idempotent — a second call is a no-op rather than a second client.
 */
export function initMonitoring(): void {
  if (initialized) return;
  initialized = true;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_VARIANT,

    // `release` / `dist` are DELIBERATELY NOT SET — do not add them back.
    //
    // The SDK derives them natively as `<bundleId>@<version>+<build>`
    // (`integrations/release.js`: `${nativeRelease.id}@${nativeRelease.version}+${nativeRelease.build}`),
    // which is byte-identical to what the `@sentry/react-native/expo` plugin uploads
    // artifacts under, because both read the same native app info. Setting `release`
    // here OVERRIDES that (same file, the `options.release` branch wins) — and an
    // override that omits `+build` silently pools every build into ONE release:
    // crash-free rate per build, adoption, and "new issue in the latest release"
    // all stop distinguishing build 4 from build 10.
    //
    // Found live 2026-07-29: this file previously set `al.rtsh.tani@1.0.0` while the
    // uploads landed under `al.rtsh.tani@1.0.0+N`. Nothing errored — stack traces
    // stayed readable (Debug IDs, see metro.config.js) so the mismatch was invisible
    // except as an empty Releases page. Omitting both is the fix: there is no string
    // left for the two sides to disagree on.

    tracesSampleRate: TRACES_SAMPLE_RATE,

    // See the file header: this app holds auth tokens and carries a store
    // data-safety declaration. Flipping this is a recorded decision, not a tweak.
    sendDefaultPii: false,

    ignoreErrors: IGNORED_ERRORS,

    // Never leave this on in a shipped build — it is verbose and slows the SDK.
    debug: false,

    integrations: [navigationIntegration],

    /** Channel 1 — the error event itself. JS-layer only (native crashes bypass it). */
    beforeSend(event) {
      if (event.request) {
        if (event.request.url) event.request.url = scrubUrl(event.request.url);
        event.request.headers = scrubValue(event.request.headers) as typeof event.request.headers;
        event.request.cookies = undefined;
        event.request.data = scrubValue(event.request.data);
      }
      if (event.extra) event.extra = scrubValue(event.extra) as typeof event.extra;
      if (event.contexts) event.contexts = scrubValue(event.contexts) as typeof event.contexts;
      // Keep the opaque account id (that is what makes impact counting possible);
      // drop every directly-identifying field even if something set one upstream.
      if (event.user) {
        event.user = { id: event.user.id };
      }
      return event;
    },

    /**
     * Channel 2 — breadcrumbs, collected separately from the event and the reason
     * `beforeSend` alone is not a privacy control. Sentry's default integrations
     * record HTTP requests and console output; both routinely carry tokens here.
     */
    beforeBreadcrumb(breadcrumb) {
      // Console breadcrumbs are pure noise in a codebase whose style guide bans
      // committed `console.log` — and the one place a stray token would surface.
      if (breadcrumb.category === 'console') return null;

      if (breadcrumb.data) {
        breadcrumb.data = scrubValue(breadcrumb.data) as typeof breadcrumb.data;
      }
      if (typeof breadcrumb.message === 'string') {
        breadcrumb.message = scrubUrl(breadcrumb.message);
      }
      return breadcrumb;
    },
  });

  // Which JS is running? Two devices on the same binary can be on different OTA
  // bundles (runtimeVersion policy is `appVersion`), so without this an
  // OTA-introduced crash is indistinguishable from a crash in the store build.
  Sentry.setTag('ota_update_id', Updates.updateId ?? 'embedded');
  Sentry.setTag('ota_channel', Updates.channel ?? 'none');
  Sentry.setTag('app_variant', APP_VARIANT);
}

/**
 * Attaches the signed-in account to subsequent events. **Opaque id only** — never
 * the email or display name (`sendDefaultPii` is off and the scrubber drops them
 * anyway). Without an identity Sentry cannot tell "one user hit this 400 times"
 * from "400 users hit it once", which is the difference between a nuisance and
 * an outage. Called from `store/createUserSlice.ts` at the single auth chokepoint.
 */
export function setMonitoringUser(userId: string): void {
  Sentry.setUser({ id: userId });
}

/**
 * Clears the account identity on sign-out. Without this the next person to use
 * a shared device (a living-room STB is the obvious case) inherits the previous
 * user's identity in every crash report.
 */
export function clearMonitoringUser(): void {
  Sentry.setUser(null);
}
