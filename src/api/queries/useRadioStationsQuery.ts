import { useChannelsQuery } from './useChannelsQuery';

/** Convenience wrapper — radio stations are `Channel` objects with `type: 'RADIO'`. */
export const useRadioStationsQuery = () => {
  const { channels, isLoading, error, refetch } = useChannelsQuery('RADIO');
  return { stations: channels, isLoading, error, refetch };
};