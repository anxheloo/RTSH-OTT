// Metro config — two concerns, both load-bearing:
//
// 1. **Sentry** (`getSentryExpoConfig`) — the drop-in replacement for Expo's
//    `getDefaultConfig` that injects a **Debug ID** into the output bundle AND
//    its source map. The Debug ID is what lets Sentry resolve a minified stack
//    trace back to TypeScript *without* the `release`/`dist` strings having to
//    match the uploaded artifact — that mismatch is the classic "source maps
//    uploaded, traces still minified" trap. It also collapses Sentry's own
//    frames out of the LogBox stack view. `includeWebReplay: false` drops the
//    web-replay bundle: this app is native-only (`platforms: ['ios','android']`),
//    so it would be shipped dead weight.
//
// 2. **SVG** (Phase 22.3b) — imports `.svg` as React components that accept
//    width/height/color (glyphs use currentColor).
//
// Restart Metro with `--clear` and rebuild the dev client after changing this file.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname, { includeWebReplay: false });

config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
