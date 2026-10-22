---
paths:
  - "store/store.config.json"
  - "store/store.config.js"
  - "eas.json"
---

# Release & store submission

## How it works today (Apple listing as code, 2026-08-08)

The App Store listing is **source, not console state**. `store/store.config.json` is committed to the
repo and referenced from `eas.json` → `submit.production.ios.metadataPath`; `eas metadata:push` writes
it into App Store Connect over Apple's API, so the listing is reviewable in a diff and cannot drift
into "whatever someone last typed into a form".

**Three commands, none of which triggers another** — verified against the installed eas-cli 21.6.0,
whose `eas submit --help` exposes no metadata flag at all:

| Command | Sends | Chains to |
|---|---|---|
| `eas build` | nothing to Apple | `--auto-submit` → submit (wired on `eas:ios:prod` only) |
| `eas submit` | the **binary** → ASC / TestFlight | nothing |
| `npm run eas:metadata:push` | the **listing** | nothing |

Order is **build → submit → metadata:push → review in ASC → the human clicks Submit for Review**.
Submit precedes push because several fields carry `meta.versioned: true` in the schema (description,
promo text, release notes, all three URLs) and attach to an App Store *version* record — pushing them
before a version exists has nothing to bind to.

`npm run eas:metadata:lint` is the zero-risk dry run (no network, no writes) and `eas:metadata:push`
runs it first via `&&`, so an invalid config can never reach the store. **There is deliberately no
`pull` script:** `metadataPath` is non-default here, and `eas metadata:pull` writes to the *repo root*
instead of back into `store/` — `push` reads the path correctly, `pull` does not. The file is
write-only from our side; never round-trip it.

**Release strategy** is in the metadata, not `eas.json`: `apple.release.automaticRelease: false` +
`phasedRelease: true` — manual release with Apple's 7-day gradual rollout, the safe default for a
first launch.

**Listing prose is ENGLISH; keywords stay Albanian.** `en-US` is the only available slot — Apple ships
**39** App Store localizations and Albanian is not among them (read from the installed schema, not
assumed), and `apple.info` is `additionalProperties: false`, so an `sq` key hard-fails
`metadata:push` rather than degrading. Albanian prose under `en-US` was written first and then
**reverted to English on 2026-08-14** (user decision, matching how comparable broadcaster apps
present themselves). **`keywords` deliberately stay Albanian** — they are invisible to users and exist
only to match queries, and the audience searches `televizion`, not "television".

**Never state exact channel or station counts in the listing** (decision 2026-08-14). "19 TV channels
and 13 radio stations" is a fact that expires the moment RTSH adds or drops one, and correcting it
then costs a metadata push. The copy says "RTSH television channels" / "RTSH radio stations". The
seven-day EPG window is kept because it is an implementation property of the app, not an inventory
count.

**Two traps here that `metadata:lint` cannot catch**, both hit for real on 2026-08-14:
- **`apple.version` is NOT in the schema's `required` list**, so a config missing it lints clean and
  then fails at Apple's API with *"You must provide a value for the attribute 'versionString'"* —
  after the screenshots have already uploaded. It names the App Store **version record** the metadata
  is written to, and a value that matches no existing record makes eas *create a new one*, orphaning
  whatever is already uploaded. ASC offers every build to a record regardless of version-string match
  (verified in the Add Build picker: builds 7–10 all report `1.0.0` and were all offered to the `1.0`
  record), so a mismatch is not fatal — it is just a second version number to maintain.

  **This is why the config is `store/store.config.js`, not `.json` (2026-08-14).** The `.js` requires
  the `.json` (which keeps all listing content, and its editor schema autocomplete) and injects
  **`apple.version` from `app.config.ts`** via `@expo/config`'s `getConfig()`, throwing if it resolves
  empty rather than pushing to an unknown record. `app.config.ts` → `version` is therefore the
  **single source of truth**: bumping it moves the build, the `runtimeVersion` (policy `appVersion`),
  the Sentry release and the App Store listing together. Never reintroduce a literal `version` into
  the JSON — two copies is the bug this removes. Caveat: `eas metadata:pull` cannot round-trip a `.js`
  config (it swaps the extension for `.json` and writes to the project root), so the file is
  write-only — which was already true for a non-default `metadataPath`.

  **Resolved 2026-08-14:** ASC's record was created as `1.0`, so `app.config.ts` was set to `1.0` to match (rather than renaming the record) — nothing is published yet, so the version string was the cheaper side to move. Superseded note: it previously said
  `1.0.0`. The record must be renamed `1.0` → `1.0.0` in App Store Connect **before** the next push,
  or eas will look for a `1.0.0` record that does not exist. Renaming edits the record in place, so
  the 19 already-uploaded screenshots stay on it.

  **Bumped to `1.0.1` on 2026-09-15:** once `1.0` was approved, Apple closed its build train —
  a new build under `1.0` fails upload with ITMS-90062 / 90186, and no build-number bump helps.
  Every App Store release after an approval needs a higher `version`. It also moves
  `runtimeVersion`, so an OTA built for `1.0` no longer reaches `1.0.1` binaries (and vice versa).
