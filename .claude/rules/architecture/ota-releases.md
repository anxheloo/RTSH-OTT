---
paths:
  - "package.json"
  - "eas.json"
  - "app.config.ts"
  - "src/constants/appUpdate.ts"
  - "src/hooks/useOTA.ts"
---

# OTA releases (runbook)

Two kinds of update, never mixed. Mechanism: `architecture/boot-splash-gate.md`.

- **JS fix → current version.** Publish from `main`. It applies silently at the next cold start (no prompt), so always start at a partial rollout:
  ```bash
  npm run eas:update:withSentry:prod -- --rollout-percentage 10 -m "..."
  eas update:edit --branch production --rollout-percentage 100   # healthy in Sentry
  eas update:revert-update-rollout                                # bad → pull it
  ```
- **Store notice → an OLDER version**, once a newer store version is live **in both stores at 100%** (a Play staged rollout leaves users outside it with a store button that can't update; if one store lags, publish per platform with `--platform`). Publish from a worktree of the **newest code already live on that runtime**, never from `main`:
  ```bash
  # base = the commit of the newest update on that runtime; the tag only if nothing was published to it since release
  eas update:list --branch production --json        # newest group for runtime 1.0.2 → eas update:view <group> --json → gitCommitHash
  git worktree add ../ota-1.0.2 <that commit or v1.0.2>
  # in that folder: src/constants/appUpdate.ts → STORE_UPDATE_MODE = 'notice' (or 'block')
  cd ../ota-1.0.2 && npm ci && npm run eas:update:withSentry:prod -- -m "Store update notice"
  cd - && git worktree remove ../ota-1.0.2
  ```
  Branching blindly from the tag rolls back every update already shipped to that runtime — and for **`1.0.1` the tag doesn't even contain the switch** (`v1.0.1` predates `5357367`; the switch reached 1.0.1 only through updates). `main` keeps `STORE_UPDATE_MODE = 'off'` (a test enforces it) — a store build made from `main` must never show the notice.
- **A notice reaches an old binary at THAT binary's update cadence, not the splash.** Builds before `1.0.2` embed the old prompt hook, so the first update they get applies only when the user taps "Update" on the prompt, or on the next **cold start**. Only after that do they run the silent-apply hook and the banner. Expect old users to see a notice over days, not on their next launch.
- **Probe delivery before AND after every publish** (the diagnose `curl` below, one per runtime + platform). Before: a `429` means nothing will arrive — don't publish expecting it to. After: the manifest's `"id"` must be the update id just published (`eas update:view <group> --json`). A green `eas update` proves nothing about delivery.
- **Publish from a WORKTREE of the tag — never by temporarily editing `main`.** Proven 2026-09-29: an update meant for runtime `1.0.1` shipped to `1.0.2` instead, because `ota:export` reads the config when it STARTS and `eas update` reads it again at the END, so edits reverted in between silently retarget the publish. A worktree cannot drift under a running publish: `git worktree add ../ota-<ver> <newest-live-commit|v<tag>> && cd ../ota-<ver> && npm ci`, change, publish, `git worktree remove --force`. Read the printed **Runtime version + Platforms** before doing anything else.
- **Runtimes that PREDATE `STORE_UPDATE_MODE`** (here: `1.0`) have neither the constant nor the banner. Don't port them — raise the build's EXISTING `confirmation` modal once per launch (store link + dismiss) from that tag's worktree, reusing its `update.*` strings, and patch `IOS_APP_STORE_ID` (empty in those builds, so the CTA is dead on iOS). Reference: the `1.0` patch published 2026-09-29 (`useStoreUpdateNotice`, ~50 lines, never merged).
- **Tag every store build**: `git tag v<version> && git push origin v<version>` on the commit you build from. The notice flow depends on it.
- **An update reaches only its own runtime** (`runtimeVersion` = app version), so it must be published from code whose `app.config.ts` version matches the installed builds — and must use only native modules those builds contain. Runtime strings are compared literally: `1.0` is NOT `1.0.0`. Before publishing from a commit other than the users' build, prove compatibility with `git diff <build-commit> <publish-commit> -- package.json package-lock.json` — empty means the JS cannot call native code their build lacks. The same diff decides whether both platforms can share ONE publish (identical deps) or need one each.
- **Delivery has a QUOTA, and it fails silently.** EAS Update's Free plan allows **1,000 monthly updating users**; past it `u.expo.dev` returns **429** to every device (*"The number of Monthly Updating Users has exceeded the Free tier's quota"*) while `eas update` keeps publishing successfully and the app shows nothing — indistinguishable from a broken bundle. Hit on 2026-09-26 (real demand that month: 3,045). Resets on the 1st of the calendar month. Diagnose in one call:
  ```bash
  curl -sI -H "expo-platform: ios" -H "expo-runtime-version: 1.0.1" \
    -H "expo-channel-name: production" -H "expo-protocol-version: 1" \
    -H "expo-api-version: 1" -H "accept: multipart/mixed" \
    https://u.expo.dev/19f4d236-ba4f-4208-bf8b-4a0c229e027c
  ```

