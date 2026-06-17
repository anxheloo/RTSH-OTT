/**
 * EmptyEpgState — shown when the programme guide loaded but has no data for the
 * selected date. For a *load failure*, use `ErrorState`. Thin wrapper over
 * `ListStateView`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

import ListStateView from './ListStateView';

type EmptyEpgStateProps = {
  onRetry?: () => void;
  testID?: string;
};

const EmptyEpgState: React.FC<EmptyEpgStateProps> = ({ onRetry, testID }) => {
  const { t } = useTranslation();

  return (
    <ListStateView
      title={t('empty.epg_title')}
      subtitle={t('empty.epg_subtitle')}
      retryLabel={t('empty.retry')}
      onRetry={onRetry}
      testID={testID}
    />
  );
};

export default EmptyEpgState;
