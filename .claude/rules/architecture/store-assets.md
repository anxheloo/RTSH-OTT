---
paths:
  - "store/store-assets.json"
  - "assets/AppIcon.icon/**"
  - "assets/images/**"
---

# Store assets

## How it works today (built 2026-08-06)

`store/store-assets.json` is the source of truth for every store-listing art requirement — app
icons, both stores' screenshot sets, Play's feature graphic. Per asset it declares the resolved
path (or, for a screenshot set, the directory), the required shape/format/alpha state, whether it
is required for the platforms this app targets, and a `spec_verified` date + source URL. Screenshot
directories live **outside this repo**, in the sibling `projects/RTSH/assets/AppStore-PlayStore/`
folder, per this workspace's convention that deliverables live under `projects/<name>/assets`, not
inside the app's own git tree — the manifest just records the resolved relative path.

`scripts/verify.sh` (from the `anxheloo-expo-store-assets` skill) reads the manifest and asserts the
durable invariant — *declared assets exist, at the declared shape* — holding **no store dimension
of its own**: Apple and Google revise their specs by accretion, so a gate with a pixel literal baked
in would eventually block a correct release. Re-verify the manifest's `spec_verified` dates against
the sources named in it; a stale date WARNs, it never fails a build.

**`ios.icon` (`assets/AppIcon.icon`, the SDK 57 Icon Composer directory) is deliberately NOT a
manifest asset** — it is a directory, not a single image, and is validated separately by the gate
suite's config-reading check (existence + that the `.icon` form is valid for the installed SDK),
which reads the resolved app config directly rather than the manifest.

## Known gaps (found running the gate for the first time, 2026-08-06)

- **Play's feature graphic (1024×500) has no source file.** Nothing in `AppStore-PlayStore/` matches
  the spec — it has never been produced. Mandatory for a Play Store listing.
- ~~**The App Store Connect listing icon carries an alpha channel.**~~ **Closed 2026-09-22** with the
  "rtsh" rebrand: `appstore.png` (and `assets/images/icon.png`) were re-saved as RGB, no alpha.
  Watch for it on the next icon change — generator packs (appicon.co) ship the 1024 with an
  all-opaque alpha channel, and Apple rejects the channel's presence, not just transparency.
- The remaining gap does not block development or an internal/preview build — both are pre-submission blockers
  only, caught here specifically so they surface before the App Store Connect / Play Console upload
  step rather than at it.

---
