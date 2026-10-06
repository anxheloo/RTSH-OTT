/**
 * Config plugin — ships an Android Baseline Profile with the app.
 *
 * WHY: the ANRs we see in production (REACT-NATIVE-RTSH-OTT-8 / -K) are cold
 * starts on low-end armv7 TV boxes where everything the React Native and Expo
 * runtimes do at startup (view-manager reflection, module construction, class
 * loading) still runs interpreted, because a fresh Play install has no compiled
 * code yet. A Baseline Profile lists those classes and methods so ART compiles
 * them ahead of time, at install. Neither React Native nor Expo ships one.
 *
 * The profile text is captured from a NON-minified release build (Android's
 * documented manual procedure); AGP + R8 rewrite it to the obfuscated names of
 * the minified build and package it into the APK/AAB. Re-capture it when the
 * native dependency set changes (SDK upgrade) — a stale profile is harmless
 * (unknown entries are skipped) but slowly loses its effect.
 *
 * The profile is stored gzipped (~9.7 MB of text → ~0.8 MB) and unpacked into
 * `android/app/src/main/baseline-prof.txt`, where AGP looks for it. `androidx.profileinstaller` (which also applies the
 * profile to installs that don't come through Play, e.g. sideloaded STBs) is
 * already in the app transitively via androidx — verify with
 * `aapt2 dump xmltree <apk> --file AndroidManifest.xml | grep ProfileInstall`.
 *
 * Source: https://developer.android.com/topic/performance/baselineprofiles/manually-create-measure
 */
const { withDangerousMod } = require('@expo/config-plugins');
const { promises: fs } = require('fs');
const path = require('path');
const { gunzipSync } = require('zlib');

const withAndroidBaselineProfile = (config, { profile }) => {
  if (!profile) throw new Error('withAndroidBaselineProfile: `profile` (path to baseline-prof.txt.gz) is required');

  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const source = path.resolve(cfg.modRequest.projectRoot, profile);
      // Fail loudly at prebuild rather than silently shipping without a profile.
      await fs.access(source).catch(() => {
        throw new Error(`withAndroidBaselineProfile: profile not found at ${source}`);
      });
      const target = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'baseline-prof.txt');
      await fs.writeFile(target, gunzipSync(await fs.readFile(source)));
      return cfg;
    },
  ]);
};

module.exports = withAndroidBaselineProfile;
