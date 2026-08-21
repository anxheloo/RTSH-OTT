# Console-only tasks — RTSH TANI

Everything `eas metadata:push` **cannot** reach. Each answer is pre-derived from this
repo's code so you transcribe rather than decide. Drafted 2026-08-10.

---

## 1. Apple — App Privacy  ✅ COMPLETED + RE-VERIFIED 2026-08-21 (new ASC app `6803853740`)

App Store Connect → your app → **App Privacy** → Get Started.

**The headline outcome to protect: "Data Used to Track You — No."** There is no third-party
ad or attribution SDK, no IDFA, no `ATTrackingManager`, and no data is shared with data
brokers or joined with third-party data for advertising. Answer **No** to tracking. This is
the single most valuable line on your privacy label — do not casually answer Yes to any
"used for tracking" toggle.

Everything below is **Linked to You** (the app is account-based, so every record ties to an
account id). Nothing is "Not Linked to You".

| Apple data type | Collected | Purpose | Where in code |
|---|---|---|---|
| Contact Info → **Email Address** | Yes | App Functionality | registration + login |
| Contact Info → **Name** | Yes | App Functionality | `username` at registration |
| Identifiers → **User ID** | Yes | App Functionality | account id |
| Identifiers → **Device ID** | Yes | App Functionality | `deviceKey` keychain UUID, sent in login/register-verify |
| Usage Data → **Product Interaction** | Yes | App Functionality, **Analytics** | STOMP `/app/watch` — `{ channelId, programId, kind }`, i.e. what you are watching |
| Usage Data → **Advertising Data** | Yes | **Developer's Advertising or Marketing**, Analytics | `POST /ads/{id}/impression` — which ad was seen + `watchedSeconds` |
| Diagnostics → **Crash Data** | Yes | App Functionality | Sentry |
| Diagnostics → **Performance Data** | Yes | App Functionality | Sentry tracing, 0.2 sample in production |
| Other Data → **Other Data** | Yes | App Functionality | birth date, gender, education level **and the self-typed `city` / `country`** at registration (`RegisterPayload`) |

**Answer No to everything else** — no health/fitness, financial info, precise location,
sensitive info, contacts, photos, audio, user content, browsing history, search history,
purchases, payment info, or credit info.

### Three judgment calls, with reasoning — so you can defend them

- **Coarse Location = NO — reversed 2026-08-21 (user decision), and the console reflects the
  new answer.** The earlier reading leaned on Apple's *"approximate location of a user or
  device"* wording to argue a self-declared city/country qualifies. It does not, and the code
  settles it: there is **no location package and no location permission in the project** — no
  `expo-location`, no `NSLocationWhenInUse*`, no `ACCESS_COARSE/FINE_LOCATION` (grepped
  2026-08-21). Nothing ever reads where the device is. `city` / `country` are optional free
  text a user types about themselves at registration (`services/auth.ts:107-108`), which is
  profile data, so they are declared under **Other Data** alongside birth date, gender and
  education. Declaring Location would have implied a sensor capability the binary does not
  have — a *less* accurate label, not a safer one. Server-side IP geo-blocking remains out of
  scope here: it is a backend decision, never a client location collection.
- **Search History = No.** The search screen filters data already loaded on the client; no
  query string is sent to the backend.
- **Product Interaction = YES — corrected 2026-08-14, the original draft here was WRONG.** The
  reasoning was "analytics is disabled, so no interaction data leaves the device". That missed the
  **realtime layer**: `useChannelRealtime` publishes `{ channelId, programId, kind }` to
  `/app/watch` on every channel open and programme switch (`hooks/useChannelRealtime.ts:290`), and
  `useRealtimeConnection()` is mounted and uncommented in `(app)/_layout.tsx:35`. That is Apple's
  Product Interaction definition verbatim — *"video views… music listening data"*. **The lesson:
  a disabled analytics module does not mean no telemetry — check every transport, not just the one
  named "analytics".** Re-enabling the analytics module changes nothing here; it is already
  declared.

