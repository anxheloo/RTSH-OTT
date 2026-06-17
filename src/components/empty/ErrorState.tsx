/**
 * ErrorState — reusable "couldn't load this list" placeholder with a Retry
 * button. Generic copy (`errors.list_failed_*`) so it works for any failed data
 * query; pass the query's `refetch` as `onRetry`. Pairs with the global
 * `apiError` modal: the modal is the loud one-time alert, this is the quiet
 * persistent screen state that stays behind it (and after it's dismissed).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

import ListStateView from './ListStateView';

type ErrorStateProps = {
  onRetry?: () => void;
  testID?: string;
};

const ErrorState: React.FC<ErrorStateProps> = ({ onRetry, testID }) => {
  const { t } = useTranslation();

  return (
    <ListStateView
      title={t('errors.list_failed_title')}
      subtitle={t('errors.list_failed_subtitle')}
      retryLabel={t('common.retry')}
      onRetry={onRetry}
      testID={testID}
    />
  );
};

export default ErrorState;