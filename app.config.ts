import { ConfigContext, ExpoConfig } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

// Cleartext (plain HTTP/WS) is allowed ONLY in dev/preview, for the dev backend
// (http://<ip>:port + ws://). Production builds get NO cleartext exception —
// prod must use https:// + wss://. Gated here so it can never ship to the store.
const ALLOW_CLEARTEXT = IS_DEV || IS_PREVIEW;

type VariantValues = {
  name: string;
  bundleIdentifier: string;
  package: string;
  // updatesChannel: string;
};

function getVariantValues(): VariantValues {
  if (IS_DEV) {
    return {
      name: 'RTSH TANI (Dev)',
      bundleIdentifier: 'al.rtsh.tani.dev',
      package: 'al.rtsh.tani.dev',
      // updatesChannel: "development",
    };
  }
  if (IS_PREVIEW) {
    return {
      name: 'RTSH TANI (Preview)',
      bundleIdentifier: 'al.rtsh.tani.preview',
      package: 'al.rtsh.tani.preview',
      // updatesChannel: "preview",
    };
  }
  return {
    name: 'RTSH TANI',
    bundleIdentifier: 'al.rtsh.tani',
    package: 'al.rtsh.tani',
    // updatesChannel: "production",
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const {
    name,
    bundleIdentifier,
    package: androidPackage,
    // updatesChannel,
  } = getVariantValues();

  return {
    ...config,
    name,
    slug: 'rtshtani',
    version: '1.0.0',
    // Mobile/TV only — no web target (product scope; also keeps `eas update
    // --platform=all` from bundling an unused web target).
    platforms: ['ios', 'android'],
    // Kept 'default' (not 'portrait') ON PURPOSE: iOS must still declare the
    // landscape interface orientations so the video player can rotate into
    // landscape on fullscreen. The app is otherwise portrait-only — enforced at
    // runtime by `useLockPortrait` (non-TV), not by this manifest. See
    // `useOrientation.ts`.
    orientation: 'default',
    icon: './assets/images/icon.png',
    scheme: 'rtshtani',
    userInterfaceStyle: 'automatic',
    // Brand-black root window background (expo-system-ui). Kills the white flash
    // shown by the RN root view before the first JS frame paints — the boot gap
    // now reads as black, seamless into the native splash + BrandedSplash.
    backgroundColor: '#000000',
    ios: {
      bundleIdentifier,
      // iPadOS is a contracted target (spec App.1). Without this the app ships
      // as iPhone-only (UIDeviceFamily = [1]) and iPad runs it letterboxed in
      // compatibility mode — the window never reports iPad size, so
      // `useResponsive()` classifies it as `phone` and the tablet layout pass
      // (landscape two-column, useContentWidth caps) is unreachable on iPad.
      supportsTablet: true,
      // Icon Composer bundle (SDK 54+). Ships the iOS 26 Liquid Glass treatment
      // and its own light/dark/tinted variants, so no per-appearance PNGs are
      // needed here; the top-level `icon` stays as the pre-iOS-26 fallback.
      icon: './assets/AppIcon.icon',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // iOS parallel of Android's usesCleartextTraffic — ATS exception for the
        // dev backend, dev/preview ONLY (never production; see ALLOW_CLEARTEXT).
        ...(ALLOW_CLEARTEXT ? { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } : {}),
      },
    },
    android: {
      package: androidPackage,
      adaptiveIcon: {
        // The foreground bakes in its own off-white plate across the inner 66%
        // (the adaptive-icon safe zone) with a transparent 17% margin, so
        // `backgroundColor` MUST match that plate (#F9FAFC) — any other value
        // shows the plate as a visible tile inside the launcher mask.
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundColor: '#F9FAFC',
        // Android 13+ themed icons: red marks opaque, the RTSH wordmark left as
        // a knockout so it stays legible when the OS recolors the silhouette.
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
    },
    plugins: [
      // ONE Android artifact for phone + tablet + Android TV + STB. Always on —
      // there is no TV-only build any more. Adds the leanback launcher category,
      // the `uses-feature required="false"` block a TV needs (see the plugin's
      // JSDoc — one implicitly-required feature de-lists the app from Play on
      // TV), and the TV launcher banner. All three are additive: a phone build
      // is unaffected, and `android:icon` is deliberately left alone so the
      // adaptive icon survives.
      //
      // This replaces `@react-native-tvos/config-tv` (still in devDependencies
      // for a future tvOS target): that plugin gates on EXPO_TV, and the same
      // flag rewrites the iOS project into a tvOS target, so it can never run
      // unconditionally here.
      ['./plugins/withUniversalAndroidTV', { banner: './assets/images/tv-banner.png' }],
      // NOTE: `withAndroidTVFocusFix` (the MainApplication patch for the RN 0.80+
      // D-pad-into-ScrollView regression, react-native-tvos #1087) was DELETED
      // 2026-07-28 — react-native-tvos 0.86 ships
      // `enableCustomFocusSearchOnClippedElementsAndroid` defaulting to FALSE, so
      // forcing it false was a no-op. Re-check that default on every SDK upgrade
      // (ReactNativeFeatureFlagsDefaults.kt / .h); if upstream flips it back to
      // true, the patch must return. See rules/ARCHITECTURE.md → Android TV / STB.
      'expo-router',
      // `faceIDPermission: false` DELETES `NSFaceIDUsageDescription` from the
      // built Info.plist (@expo/config-plugins `applyPermissions` treats an
      // explicit `false` as "remove the key"). Without it the plugin injects a
      // default string, and a usage-description for a permission the app never
      // requests is a real App Review risk — the reviewer sees a declared reason
      // with no feature behind it. We use SecureStore purely as a keychain
      // wrapper (`lib/keychain.ts`); `requireAuthentication` is never set, so
      // Face ID is never invoked.
      ['expo-secure-store', { faceIDPermission: false }],
      'expo-localization',
      // Allow plain-HTTP (cleartext) traffic for the dev backend (http://<ip>:port).
      // Android blocks cleartext by default in release builds; dev/preview ONLY
      // (false in production — see ALLOW_CLEARTEXT).
      ['expo-build-properties', { android: { usesCleartextTraffic: ALLOW_CLEARTEXT } }],
      [
        // Crash/error monitoring. This plugin wires the NATIVE half: the iOS
        // build phase that uploads dSYMs + JS source maps, and the Android
        // Gradle plugin that uploads ProGuard mappings + Hermes maps. Without
        // it you get JS-only symbolication and the hard crashes (dyld, OOM,
        // ANR) — the least debuggable ones — stay unreadable forever.
        //
        // `url` MUST be the EU regional host: the acsolutions-1a org lives in
        // Sentry's EU region, and an upload sent to sentry.io lands nowhere
        // with no error anywhere. The same value is read back by
        // `sentry-expo-upload-sourcemaps` on the EAS Update path — it parses
        // THIS plugin entry (matched by the exact name below) for url/org/project.
        //
        // `SENTRY_AUTH_TOKEN` is deliberately absent: it is a real secret (it
        // can publish releases to the org) and lives in `eas env` / the local
        // shell only. The DSN in `lib/monitoring.ts` is public by design.
        '@sentry/react-native/expo',
        {
          url: 'https://de.sentry.io/',
          organization: 'acsolutions-1a',
          project: 'react-native-rtsh-ott',
          // Skip symbol upload on day-to-day dev builds so they don't wait on
          // the network. NEVER true for preview/production — those are the
          // builds whose traces you actually need readable.
          disableAutoUpload: IS_DEV,
        },
      ],
      [
        'expo-splash-screen',
        {
          // Native splash shows the RTSH 2020 logo lockup from frame zero on a
          // black background, and holds for the whole boot (no JS splash phase).
          // Android 12+ constrains the splash icon to a ~192dp circle, so the
          // wide lockup is kept narrow (160dp wide → ~175dp diagonal) to fit
          // inside the circle uncropped.
          backgroundColor: '#000000',
          ios: {
            image: './assets/images/splash-icon.png',
            imageWidth: 200,
          },
          android: {
            image: './assets/images/splash-icon.png',
            imageWidth: 160,
          },
        },
      ],
      [
        'expo-video',
        {
          supportsBackgroundPlayback: true,
          supportsPictureInPicture: true,
        },
      ],
      [
        'expo-audio',
        {
          enableBackgroundPlayback: true,
          // We only ever PLAY audio (radio) — never record. Dropping
          // RECORD_AUDIO isn't cosmetic: Android implies
          // `android.hardware.microphone` as REQUIRED from that permission, and
          // a required feature a TV doesn't have makes Google Play hide the app
          // from every TV device. Also removes a permission we'd otherwise have
          // to justify in the store listing.
          recordAudioAndroid: false,
          // The iOS half of the same decision: without this the plugin injects a
          // default `NSMicrophoneUsageDescription`, declaring a permission we
          // never request. `recordAudioAndroid` only covers Android.
          microphonePermission: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        projectId: '19f4d236-ba4f-4208-bf8b-4a0c229e027c',
      },
      // Which variant this binary is. Build-time only (`APP_VARIANT` is not
      // readable from the JS bundle at runtime), surfaced through `extra` the
      // same way `devicePlatform` is. Consumed by `lib/monitoring.ts` as
      // Sentry's `environment` — without it every build pools into one stream
      // and the crash-free rate is meaningless.
      appVariant: process.env.APP_VARIANT ?? 'production',
      // Build-time platform override for distributions the runtime can't
      // detect — operator STBs (`APP_PLATFORM=androidstb`) look identical to
      // retail Android TV at runtime. Unset on mobile builds; consumed by
      // `getDevicePlatform()` (utils/device.ts) for the X-Device-Platform header.
      devicePlatform: process.env.APP_PLATFORM,
    },
    owner: 'anxheloo',
    updates: {
      url: 'https://u.expo.dev/19f4d236-ba4f-4208-bf8b-4a0c229e027c',
      // requestHeaders: { "expo-channel-name": updatesChannel },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  };
};
