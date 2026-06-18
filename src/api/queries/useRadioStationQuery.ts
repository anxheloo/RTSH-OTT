import { useChannelsQuery } from './useChannelsQuery';

/**
 * Returns a single radio station's metadata by looking it up in the cached
 * RADIO list — avoids a separate network request when the list is already warm.
 */
export const useRadioStationQuery = (id: string | undefined) => {
  const { channels, isLoading, error } = useChannelsQuery('RADIO');
  const station = id ? (channels.find((c) => c.id === id) ?? null) : null;
  return { station, isLoading, error };
};