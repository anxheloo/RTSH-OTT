import { useQuery } from '@tanstack/react-query';

import { getCatchupById, getCatchupList } from '../services/catchup';

export const useCatchupQuery = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['catchup'],
    queryFn: getCatchupList,
  });
  return { items: data ?? [], isLoading, error, refetch };
};

export const useCatchupItemQuery = (id: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['catchup', id],
    queryFn: () => getCatchupById(id),
    enabled: !!id,
  });
  return { item: data ?? null, isLoading, error };
};
