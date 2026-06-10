import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<any>('/admin/stats'),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<{ users: any[] }>('/admin/users'),
    select: (data) => data.users,
  });
}

export function useAdminApplications() {
  return useQuery({
    queryKey: ['admin-applications'],
    queryFn: () => api.get<{ applications: any[] }>('/admin/applications'),
    select: (data) => data.applications,
  });
}

export function useAdminUpdateAppStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/admin/applications/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useAdminCreateScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheme: any) => api.post('/admin/schemes', scheme),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useAdminUpdateScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/admin/schemes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
    },
  });
}

export function useAdminDeleteScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/schemes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useAdminBroadcast() {
  return useMutation({
    mutationFn: (data: { title: string; message: string; type?: string }) =>
      api.post('/admin/notifications/broadcast', data),
  });
}

// AI Agent Hooks
export function useAIAgents() {
  return useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => api.get<any[]>('/admin/ai-agents'),
  });
}

export function useCreateAIAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentData: any) => api.post('/admin/ai-agents', agentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
    },
  });
}

export function useSyncLeanix() {
  return useMutation({
    mutationFn: () => api.post('/admin/ai-agents/sync', {}),
  });
}