### Sentry is a third-party SDK and must be declared

`@sentry/react-native` receives crash + performance data, and `createUserSlice` calls
`setMonitoringUser(user.id)` — so it is **Linked to You**, not anonymous. `sendDefaultPii` is
`false` and `beforeSend`/`beforeBreadcrumb` scrub tokens, which is why no Contact Info is
declared for Sentry. It is **not** tracking: no cross-app linking, no ad identifier.

### Privacy policy URL

`https://rtsh.al/rreth-rtsh/rtsh-tani-platforma-ott-e-radio-televizionit-shqiptar/`

---

## 1b. Apple — Content Rights  🔴 blocks Submit for Review

App Store Connect → **App Information** → Content Rights → *Set Up Content Rights Information*.
Observed **unset** on 2026-08-14. **Not in the metadata schema** — `metadata:push` cannot reach it.

Apple asks whether the app contains, shows, or accesses **third-party content**. For a broadcaster
streaming licensed programming the answer is **Yes**, and Apple then requires confirmation that you
hold the rights or are authorised to use it. Do not answer No to avoid the follow-up — a
rights-holder question answered falsely is a 5.2 problem, not a form error.

This is the same underlying question as audit blocker #4 (publisher identity / streaming rights),
surfacing in a second place. Keep RTSH's rights documentation reachable in case review asks.

---

## 2. Apple — the 5 values only you can supply  ✅ RESOLVED 2026-08-14

Give these to Claude and they go into `store/store.config.json`; `verify.sh` gate J fails
until every one is real.

| Field | Public? | Needed |
|---|---|---|
| `apple.copyright` | **Yes — on your store page** | Exact legal entity, e.g. `2026 Radio Televizioni Shqiptar` |
| `review.firstName` / `lastName` | No | Who Apple contacts about the review |
| `review.email` | No | Monitored during review |
| `review.phone` | No | E.164, e.g. `+355691234567` |

---

## 3. Google Play — console state READ 2026-08-14 (tier 1, read-only)

Nothing in `store/store.config.json` reaches Google; all of this is console work. The whole
Play surface was walked in the browser on 2026-08-14. **This supersedes the "not started"
draft written 2026-08-10 — most of it was already done.** Console IDs for future runs:
developer `6801667389174391983`, app `4975999587846851502`, package `al.rtsh.tani`.

### Already DONE — verified in the console, not assumed

| Item | State read on 2026-08-14 |
|---|---|
| Developer account | **Organization account**, legal identity **RADIO TELEVIZIONI SHQIPTAR**, Ismail Qemali 11, Tirana. Closes audit blocker #4 for Play. |
| Account policy status | *"No issues found with your developer account."* The two `sk.antik.*` apps marked *Removed by Google* are the previous vendor's and carry **no active enforcement**. |
| App registration + developer verification | `al.rtsh.tani` **Registered**, 3 keys, Jul 30 2026. Closes audit #16 (the 2026-09-30 deadline). |
| Store listing | en-US **and** Albanian (`sq`) both complete, *Ready to send for review*. |
| Feature graphic | **Present** (1/1). Closes audit blocker #15 *in the console* — see the divergence note below. |
| Screenshots | 7 phone screenshots uploaded. |
| App content declarations | **10 actioned**: Data safety, Advertising ID, Health apps, Financial features, Government apps, Target audience (13+), Content ratings, Ads, Sign in details, Privacy policy. |
| App category | Entertainment. |
| Internal testing | Live release, **version code 12**, uploaded Aug 14 15:34, 22,177 supported devices. |
| Service account | `eas-play-submit@rtsh-ott.iam.gserviceaccount.com` — **Active, never expires, Admin on `al.rtsh.tani`**. |
| Submit chain | **PROVEN** by read-only API probe (see §3.1). `eas submit -p android` will authenticate. |

Play's own gate currently reads **"Submit 9 changes for review"** with *"Your changes can now
be sent for review."* That is Play saying the **declarations** are complete — it is not a
prediction that the app will pass review. The items below are what review will actually judge.

