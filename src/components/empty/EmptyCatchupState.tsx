/**
 * EmptyCatchupState — shown when the catch-up archive loaded but has no
 * programmes. For a *load failure*, use `ErrorState`. Thin wrapper over
 * `ListStateView`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

import ListStateView from './ListStateView';

type EmptyCatchupStateProps = {
  onRetry?: () => void;
  testID?: string;
};

const EmptyCatchupState: React.FC<EmptyCatchupStateProps> = ({ onRetry, testID }) => {
  const { t } = useTranslation();

  return (
    <ListStateView
      title={t('empty.catchup_title')}
      subtitle={t('empty.catchup_subtitle')}
      retryLabel={t('empty.retry')}
      onRetry={onRetry}
      testID={testID}
    />
  );
};

export default EmptyCatchupState;