import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Profile {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  state: string;
  district: string;
  role: string;
  age?: number;
  gender?: string;
  occupation?: string;
  annualIncome?: number;
  category?: string;
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<{ profile: Profile }>('/profile'),
    select: (data) => data.profile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<Profile>) =>
      api.put<{ profile: Profile }>('/profile', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
