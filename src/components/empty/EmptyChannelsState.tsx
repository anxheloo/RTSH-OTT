/**
 * EmptyChannelsState — shown when the channel list loaded successfully but is
 * empty (`[]`). For a *load failure*, use `ErrorState` instead (the screen
 * picks based on the query's `error`). Thin wrapper over `ListStateView`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

import ListStateView from './ListStateView';

type EmptyChannelsStateProps = {
  onRetry?: () => void;
  testID?: string;
};

const EmptyChannelsState: React.FC<EmptyChannelsStateProps> = ({ onRetry, testID }) => {
  const { t } = useTranslation();

  return (
    <ListStateView
      title={t('empty.channels_title')}
      subtitle={t('empty.channels_subtitle')}
      retryLabel={t('empty.retry')}
      onRetry={onRetry}
      testID={testID}
    />
  );
};

export default EmptyChannelsState;