- **`screenshots` is typed `additionalProperties`**, so any display-type key lints clean and only
  Apple's API rejects a wrong one. `APP_IPHONE_67` accepted 1320×2868 (6.9") and
  `APP_IPAD_PRO_3GEN_129` accepted 2064×2752 — **proven by a successful upload**, not inferred. Note
  ASC's UI showed the 6.5" slot expecting 1242×2688, which is a different slot and not the one these
  went to.

**`apple.review.notes` stays in ENGLISH regardless of what the listing prose does** — App Review is
US-based, and review instructions a reviewer cannot read are worse than none.

**Age rating: computed from honest answers, not set by override.** Apple's current bands are
**4+ / 9+ / 13+ / 16+ / 18+** — there is no 12+ and no 17+ any more (proof: the
`AppleAgeRatingOverrideV2` enum in the installed eas-cli schema is
`NONE|NINE_PLUS|THIRTEEN_PLUS|SIXTEEN_PLUS|EIGHTEEN_PLUS|UNRATED`). Because
`ageRatingOverrideV2` is `null`, **Apple derives the number from the questionnaire — we do not
pick it.** **CONFIRMED 13+ on 2026-08-14**, read from the questionnaire's own Calculated Rating screen — not
predicted. Nine fields sit at `INFREQUENT_OR_MILD` (profanity, horror, alcohol/tobacco/drugs, mature
themes, sexual content, realistic violence, cartoon violence, guns, medical information) and it still
computes 13+: **Infrequent never reaches 16+**. Only a `FREQUENT_OR_INTENSE` answer, or one of the
graphic/prolonged categories, raises the tier — so the four 18+ gates
(`violenceRealisticProlongedGraphicOrSadistic`, `sexualContentGraphicAndNudity`, `gambling`,
`lootBox`) are the ones to guard, and all four are clean.

**The advisory answers were tightened during the live questionnaire**, because Apple's on-screen
definitions are broader than they look: `horrorOrFearThemes` covers *"anxiety, dread"* (news),
`gunsOrOtherWeapons` covers *"references to **or** depictions of"*, and
`alcoholTobaccoOrDrugUseOrReferences` covers references. All three had been `NONE` and were wrong.
The consistency argument that settled sexual content: the app **ships a parental PIN to gate
adult-flagged programmes and says so in the review notes** — declaring `NONE` across every sexual
content field while shipping that gate is self-contradictory in a document a reviewer reads.

**The questionnaire arrives PRE-ANSWERED from `metadata:push`, and that is the alignment trap.**
Verified 2026-08-14: on opening Age Rating → Edit, only two questions were blank — *Social Media* and
*Social Media Disabled for Users Under 13* — which are exactly the two with **no key in eas-cli
21.6.0's `AppleAdvisory` schema**. Everything else was already filled by the earlier push. So the
console and the config are two views of one record, the config wins on every field it names, and any
answer changed in the console must be mirrored back into `store.config.json` or the next push
silently reverts it — re-rating the app with no error anywhere. All 21 questionnaire answers plus the
six Step-1 capability toggles were diffed against the file on 2026-08-14: zero mismatches.