### 3.1 — Proving the submit chain without uploading anything

`scripts/verify_play_submit_chain.py` mints an OAuth token from the service-account key and
asks the Android Publisher API for a deliberately invalid edit id. The *error* is the signal:
`400 Invalid edit ID` or `404` both mean Google accepted the token, resolved the package and
confirmed the caller's permission — an auth or API-enablement failure short-circuits with
401/403 long before that. Result on 2026-08-14: **all three checks PASS**. Nothing is written.

```
PASS [1] service-account key is valid — access token minted
PASS [2] Android Publisher API is ENABLED on the Cloud project
PASS [3] service account is AUTHORIZED on al.rtsh.tani
```

### 3.2 — 🔴 Sign in details: the free-text field is EMPTY. YOU must fill it.

App content → **Sign in details** → edit *User Account* → *"Any other information required to
access your app."* Credentials `ott@rtsh.al` / `11111111` are present and the restriction is
honestly declared, but the free-text box is blank — and Google's own guidance panel, on that
exact screen, names both of this app's problems: *"If your app typically requires 2-step
verification, or a one-time PIN, provide reusable sign in details that don't expire"* and
*"If your app normally uses a location-dependent password, for example, a geo-gate, provide
sign in details that are valid regardless of user location."*

> ✅ **Geo resolved 2026-08-14 (user-confirmed): the service is accessible from everywhere**, so
> the review account needs no exemption and audit blocker #3(b) is closed. The paragraph below is
> written to match that **without over-claiming**: RTSH's own published privacy policy (§3) says
> geo-blocking *is* applied to *"specific channels or events according to broadcast rights"*, and
> a reviewer can read that page. Promising "everything plays everywhere" would contradict your own
> policy document; saying the service is reachable and that an occasional title may be restricted
> with an on-screen notice is both true and safe.

```
This account is pre-provisioned for review. Sign in with the email address and
password above. It does NOT require the one-time email PIN that normal
registration uses, so you do not need access to any inbox, and these
credentials do not expire.

LOCATION. The service is accessible from any country, including from US-based
review devices and from Google's automated pre-launch report - no VPN or
Albanian IP address is needed to review the app. Individual channels or
programmes may occasionally be restricted by broadcast rights; when that
happens the app shows an explicit on-screen notice rather than failing.

HOW TO REVIEW
1. Open the app and sign in with the credentials above.
2. "Live" tab - tap any channel to start a live TV stream.
3. "Radio" tab - tap any station. Audio continues when the app is backgrounded
   and when the screen is locked; transport controls appear on the lock screen.
   This is the FOREGROUND_SERVICE_MEDIA_PLAYBACK use case declared separately.
4. "Guide" tab - 7-day programme guide. Tap a past programme to play catch-up.
5. Profile - account deletion is available in-app and deletes the account.

PARENTAL CONTROL. Adult-flagged programmes can be gated behind a device PIN.
It is OFF by default. Enable it in Settings and set any 4-6 digit PIN to test.

ADVERTISING. The app shows first-party RTSH promotional slots only. There is
no third-party ad SDK and no advertising ID is used.
```

### 3.3 — 🔴 Foreground service permissions: the ONE declaration still open

App content → **Foreground service permissions** → *Start declaration*. Marked
**"Declaration overdue"** (compliance deadline was 2024-01-31) and it blocks releasing
updates. The form asks a single question — *"What tasks require your app to use the
FOREGROUND_SERVICE_MEDIA_PLAYBACK permission?"*

**Tick BOTH** — each maps to a real, Google-approved use case in this app:
- ☑ **Media playback** — background radio (`RadioAudioHost`, `expo-audio` with
  `shouldPlayInBackground: true` + `setActiveForLockScreen`).
- ☑ **Show picture in picture** — `LivePlayer`'s PiP.
- ☐ Other — leave unticked.

If it then asks for a description, use:

