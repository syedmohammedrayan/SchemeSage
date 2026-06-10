import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Scheme } from '@/data/schemes';

interface SchemesResponse {
  schemes: Scheme[];
}

interface SchemeResponse {
  scheme: Scheme;
}

export function useSchemes(filters?: Record<string, string>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }
  const query = params.toString();

  return useQuery({
    queryKey: ['schemes', query],
    queryFn: () => api.get<SchemesResponse>(`/schemes${query ? `?${query}` : ''}`),
    select: (data) => data.schemes,
  });
}

export function useScheme(id: string | undefined) {
  return useQuery({
    queryKey: ['scheme', id],
    queryFn: () => api.get<SchemeResponse>(`/schemes/${id}`),
    select: (data) => data.scheme,
    enabled: !!id,
  });
}

export function useSavedSchemes() {
  return useQuery({
    queryKey: ['saved-schemes'],
    queryFn: () => api.get<{ schemes: Scheme[] }>('/saved-schemes'),
    select: (data) => data.schemes,
  });
}

export function useSaveScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (schemeId: string) =>
      api.post<{ saved: boolean }>(`/saved-schemes/${schemeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-schemes'] });
      queryClient.invalidateQueries({ queryKey: ['saved-check'] });
    },
  });
}

export function useCheckSaved(schemeId: string | undefined) {
  return useQuery({
    queryKey: ['saved-check', schemeId],
    queryFn: () => api.get<{ saved: boolean }>(`/saved-schemes/check/${schemeId}`),
    select: (data) => data.saved,
    enabled: !!schemeId,
  });
}
