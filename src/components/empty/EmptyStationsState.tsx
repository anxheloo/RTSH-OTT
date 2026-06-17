/**
 * EmptyStationsState — shown when the radio station list loaded but is empty
 * (`[]`). For a *load failure*, use `ErrorState`. Thin wrapper over
 * `ListStateView`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

import ListStateView from './ListStateView';

type EmptyStationsStateProps = {
  onRetry?: () => void;
  testID?: string;
};

const EmptyStationsState: React.FC<EmptyStationsStateProps> = ({ onRetry, testID }) => {
  const { t } = useTranslation();

  return (
    <ListStateView
      title={t('empty.stations_title')}
      subtitle={t('empty.stations_subtitle')}
      retryLabel={t('empty.retry')}
      onRetry={onRetry}
      testID={testID}
    />
  );
};

export default EmptyStationsState;