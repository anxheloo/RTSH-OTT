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
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-localization',
      [
        'expo-splash-screen',
        {
          // Native phase shows the logo from frame zero (user decision
          // 2026-06-12, supersedes the transparent-icon approach); the JS
          // BrandedSplash (lockup + progress bar) takes over once React mounts.
          // iOS gets the full lockup at the same 160pt width the JS clone
          // renders, so the handoff is pixel-identical. Android 12+ constrains
          // the splash icon to a ~192dp circle — the wide lockup can't survive
          // that, so Android shows the square mark instead (128dp: its diagonal
          // ~181dp fits inside the circle uncropped) and hands off to the
          // lockup in JS.
          backgroundColor: '#000000',
          ios: {
            image: './assets/images/splash-lockup.png',
            imageWidth: 160,
          },
          android: {
            image: './assets/images/splash-logo.png',
            imageWidth: 128,
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
