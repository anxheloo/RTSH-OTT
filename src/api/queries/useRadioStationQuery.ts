import { useQuery } from '@tanstack/react-query';

import { getRadioById } from '../services/radio';

export const useRadioStationQuery = (id: string | undefined) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['radio-station', id],
    queryFn: () => getRadioById(id as string),
    enabled: Boolean(id),
  });
  return { station: data ?? null, isLoading, error, refetch };
};
