import { useQuery } from '@tanstack/react-query';

import { getHomeFeed } from '../services/home';

export const useHomeFeedQuery = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['home-feed'],
    queryFn: getHomeFeed,
  });
  return {
    heroes: data?.heroes ?? [],
    continueWatching: data?.continueWatching ?? [],
    isLoading,
    error,
    refetch,
  };
};
