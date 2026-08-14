/**
 * EAS Metadata store config — the App Store listing, as code.
 *
 * WHY THIS FILE EXISTS (and isn't just the .json):
 * `apple.version` names the App Store *version record* the metadata is written to. As a literal in
 * JSON it is a second place a version number lives, and forgetting to bump it writes a new release's
 * listing onto the PREVIOUS version's record — silently, because the config still validates.
 *
 * So the version is derived from `app.config.ts` instead, making it the single source of truth:
 * bump `version` there and the build, the runtimeVersion (policy `appVersion`), the Sentry release
 * and the App Store listing all move together.
 *
 * Everything else stays in `store.config.json` so it keeps JSON-schema autocomplete in the editor.
 * This file only injects `apple.version` on top — do not add listing content here.
 *
 * eas-cli loads `.json` OR `.js` here (`metadata/config/resolve.js` → `loadConfigAsync`), and accepts
 * an object, a function, or an async function. Wired via `eas.json` →
 * `submit.production.ios.metadataPath`.
 *
 * CAVEAT: `eas metadata:pull` does not round-trip a `.js` config (it swaps the extension for `.json`
 * and writes to the project root). This file is write-only from our side — never pull into it.
 */

const path = require('path');

const { getConfig } = require('@expo/config');

const config = require('./store.config.json');

const projectRoot = path.join(__dirname, '..');

// isPublicConfig avoids pulling in build-secret-bearing fields; skipSDKVersionRequirement keeps this
// readable by a plain `require` outside an Expo CLI process.
const { exp } = getConfig(projectRoot, {
  skipSDKVersionRequirement: true,
  isPublicConfig: true,
});

if (!exp.version) {
  throw new Error('store.config.js: app.config.ts resolved no `version` — refusing to push metadata to an unknown App Store version record.');
}

// ---------------------------------------------------------------------------------------------
// RELEASE NOTES — required from the FIRST UPDATE onward (1.0 does not display them).
//
// Apple pre-fills a new version record from the previous one, so description / keywords /
// screenshots / URLs carry forward automatically. `releaseNotes` is the ONE field that is
// mandatory for an update and always starts EMPTY — Apple blocks submission without it.
//
// It cannot live here as a commented key: `AppleInfo` is `additionalProperties: false`, so any
// extra key in store.config.json fails `metadata:lint`. Paste this into
// store.config.json → apple.info["en-US"], as a sibling of "promoText" (max 4000 chars):
//
//   "releaseNotes": "Fixed a problem where …",
//
// Then bump `version` in app.config.ts and push. Do NOT hand-type release notes into App Store
// Connect: this config is authoritative, so the next `metadata:push` would overwrite them.
//
// And before reaching for a store release at all — a JS-only bug fix does not need one. Ship it
// with `npm run eas:update:withSentry:prod` and leave `version` ALONE: bumping it changes
// runtimeVersion (policy 'appVersion'), and an OTA published against the new runtime never
// reaches anyone still running the old build.
// ---------------------------------------------------------------------------------------------

module.exports = {
  ...config,
  apple: {
    ...config.apple,
    version: exp.version,
  },
};