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

const IS_DEV = process.env.APP_VARIANT === 'development';

export function useOTA() {
  const updateModalSlice = useAppStore((s) => s.updateModalSlice);
  const { t } = useTranslation();

  useEffect(() => {
    if (IS_DEV) return; // Skip the whole effect in dev, where OTAs are disabled and the check would be a no-op.
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
  }, []);
}
