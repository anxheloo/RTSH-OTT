// Metro config — enables importing `.svg` files as React components via
// react-native-svg-transformer (Phase 22.3b). SVGs become dynamic components
// that accept width/height/color (glyphs use currentColor). Restart Metro with
// `--clear` and rebuild the dev client after changing this file.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve(
  'react-native-svg-transformer/expo',
);
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