```
RTSH TANI is a live television and radio streaming app for Albania's public
broadcaster, RTSH.

MEDIA PLAYBACK: users listen to live radio stations while the app is in the
background or while the screen is locked. The foreground service keeps the
audio session and the lock-screen and notification transport controls alive
for the duration of playback. Without it, radio playback would stop the moment
the user leaves the app or locks the screen, which is the entire purpose of
the radio feature.

SHOW PICTURE IN PICTURE: users continue watching a live TV channel in a
picture-in-picture window while using other apps. The foreground service keeps
video and audio playing while that window is on screen.

Both services start only in direct response to the user pressing play, and
stop when the user stops playback or dismisses the picture-in-picture window.
```

If it asks for a demo video, record ~30s of radio playing with the screen locked, showing the
lock-screen controls, and upload it unlisted to YouTube.

### 3.4 — 🟠 Data safety: keep "Approximate location" CHECKED

**This reverses the pending recommendation from 2026-08-14 to uncheck it.** Read in the
console: Location = *Approximate location* ✓, *Precise location* ✗; Personal info = *Email
address* ✓, *User IDs* ✓, *Other info* ✓, with **Name ✗ and Address ✗**.

The argument for unchecking was that the backend evaluates the geo-blocking IP per request and
discards it. That is true and it does dispose of the *IP* source — but it is not the only
source. Registration **requires** a city and a country, sends them, and stores them:

- `src/features/auth/schemas.ts:61-62` — `city` and `country` are `min(1)`, i.e. mandatory
- `src/api/services/auth.ts:89` — `city: string` is on the register payload
- `src/types/domain.ts:311-324` — both come back on `UserDTO` and become the profile `location`

Google defines Approximate location as location to an area ≥3 km², *"such as the city a user
is in."* A user-declared city is exactly that, and since **Address is unchecked** there is no
other box carrying it. Unchecking Location would leave a required, transmitted, stored field
declared nowhere — an **under**-declaration, which is the direction that gets apps pulled
rather than merely rejected.

**The two stores deliberately DIVERGE here — corrected 2026-08-21.** This used to say the call
matched Apple's Coarse Location; it no longer does, because Apple's was reversed to **No** (§1).
That is not an inconsistency to fix, it is the two rulebooks differing: Google **names the city**
in its own definition of Approximate location, and Play offers no better-fitting box once
`Address` is unchecked — whereas Apple's Location types read as device-sensed position, and Apple
provides **Other Data**, which is where `city` / `country` are declared instead. Same field, same
honesty, different taxonomy. Re-derive each store from its own definitions; never propagate one
store's answer to the other on consistency grounds alone.

**Consequence: two follow-ups from that session are now moot.** Getting the backend's
IP-retention answer in writing, and confirming whether the CDN edge logs IPs, only ever
mattered for the IP source. The registration field settles the checkbox on its own. Chase them
for GDPR/Ligji 124/2024 reasons if you like — but they no longer block this form.

### 3.5 — 🟠 Account-deletion URL — **the page was finally READ on 2026-08-14**, and it is better than assumed

The privacy page had never actually been read (WebFetch 403 + WAF-blocked `curl` on every prior
run — the finding was carried from 2026-07-29 unverified). Read in the browser on 2026-08-14.
Against Google's three stated criteria on the Data safety screen:

| Google's criterion | RTSH page | |
|---|---|---|
| *"refer to your app or developer name shown on your store listing"* | Titled **"Politika e Privatësisë 'RTSH TANI'"**, names RTSH and its address | ✅ |
| *"specify the types of data that are deleted or kept, and any additional retention period"* | §8 — account data *"fshihen menjëherë nga të gjitha bazat e të dhënave"* on request, with a legal/financial retention carve-out; technical logs ≥1 year | 🟡 substance present, no retention **period** for the carve-out |
| *"prominently feature the steps that users should take to request that their account is deleted"* | **No steps anywhere.** §9 states the right to erasure, §14 gives `dpo@rtsh.al` — a reader must assemble the procedure, and the in-app route is not mentioned at all | ❌ |

