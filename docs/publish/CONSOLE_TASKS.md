# Console-only tasks — RTSH TANI

Everything `eas metadata:push` **cannot** reach. Each answer is pre-derived from this
repo's code so you transcribe rather than decide. Drafted 2026-08-10.

---

## 1. Apple — App Privacy  🔴 blocks Submit for Review

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
| Location → **Coarse Location** | Yes | App Functionality | user-typed `city` / `country` profile field |
| Identifiers → **User ID** | Yes | App Functionality | account id |
| Identifiers → **Device ID** | Yes | App Functionality | `deviceKey` keychain UUID, sent in login/register-verify |
| Usage Data → **Advertising Data** | Yes | App Functionality, Analytics | `POST /ads/{id}/impression` — which ad was seen + `watchedSeconds` |
| Diagnostics → **Crash Data** | Yes | App Functionality | Sentry |
| Diagnostics → **Performance Data** | Yes | App Functionality | Sentry tracing, 0.2 sample in production |
| Other Data → **Other Data** | Yes | App Functionality | birth date + gender at registration |

**Answer No to everything else** — no health/fitness, financial info, precise location,
sensitive info, contacts, photos, audio, user content, browsing history, search history,
purchases, payment info, or credit info.

### Three judgment calls, with reasoning — so you can defend them

- **Coarse Location = Yes, even though the app requests no location permission.** Apple's
  definition is *information that describes the approximate location of a user or device* —
  it does not require the data to come from the device sensor. A self-declared city/country
  qualifies. Server-side IP geo-blocking is **not** a client location collection and is not
  what this declares.
- **Search History = No.** The search screen filters data already loaded on the client; no
  query string is sent to the backend.
- **Product Interaction = No, today — and this is the one that will go stale.** Analytics is
  fully built but **disabled** (mounts commented out in `(app)/_layout.tsx` and
  `channel/[id].tsx`). **The moment analytics is re-enabled, this form must be updated in the
  same release.** Shipping enabled analytics against a form that says No is a false privacy
  declaration, which is an enforcement matter, not a rejection.

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

## 3. Google Play — not started, and calendar-driven

Nothing in `store/store.config.json` reaches Google. All of this is console work.

- **Play Console app registration — deadline 2026-09-30**, consequence is *global removal*
  from Google Play. Not started. For a new app this happens when the listing is created, so
  it is a scheduling constraint rather than extra work.
- **Feature graphic 1024×500, no alpha** — does not exist. Mandatory listing field; a
  designer must produce it.
- **Data safety form** — same substance as Apple's App Privacy above, plus a required
  **account-deletion URL**. Declare in-transit encryption ✓.
- **Account-deletion URL** — the RTSH privacy page states the policy but has no titled
  section and no anchor. Needs `<h2 id="fshirja-e-llogarise">Fshirja e llogarisë dhe e të
  dhënave</h2>` naming both routes (in-app `Profili → Fshi llogarinë`, and `dpo@rtsh.al`
  from the registered address even after uninstalling). ~10 min of RTSH web time.
- **Foreground service permissions** — `TYPE_MEDIA_PLAYBACK`, needs a ~30s screen capture of
  radio playing with the screen locked. Approved use case; the declaration is unavoidable
  for Android 14+.
- **Content rating (IARC)** questionnaire — mirror the 16+ reasoning from Apple.
- `submit.production.android.serviceAccountKeyPath` is still a placeholder, so
  `eas:submit:android` cannot run.

---

## Never automated

Nobody but you clicks **Submit for Review**, **Release**, **Publish**, **Start rollout**, or
**Save** on a Data Safety form. `eas metadata:push` is also yours to run — it writes the live
listing.
