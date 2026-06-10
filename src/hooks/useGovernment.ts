import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useGovernmentAnalytics() {
  return useQuery({
    queryKey: ['gov-analytics'],
    queryFn: () => api.get<any>('/government/analytics'),
  });
}

export function useGovernmentApplications(filters?: Record<string, string>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }
  const query = params.toString();

  return useQuery({
    queryKey: ['gov-applications', query],
    queryFn: () => api.get<{ applications: any[] }>(`/government/applications${query ? `?${query}` : ''}`),
    select: (data) => data.applications,
  });
}
