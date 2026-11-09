# Diagnostics — RTSH-OTT

> **Current state as of 2026-11-09** (Sentry review before the 1.1.0 release) · 10 open, 1 fixed in 1.1.0 (watching), 2 closed; the top problem is backend-side.
> Everything above **Run log** is rewritten by each run. The Run log is append-only, newest
> first, and an entry is never edited once committed — a run adds an entry, never a new file.

## Contents

- 2026-11-09 · Investigate · Sentry, last 90 days, before the 1.1.0 release

## Open problems

Users are unique users in the window of the run that last measured them. Issue ids are Sentry
short ids in project `react-native-rtsh-ott` (org `acsolutions-1a`, EU region).

| Problem | Release | Users | Fatal | Hypothesis (one line) | Status |
|---|---|---|---|---|---|
| `/auth/refresh` answers HTTP 500 after ~4.1 s (performance issues OTT-56, OTT-55) | Android/TV 1.0.3+25 | ≥ 270 in 30 d (traces sampled at 20%) | no, but no content loads | A dependency of the refresh handler timed out at ~4 s during an incident window (6 Nov ~21:40 → 8 Nov 18:13 UTC); tokens were valid (the same users refreshed fine before and after) | open: backend to find the cause; app 1.1.0 adds a 30 s refresh cooldown; Sentry monitor `2630811` now emails on recurrence |
| ANR on Android TV (OTT-8, OTT-K, OTT-15, OTT-2N and smaller) | Android TV 1.0.3+25 | 46 + 15 + 10 + 4 | yes | Long GC pauses on 1 GB TV boxes block the JS thread inside text measurement and the main thread on the same runtime lock | open: watch on 1.1.0 (RN 0.88) |
| OTA update check rejected (OTT-2W, reported at a 1% sample) | Android 1.0.3+25, iOS 1.0.2+4 | 45 (≈ 4,500 failed checks) | no | EAS Update delivery refused (Free-plan monthly-updating-user cap) or no network; last seen 2026-11-02 | open: check EAS Update usage |
| `JavaCallback was already settled` (OTT-T) | Android 1.0.3+25 | 13 | yes | A native module settles a callback twice while backgrounded under memory pressure; no JS stack | open: watch on 1.1.0 |
| Non-premultiplied bitmap drawn by expo-image (OTT-P, OTT-50) | Android 11 TV 1.0.3+25 | 7 | yes | Some image decodes as a non-premultiplied bitmap on TCL TV firmware | open |
| iOS app hangs (OTT-1G, OTT-2G, OTT-1R, OTT-4R, OTT-57) | iOS 1.0.3+8 | 1–4 each | no | Main-thread stalls, two in keyboard handling | open: low |
| `EXC_BAD_ACCESS` in React Native's runtime scheduler (OTT-4P) | iOS 1.0.3+8 | 2 | yes | React Native core crash | open: watch on 1.1.0 |
| Device-ID keychain read rejected on broken-Keystore boxes (OTT-3) | Android TV 1.0.3+25 | 20 | no, but login is impossible | The read had no fallback; only the write did | fixed in 1.1.0, watching |

Closed this run: OTT-5A (an agent's debugger probe on a development simulator, not app code) and
OTT-12 (only on iOS 1.0.1+3; fixed in later builds, resolve it in Sentry).

## Run log (append-only, newest first)

<a id="investigate-2026-11-09"></a>
### Investigate — 2026-11-09 (Sentry, last 90 days, before the 1.1.0 release)

**Window:** 90 days of issues; 14–30 days for span queries.

**Coverage:** Sentry OK (MCP, EU region). Error events are unsampled; traces are sampled at 20%,
and Sentry dropped 15.8% of spans in the window, so every span-based count is a floor. EAS Observe:
not installed. Gmail alert emails: not read, the connector needs re-authorisation; Sentry itself
was read instead. Store crash consoles: not read.

**Ranked findings**

1. `/auth/refresh` returns 500 after ~4.1 s: 3,975 spans from 270 sampled users between 2026-10-12
   and 2026-11-08, against 13,680 successful refreshes (p50 112 ms). One cold-start trace shows
   four consecutive refreshes, each ~4.1 s, each followed by a fresh 401. Sentry grouped these as
   two "Consecutive HTTP" performance issues on 2026-11-07, but the 500s began on 2026-10-12.
2. Android TV ANRs: 46 users on OTT-8 alone; the JS thread is in Yoga text measurement waiting on
   a runtime lock while the heap daemon runs a GC, on 1 GB devices.
3. Device-ID keychain read rejected: 2,826 events from 20 installs, all on the login screen; every
   message names `rtsh.device_id` (no refresh-token reads affected).
4. OTA check failures: 62 sampled events from 45 users, so roughly 4,500 failed checks.
5. Smaller fatal Android issues: OTT-T (13), OTT-P and OTT-50 (7), OTT-A (2, last seen 2026-10-21).
6. iOS on 1.0.3+8: no issue above 4 users.

**Hypotheses**

- Refresh 500 is a backend defect, not client load: the request body is the same for successes and
  failures, and the failure time is constant (~4.1 s), which reads like a server-side timeout.
  Confidence: medium. Refuted if the backend logs show those requests reaching the handler and
  failing on bad input.
- ANRs are memory pressure on 1 GB TV hardware. Confidence: medium. Refuted if they recur at the
  same rate on devices with 2 GB or more.

**Handed off**

- Fixed in this release: the device-ID read now falls back to MMKV, and a box whose read failed
  writes its new id to MMKV only (`src/utils/device.ts`, two regression tests in
  `src/utils/__tests__/device.test.ts`, failing before the fix and passing after).
- Backend: the refresh 500s, with the counts above.
- Follow-up the same day: 97% of the 500s (3,840 of 3,975, 261 users) fell between 6 Nov ~21:40
  and 8 Nov 18:13 UTC; no other endpoint returned 500 in those 7 days; a top user had 95 successes
  around a 3.8-hour failure burst; none since. Hypothesis revised to a backend incident (a dependency
  of the refresh handler timing out at ~4 s), not bad tokens; confidence medium-high.
- Owner decided: 30 s refresh cooldown after a transient failure (app 1.1.0), and a Sentry metric
  monitor on refresh 5xx with an email Alert. Backend investigation handed to the backend team.