**Chance-based activities are app-capability questions, not content questions** ("allow *users* to
compete", "for purchase", "your app has") — all `NONE`/`false`, correctly.

**`Entertainment` as primary category excludes the app from sale in Afghanistan** by Apple's local-law
rule. Automatic, unavoidable with this category, and irrelevant to an Albanian audience — but it is a
category consequence, not a misconfiguration. `violenceRealistic`,
`matureOrSuggestiveThemes` and `profanityOrCrudeHumor` are `INFREQUENT_OR_MILD` (live news and
post-watershed scheduling), everything else `NONE`, with `parentalControls: true` declaring the device
PIN and `advertising: true` declaring the first-party ad slots. `ageRatingOverrideV2` is left `null` so
the questionnaire computes the rating — an override asserts your own answers understate your content
and invites the question of why you answered that way. `UNRATED` was rejected: it triggers storefront
restrictions in several regions for no gain. **This holds only while RTSH's adult-flagged slots are
post-watershed material rather than genuinely 18+ content** — if that changes, the rating must change
with it, since under-declaring is a post-launch removal risk, not merely a rejection risk.

**Both age-rating override keys must be present.** `ageRatingOverride` (legacy enum
`NONE|SEVENTEEN_PLUS|UNRATED`) is still in the schema's `required` list even though
`ageRatingOverrideV2` (`NINE_PLUS|THIRTEEN_PLUS|SIXTEEN_PLUS|EIGHTEEN_PLUS|UNRATED`) supersedes it —
dropping the legacy key fails `metadata:lint` outright. Ten advisory fields that exist in eas-cli
21.6.0 were absent from this file until 2026-08-08 (`advertising`, `parentalControls`,
`userGeneratedContent`, `messagingAndChat`, `ageAssurance`, `lootBox`, `gunsOrOtherWeapons`,
`healthOrWellnessTopics`, `ageRatingOverrideV2`, `developerAgeRatingInfoUrl`) — these are Apple's
September-2026 social-media/age-assurance questions, already answerable today.

## Known gaps

- **Seven placeholders remain and are all external** (`verify.sh` gate J): `apple.copyright` (RTSH
  legal entity), the four `apple.review` contact fields, and `demoUsername`/`demoPassword`. The demo
  account is audit blocker #3 and needs a **US-IP geo exemption** as well as credentials — a reviewer
  hitting a geo-block screen is an Apple 2.1 rejection regardless of whether the login works. An
  eighth gate-J hit is the geo-exemption `TODO` embedded inside `apple.review.notes`.
- **App Privacy is not in the metadata schema.** The listing carries `privacyPolicyUrl` and
  `privacyChoicesUrl`, but the App Privacy questionnaire itself is console-only — the single Apple
  surface `metadata:push` cannot reach. **Answered and published 2026-08-21**; because it lives only
  in the console, the declaration is recorded here or it is recorded nowhere. Ten types, all
  **Linked = Yes**, all **Tracking = No**:

  | Type | Purpose | Source |
  |---|---|---|
  | Contact Info → Name (`username`) | App Functionality | `services/auth.ts:104` |
  | Contact Info → Email Address | App Functionality | `services/auth.ts:38,103,159` |
  | Identifiers → User ID | App Functionality, Analytics | `createUserSlice.ts:70` |
  | Identifiers → Device ID (`deviceKey` UUID) | App Functionality | `utils/device.ts:57,201` |
  | Usage Data → Product Interaction | App Functionality, Developer Advertising | `realtime/events.ts:19-21` |
  | Usage Data → Advertising Data | Developer Advertising | `services/ads.ts:51-63` |
  | Diagnostics → Crash Data | App Functionality | `lib/monitoring.ts:203` |
  | Diagnostics → Performance Data | App Functionality | `lib/monitoring.ts:112,223` |
  | Diagnostics → Other Diagnostic Data | App Functionality | `lib/monitoring.ts:277-279` |
  | Other Data → Other Data Types | App Functionality | DOB/gender/education `services/auth.ts:106,109`; city/country `:107-108` |

  Three rulings worth not re-litigating:
  - **Contact Info → Physical Address was declared, then removed.** `city` is free text and `country`
    a picker (`RegisterForm.tsx:162-185`) — self-declared locality, not a mailing address, and not
    Location either (the app has no location API at all, so declaring Location would invite the
    question of which permission produces it). It rides under **Other Data Types**.
  - **Gender + education are Other Data, not Sensitive Info** — neither appears in Apple's enumerated
    Sensitive Info list.
  - **Performance + Other Diagnostic Data are genuinely collected**, despite no code of ours measuring
    anything. `tracesSampleRate` being a *number* (`monitoring.ts:223`) is the whole switch: in
    `@sentry/react-native` 7.11.0 that gate installs `appStartIntegration` (launch time),
    `stallTrackingIntegration` (hang rate), `nativeFramesIntegration`, `reactNativeTracingIntegration`
    and `timeToDisplayIntegration`, and every one of those `enable*` flags defaults `true`
    (`dist/js/integrations/default.js`). Diagnostics context (device, modules, breadcrumbs) rides
    along unconditionally. Sentry's own shipped manifest declares the same three types.
- **The app's own `PrivacyInfo.xcprivacy` declares `NSPrivacyCollectedDataTypes` as an empty array**,
  which contradicts those ten rows. Closing it means adding `ios.privacyManifests` to `app.config.ts`
  (the plugin **merges** — `@expo/config-plugins/build/ios/PrivacyInfo.js:91-121` — so the three
  generated required-reason entries survive). **Deliberately not done, and not a blocker:** Apple
  enforces the required-reason API entries and third-party SDK manifests, both already correct; the
  collected-types list feeds the Xcode Privacy Report, a tool for filling in the console form that is
  itself authoritative. Builds 7–12 all shipped with the empty array and Apple never raised it.
- **`hermes` ships with no privacy manifest and IS on Apple's commonly-used-SDK list.** Verified: no
  `.xcprivacy` anywhere under `ios/Pods/hermes-engine`, including inside `hermesvm.xcframework`. RN
  0.86 renamed the binary `hermes` → `hermesvm`, so whether Apple's matcher fires is unknown; the only
  test is an upload (watch for ITMS-91061). Upstream — not fixable here. Distinct from AUDIT.md #19,
  which was the Hermes *memory* regression.
- **EAS Metadata is Apple-scoped.** The Play listing, Data Safety, App Content and IARC are all
  console work; nothing in `store/store.config.json` reaches Google.
- **`privacyChoicesUrl` is unset**, pending audit blocker #2 — the RTSH privacy page has no titled
  account-deletion section with an `id` to anchor to.
- ~~**`submit.production.android.serviceAccountKeyPath` is still a placeholder**~~ — **resolved.**
  The Play key (service account `eas-play-submit@rtsh-ott.iam.gserviceaccount.com`, key id
  `5016e1d0…`) is stored in **EAS credentials, assigned to `al.rtsh.tani`** — moved there from a
  gitignored local file on 2026-10-19, so `eas.json` carries no `serviceAccountKeyPath` and no copy
  needs to sit on disk. `.dev`/`.preview` have no key, correctly: only `submit.production` exists.
  Upload or rotate with `eas credentials --platform android` → production → Google Service Account →
  **upload a new key** ("existing" lists keys saved anywhere on the Expo account, including SOLITAR's
  Firebase admin keys, which have no Play access). `scripts/verify_play_submit_chain.py` now needs a
  key path argument, so run it against a freshly downloaded key before uploading it.
  `eas:android:prod --auto-submit` used the key for 1.0.3 (2026-10-06). **Since 2026-10-19 submissions go out as `releaseStatus: "completed"`**
  (user decision): an auto-submitted build is released to **100% of users** as soon as Google's review
  passes, with no staged rollout and no Play Console step. There is no human gate between
  `eas:android:prod` and every Android user, so smoke-test the release build first. For a staged
  rollout, set `"releaseStatus": "inProgress"` plus `"rollout"`, or `"draft"` to release by hand.

---
