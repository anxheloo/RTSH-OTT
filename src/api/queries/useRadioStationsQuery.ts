import { useQuery } from '@tanstack/react-query';

import { getRadioStations } from '../services/radio';

export const useRadioStationsQuery = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['radio-stations'],
    queryFn: getRadioStations,
  });
  return { stations: data ?? [], isLoading, error, refetch };
};