import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import * as Updates from 'expo-updates';

import { useAppStore } from '@/store/useAppStore';

/**
 * Checks for an OTA update on mount and prompts the user via a confirmation
 * modal if one is available. No-op in dev (Updates.isEnabled is false).
 *
 * User flow: Update → fetchUpdateAsync + reloadAsync. Later → dismiss.
 */

export function useOTA() {
  const updateModalSlice = useAppStore((s) => s.updateModalSlice);
  const { t } = useTranslation();

  useEffect(() => {
    // `Updates.isEnabled` is the ONLY dev guard needed — expo-updates reports
    // false in any dev-client / debug build. A previous `process.env.APP_VARIANT
    // === 'development'` check sat above this line and was dead code: only
    // `EXPO_PUBLIC_*` vars are inlined into the bundle (babel-preset-expo →
    // `inline-env-vars`), so it evaluated to `false` in every build. Never read a
    // non-`EXPO_PUBLIC_` env var from app code — it is always `undefined`.
    if (!Updates.isEnabled) return;

    const checkForUpdate = async () => {
      try {
        const result = await Updates.checkForUpdateAsync();

        if (!result.isAvailable) return;

        updateModalSlice({
          currentModal: 'confirmation',
          modalData: {
            title: t('update.ota_title'),
            description: t('update.ota_message'),
            button: t('update.ota_cta'),
            button2: t('update.ota_later'),
            action: async () => {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            },
            action2: () => updateModalSlice({ currentModal: null }),
          },
        });
      } catch {
        // Silent — OTA is best-effort, never block the user on a failed check.
      }
    };

    checkForUpdate();
    // Both deps are effectively stable (store setter identity + i18next `t`);
    // a language switch re-running the check is harmless (checkForUpdateAsync
    // is cheap and `isAvailable` is almost always false).
  }, [t, updateModalSlice]);
}
