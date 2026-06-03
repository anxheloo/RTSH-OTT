import { useQuery } from '@tanstack/react-query';

import { getEpgByDate } from '../services/epg';

export const useEpgQuery = (date?: string) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['epg', date ?? 'today'],
    queryFn: () => getEpgByDate(date),
  });
  return { items: data ?? [], isLoading, error, refetch };
};
