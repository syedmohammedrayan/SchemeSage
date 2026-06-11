import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

interface Application {
  id: string;
  userId: string;
  schemeId: string;
  schemeName: string;
  status: 'draft' | 'submitted' | 'saved' | 'in_review' | 'approved' | 'rejected' | 'document_pending';
  formData: any;
  documents: any[];
  trackingId?: string;
  type?: 'free' | 'assisted';
  paymentStatus?: 'pending' | 'paid' | 'failed';
  agentId?: string;
  agentDetails?: {
    fullName: string;
    mobile: string;
    email: string;
  };
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export function useApplications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['applications', user?.id],
    queryFn: () => api.get<{ applications: Application[] }>(`/applications/user/${user?.id}`),
    select: (data) => data.applications,
    enabled: !!user?.id,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { schemeId: string; schemeName: string; formData?: any }) =>
      api.post<{ application: Application }>('/applications/create', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useSubmitApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; documents: any[]; type?: 'free' | 'assisted'; paymentStatus?: string }) =>
      api.post<{ application: Application }>('/applications/submit', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<{ application: Application }>(`/applications/status/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
