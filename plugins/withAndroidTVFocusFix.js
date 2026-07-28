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
 * GATED AT RUNTIME, NOT BUILD TIME (2026-07-28). This plugin used to be registered
 * only when `EXPO_TV=1`, which is what forced a separate TV build. Now that ONE
 * artifact serves phone + tablet + TV (see `withUniversalAndroidTV`), the patch is
 * applied to every Android build and the injected code checks `UiModeManager` itself.
 * That matters: the flag guards `ReactScrollView.focusSearch(View, direction)`, the
 * DIRECTIONAL-focus path — untouched by touch input, but very much used by hardware
 * keyboard arrow navigation. Forcing it off app-wide would have quietly broken
 * keyboard focus into clipped list children on phone/tablet. The runtime check keeps
 * mobile on stock RN behaviour, exactly as before the single-build merge.
 *
 * Applied automatically by `expo prebuild` locally AND by EAS Build — no
 * hand-maintained native code, no committed `android/` files (gitignored CNG output).
 *
 * See: https://github.com/react-native-tvos/react-native-tvos/issues/1087
 */
const { withMainApplication } = require('@expo/config-plugins');

const IMPORT_ANCHOR = 'import expo.modules.ApplicationLifecycleDispatcher';
const INJECT_ANCHOR = '    loadReactNative(this)';
const PATCH_MARKER = 'enableCustomFocusSearchOnClippedElementsAndroid';

const FLAG_IMPORTS = [
  'import android.app.UiModeManager',
  'import android.content.Context',
  'import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags',
  'import com.facebook.react.internal.featureflags.ReactNativeNewArchitectureFeatureFlagsDefaults',
].join('\n');

// `android.content.res.Configuration` is already imported by the Expo template
// (onConfigurationChanged), so it is deliberately absent from FLAG_IMPORTS.
const OVERRIDE = `
    // TV D-pad focus fix (react-native-tvos #1087): disable the RN 0.80+ custom
    // clipped-element focus search that bypasses TVFocusGuideView inside ScrollViews.
    // TV ONLY — the flag also governs hardware-keyboard directional focus, so it must
    // not change behaviour on phone/tablet. Same UiModeManager signal RN itself uses
    // for Platform.isTV, so this branch and the JS TV branches can never disagree.
    // Runs after loadReactNative (SoLoader ready + the New-Arch entry already called
    // override(), so we must force). We extend the SAME New-Arch defaults provider so
    // ONLY this flag changes and Fabric/TurboModules/Bridgeless stay enabled.
    val uiModeManager = getSystemService(Context.UI_MODE_SERVICE) as? UiModeManager
    if (uiModeManager?.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION) {
      ReactNativeFeatureFlags.dangerouslyForceOverride(
          object : ReactNativeNewArchitectureFeatureFlagsDefaults() {
            override fun enableCustomFocusSearchOnClippedElementsAndroid(): Boolean = false
          })
    }`;

/**
 * String-replace patching is anchor-sensitive: if an SDK upgrade reshapes
 * `MainApplication.kt`, `String.replace` silently returns the input unchanged and
 * the build SUCCEEDS with the fix missing — surfacing months later as dead D-pad
 * navigation in production. Throwing converts that into a failed prebuild.
 */
function replaceOrThrow(contents, anchor, replacement) {
  if (!contents.includes(anchor)) {
    throw new Error(
      `[withAndroidTVFocusFix] Anchor not found in MainApplication.kt: "${anchor}". ` +
        'The Expo template likely changed — re-check the patch against the new file.',
    );
  }
  return contents.replace(anchor, replacement);
}

const withAndroidTVFocusFix = (config) =>
  withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Idempotent: skip if already patched (survives repeated prebuilds).
    if (contents.includes(PATCH_MARKER)) {
      return cfg;
    }

    // 1. Add the imports next to the existing expo import.
    contents = replaceOrThrow(contents, IMPORT_ANCHOR, `${FLAG_IMPORTS}\n\n${IMPORT_ANCHOR}`);

    // 2. Inject the gated override immediately AFTER loadReactNative(this).
    contents = replaceOrThrow(contents, INJECT_ANCHOR, `${INJECT_ANCHOR}${OVERRIDE}`);

    cfg.modResults.contents = contents;
    return cfg;
  });

module.exports = withAndroidTVFocusFix;