So one criterion genuinely fails, and it is the one Google words most strongly.

**Can you skip it? Yes for the first submission — this is the cheapest blocker to be wrong about,
and that is the whole argument.** If a reviewer rejects on it, the fix is a **form edit and a
resubmit**: no new binary, no rebuild, no version bump, hours not days. Every other open item costs
a build cycle to get wrong. Downgraded 🔴 → 🟠 on that basis.

**But make the ask anyway, because it shrank.** You do not need a new titled section — §8 already
carries the substance. The minimal ask to RTSH web is ~4 lines appended to §8, plus an id:

```html
<h3 id="fshirja-e-llogarise">Fshirja e llogarisë dhe e të dhënave</h3>
<p>Për të fshirë llogarinë tuaj: hapni aplikacionin RTSH TANI dhe zgjidhni
<strong>Profili → Fshi llogarinë</strong>. Nëse e keni çinstaluar aplikacionin,
dërgoni një kërkesë nga adresa juaj e regjistruar e-mail te
<a href="mailto:dpo@rtsh.al">dpo@rtsh.al</a>. Llogaria dhe të dhënat tuaja
fshihen menjëherë nga të gjitha bazat e të dhënave, përveç atyre që duhen
ruajtur për detyrime ligjore ose financiare (deri në [X] vjet).</p>
```

Then change the Data safety field to `…/#fshirja-e-llogarise`. Until then the current URL stays —
it resolves, it is the right page, and it is not empty.

<details><summary>Superseded: the pre-2026-08-14 finding, written before the page could be read</summary>

### 🔴 Account-deletion URL points at a page that does not satisfy Google's own rule

The *Delete account URL* field is filled, but with the **same generic privacy-policy URL**
(`https://rtsh.al/rreth-rtsh/rtsh-tani-platforma-ott-e-radio-televizionit-shqiptar/`). The
console states, on that screen, that the link must *"prominently feature the steps that users
should take to request that their account is deleted"* and *"specify the types of data that
are deleted or kept, and any additional retention period."* The RTSH page has no titled
deletion section and no anchor, so a reviewer must assemble it from §8 + §9 + §14.

Still audit blocker #2, still ~10 minutes of RTSH web time: add
`<h2 id="fshirja-e-llogarise">Fshirja e llogarisë dhe e të dhënave</h2>` naming both routes
(in-app `Profili → Fshi llogarinë`, and `dpo@rtsh.al` from the registered address **even after
uninstalling**), what is deleted, what is retained and for how long. Then change the field to
`…/#fshirja-e-llogarise`.
</details>

### 3.6 — 🟡 Smaller things worth fixing before you submit

- **The Play description still says "19 RTSH television channels".** On 2026-08-14 you
  deliberately removed exact channel counts from the Apple listing because an inventory number
  expires the moment RTSH adds or drops a channel, and correcting it costs a metadata push.
  The same reasoning applies here; Play just wasn't updated in that pass.
- **Android TV is not an included form factor.** The internal-testing track reads *"Phones,
  Tablets, Chrome OS, Android XR"*. The single artifact already runs on TV, but Play
  distribution to TV needs an explicit form-factor opt-in with TV screenshots and a 1280×720
  banner, plus its own review. Not a phone-launch blocker — but it *is* in the contract scope.
- **Service account holds "Admin (all permissions)".** It only needs *Release to production*,
  *Release to testing tracks* and *Manage store presence*. Least privilege for a CI credential
  that lives on disk; downgrade when convenient.
- **Feature-graphic divergence.** The console has one; the repo has no source file, so
  `anxheloo-expo-store-assets` gate B still fails and the live asset is unversioned. Export the
  1024×500 source into `assets/AppStore-PlayStore/play/feature-graphic.png` so the manifest and
  the store agree.

---

## Never automated

Nobody but you clicks **Submit for Review**, **Release**, **Publish**, **Start rollout**, or
**Save** on a Data Safety form. `eas metadata:push` is also yours to run — it writes the live
listing.
