import { ConfigContext, ExpoConfig } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

type VariantValues = {
  name: string;
  bundleIdentifier: string;
  package: string;
};

function getVariantValues(): VariantValues {
  if (IS_DEV) {
    return {
      name: "RTSH TANI (Dev)",
      bundleIdentifier: "al.rtsh.tani.dev",
      package: "al.rtsh.tani.dev",
    };
  }
  if (IS_PREVIEW) {
    return {
      name: "RTSH TANI (Preview)",
      bundleIdentifier: "al.rtsh.tani.preview",
      package: "al.rtsh.tani.preview",
    };
  }
  return {
    name: "RTSH TANI",
    bundleIdentifier: "al.rtsh.tani",
    package: "al.rtsh.tani",
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const {
    name,
    bundleIdentifier,
    package: androidPackage,
  } = getVariantValues();

  return {
    ...config,
    name,
    slug: "rtshtani",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "rtshtani",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier,
      icon: "./assets/expo.icon",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: androidPackage,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          android: {
            image: "./assets/images/splash-icon.png",
            imageWidth: 76,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "19f4d236-ba4f-4208-bf8b-4a0c229e027c",
      },
    },
    owner: "anxheloo",
    updates: {
      url: "https://u.expo.dev/19f4d236-ba4f-4208-bf8b-4a0c229e027c",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  };
};
