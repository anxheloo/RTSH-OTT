/**
 * Runtime polyfills — imported FIRST, at the top of the root `app/_layout.tsx`,
 * before any other module loads.
 *
 * `TextEncoder` / `TextDecoder` — required by `@stomp/stompjs` to encode/decode
 * STOMP frames (we force binary frames on RN — see realtime/client.ts — so BOTH
 * are on the hot path). Hermes ships `TextEncoder`, but `TextDecoder` has been
 * unreliable/absent on RN (present only in debug via the JS-debugger's runtime,
 * missing in release builds — a classic "works in debug, breaks in release" trap;
 * stomp-js issue #149). This guarded fallback installs the pure-JS implementation
 * only when a global is actually missing, so it's a no-op where the engine already
 * provides one and a guaranteed shim where it doesn't. Pure JS — no native code,
 * no autolinking, EAS-safe.
 */
import { TextDecoder, TextEncoder } from 'fastestsmallesttextencoderdecoder';

const g = globalThis as unknown as { TextEncoder?: unknown; TextDecoder?: unknown };

if (typeof g.TextEncoder === 'undefined') g.TextEncoder = TextEncoder;
if (typeof g.TextDecoder === 'undefined') g.TextDecoder = TextDecoder;
