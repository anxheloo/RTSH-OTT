/**
 * Config plugin — fixes D-pad focus navigation inside ScrollViews on Android TV.
 *
 * react-native-tvos #1087: since RN 0.80+, Android `ReactScrollView.focusSearch()`
 * runs a custom clipped-element focus search (RN feature flag
 * `enableCustomFocusSearchOnClippedElementsAndroid`, ON by default) that returns a
 * focus target directly and BYPASSES the parent `TVFocusGuideView` / normal focus
 * logic — so the D-pad can't move focus into or through a `ScrollView`/`FlatList`.
 * We disable the flag to restore the pre-0.80 focus behaviour.
 *
 * WHY THIS EXACT SHAPE (three earlier attempts failed — documented so nobody redoes them):
 *  - `loadReactNative(this)` internally calls `DefaultNewArchitectureEntryPoint.load()`,
 *    which ALREADY does `ReactNativeFeatureFlags.override(ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android())`.
 *    So a plain `override()` of our own (before OR after) throws
 *    "Feature flags cannot be overridden more than once" → must use `dangerouslyForceOverride`.
 *  - It must run AFTER `loadReactNative` (SoLoader is initialised by then; calling the
 *    feature-flag native interop before SoLoader.init crashes).
 *  - The provider we force MUST extend `ReactNativeNewArchitectureFeatureFlagsDefaults`
 *    (what `loadReactNative` applied — `..._Stable_Android` is an empty subclass of it),
 *    NOT `ReactNativeFeatureFlagsDefaults`. Extending plain Defaults resets every New-Arch
 *    flag (Fabric/TurboModules/Bridgeless) back to off → blank screen. Extending the
 *    New-Arch defaults changes ONLY our one flag.
 *
 * TV-only: added in `app.config.ts` ONLY when `EXPO_TV` is set, so a mobile prebuild
 * never patches `MainApplication` and phone/tablet is byte-for-byte untouched. Applied
 * automatically by `expo prebuild` locally AND by EAS Build — no hand-maintained native
 * code, no committed `android/` files (that dir is gitignored CNG output).
 *
 * See: https://github.com/react-native-tvos/react-native-tvos/issues/1087
 */
const { withMainApplication } = require('@expo/config-plugins');

const FLAG_IMPORTS = [
  'import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags',
  'import com.facebook.react.internal.featureflags.ReactNativeNewArchitectureFeatureFlagsDefaults',
].join('\n');

const OVERRIDE = `
    // TV D-pad focus fix (react-native-tvos #1087): disable the RN 0.80+ custom
    // clipped-element focus search that bypasses TVFocusGuideView inside ScrollViews.
    // Runs after loadReactNative (SoLoader ready + the New-Arch entry already called
    // override(), so we must force). We extend the SAME New-Arch defaults provider so
    // ONLY this flag changes and Fabric/TurboModules/Bridgeless stay enabled.
    ReactNativeFeatureFlags.dangerouslyForceOverride(
        object : ReactNativeNewArchitectureFeatureFlagsDefaults() {
          override fun enableCustomFocusSearchOnClippedElementsAndroid(): Boolean = false
        })`;

const withAndroidTVFocusFix = (config) =>
  withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Idempotent: skip if already patched (survives repeated prebuilds).
    if (contents.includes('enableCustomFocusSearchOnClippedElementsAndroid')) {
      return cfg;
    }

    // 1. Add the imports next to the existing expo import.
    contents = contents.replace(
      'import expo.modules.ApplicationLifecycleDispatcher',
      `${FLAG_IMPORTS}\n\nimport expo.modules.ApplicationLifecycleDispatcher`,
    );

    // 2. Inject the forced override immediately AFTER loadReactNative(this).
    contents = contents.replace('    loadReactNative(this)', `    loadReactNative(this)${OVERRIDE}`);

    cfg.modResults.contents = contents;
    return cfg;
  });

module.exports = withAndroidTVFocusFix;
