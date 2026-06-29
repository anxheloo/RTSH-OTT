import { ConfigContext, ExpoConfig } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

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
    // Mobile/TV only — no web target. Without this, `eas update --platform=all`
    // also bundles web, which fails resolving react-native-country-picker-modal's
    // `react-async-hook` dep (its `module` field points at an unshipped .esm.js).
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
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: androidPackage,
      adaptiveIcon: {
        // Logo centered with ~17% transparent padding so Android's launcher
        // mask (circle/squircle) never crops the mark. Background is brand
        // black to match the splash; the foreground's own black areas blend in.
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundColor: '#000000',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-localization',
      // Allow plain-HTTP (cleartext) traffic for the LAN dev backend (http://<ip>:port).
      // Android blocks cleartext by default in release builds; this enables it app-wide.
      ['expo-build-properties', { android: { usesCleartextTraffic: true } }],
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
