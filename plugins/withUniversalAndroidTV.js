/**
 * Config plugin — makes ONE Android artifact install and run on phone, tablet,
 * Android TV and operator STB. Replaces the Android half of
 * `@react-native-tvos/config-tv`, which we no longer register.
 *
 * WHY NOT config-tv: it gates every change behind `EXPO_TV=1`, which forced a
 * second build. Worse, that same flag also rewrites the *iOS* project into a
 * tvOS target (`withTVXcodeProject` / `withTVPodfile` / `withTVInfoPlist`), so
 * it can never be enabled unconditionally in a repo that also ships iOS. Its
 * `androidTVIcon` option additionally overwrites `android:icon` on
 * `<application>` — a GLOBAL attribute — replacing the phone adaptive icon with
 * a flat TV drawable. This plugin is Android-only, always-on, and never touches
 * `android:icon`.
 *
 * `Platform.isTV` is resolved at RUNTIME on Android (UiModeManager, see
 * react-native's AndroidInfoModule → Platform.android.js), so the JS bundle
 * already adapts itself. The manifest below is the only build-time TV input.
 *
 * Three edits, all additive — a phone build loses nothing:
 *
 *  1. LEANBACK_LAUNCHER category on the EXISTING main intent-filter. The TV
 *     launcher ignores `LAUNCHER`; phones ignore `LEANBACK_LAUNCHER`. It must
 *     go on the same filter, not a second one — two filters make some launchers
 *     render the app twice.
 *
 *  2. `<uses-feature android:required="false">` for every feature a TV lacks.
 *     This is NOT cosmetic: Android *infers* required features from permissions
 *     (RECORD_AUDIO ⇒ android.hardware.microphone), and a single implicitly
 *     required feature makes Google Play hide the app from every TV device.
 *     `required="false"` can only ever widen compatibility, never narrow it.
 *     `leanback` stays false on purpose — true would hide the app from phones.
 *
 *  3. The 320x180 TV banner (`android:banner`), which the TV launcher renders
 *     INSTEAD of an icon and with no text label, so the app name is baked into
 *     the artwork. Phones ignore the attribute entirely.
 *
 * Sources: https://developer.android.com/training/tv/start/start
 *          https://developer.android.com/training/tv/start/hardware
 */
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const { promises: fs } = require('fs');
const path = require('path');

const { getMainActivityOrThrow, getMainApplicationOrThrow } = AndroidConfig.Manifest;

const LEANBACK_LAUNCHER_CATEGORY = 'android.intent.category.LEANBACK_LAUNCHER';

/** Resource name + density bucket for the copied banner. */
const BANNER_RESOURCE = 'tv_banner';
const BANNER_DENSITY_DIR = 'drawable-xhdpi';

/**
 * Every feature a TV lacks, per Google's TV hardware doc. `touchscreen` and
 * `leanback` are the two Play actually filters on; `microphone` is the one that
 * bites us specifically (expo-audio's RECORD_AUDIO implies it). The rest are
 * declared defensively so a future library that adds a permission can't
 * silently de-list the app from TV again.
 */
const OPTIONAL_FEATURES = [
  'android.hardware.touchscreen',
  'android.hardware.faketouch',
  'android.software.leanback',
  'android.hardware.microphone',
  'android.hardware.camera',
  'android.hardware.telephony',
  'android.hardware.location.gps',
  'android.hardware.wifi',
  'android.hardware.sensor',
];

/** The `<intent-filter>` carrying `android.intent.action.MAIN`. */
function findMainIntentFilter(mainActivity) {
  return (mainActivity['intent-filter'] ?? []).find((filter) =>
    (filter.action ?? []).some((a) => a.$?.['android:name'] === 'android.intent.action.MAIN'),
  );
}

function addLeanbackLauncherCategory(manifest) {
  const mainIntentFilter = findMainIntentFilter(getMainActivityOrThrow(manifest));

  if (!mainIntentFilter) {
    throw new Error(
      '[withUniversalAndroidTV] No MAIN intent-filter on the main activity — cannot add the leanback launcher category.',
    );
  }

  const categories = mainIntentFilter.category ?? [];
  const alreadyPresent = categories.some(
    (c) => c.$?.['android:name'] === LEANBACK_LAUNCHER_CATEGORY,
  );

  if (!alreadyPresent) {
    categories.push({ $: { 'android:name': LEANBACK_LAUNCHER_CATEGORY } });
    mainIntentFilter.category = categories;
  }

  return manifest;
}

function addOptionalFeatures(manifest) {
  const features = Array.isArray(manifest.manifest['uses-feature'])
    ? manifest.manifest['uses-feature']
    : [];

  for (const name of OPTIONAL_FEATURES) {
    const existing = features.find((f) => f.$?.['android:name'] === name);

    if (existing) {
      // Another plugin may have declared it required — force it back to false,
      // otherwise Play drops the app from TV devices.
      existing.$['android:required'] = 'false';
      continue;
    }

    features.push({ $: { 'android:name': name, 'android:required': 'false' } });
  }

  manifest.manifest['uses-feature'] = features;
  return manifest;
}

function setTVBannerAttribute(manifest) {
  const application = getMainApplicationOrThrow(manifest);
  application.$['android:banner'] = `@drawable/${BANNER_RESOURCE}`;
  return manifest;
}

/**
 * Copies the banner into `res/drawable-xhdpi/`. One density bucket is correct —
 * Android falls back across buckets, and 320x180 IS the xhdpi spec, so copying
 * the same file into every bucket (what config-tv does) only adds dead weight.
 */
const withTVBannerAsset = (config, bannerPath) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const source = path.resolve(cfg.modRequest.projectRoot, bannerPath);

      // Fail loudly at prebuild rather than shipping a TV build with no launcher
      // artwork (the TV row would render an empty tile).
      await fs.access(source).catch(() => {
        throw new Error(`[withUniversalAndroidTV] TV banner not found at ${source}`);
      });

      const targetDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        BANNER_DENSITY_DIR,
      );

      await fs.mkdir(targetDir, { recursive: true });
      await fs.copyFile(source, path.join(targetDir, `${BANNER_RESOURCE}.png`));

      return cfg;
    },
  ]);

/** @param {{ banner: string }} props Project-relative path to the 320x180 TV banner. */
const withUniversalAndroidTV = (config, { banner } = {}) => {
  if (!banner) {
    throw new Error('[withUniversalAndroidTV] `banner` is required (path to a 320x180 PNG).');
  }

  config = withTVBannerAsset(config, banner);

  return withAndroidManifest(config, (cfg) => {
    cfg.modResults = addLeanbackLauncherCategory(cfg.modResults);
    cfg.modResults = addOptionalFeatures(cfg.modResults);
    cfg.modResults = setTVBannerAttribute(cfg.modResults);
    return cfg;
  });
};

module.exports = withUniversalAndroidTV;
