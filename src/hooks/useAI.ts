import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Scheme } from '@/data/schemes';

interface AIRecommendation {
  schemeId: string;
  matchScore: number;
  reason: string;
  scheme: Scheme;
}

interface ChatResponse {
  response: string;
}

interface EligibilityResult {
  eligible: boolean;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
}

export function useAIRecommendations(enabled = false, lang = 'en-IN', profile?: any, query?: string) {
  return useQuery({
    queryKey: ['ai-recommendations', lang, JSON.stringify(profile), query],
    queryFn: () => api.post<{ recommendations: AIRecommendation[] }>('/ai/recommendations', { lang, profile, query }),
    select: (data) => data.recommendations,
    enabled,
  });
}

export function useAIChat() {
  return useMutation({
    mutationFn: (data: { message: string; conversationHistory: { role: string; content: string }[]; profile?: any }) =>
      api.post<ChatResponse>('/ai/chat', data),
  });
}

export function useAISummary(schemeId: string | undefined) {
  return useQuery({
    queryKey: ['ai-summary', schemeId],
    queryFn: () => api.get<{ summary: string }>(`/ai/summarize/${schemeId}`),
    select: (data) => data.summary,
    enabled: !!schemeId,
    staleTime: Infinity,
  });
}

export function useEligibilityCheck() {
  return useMutation({
    mutationFn: ({ schemeId, profile }: { schemeId: string; profile?: any }) =>
      api.post<EligibilityResult>(`/ai/check-eligibility/${schemeId}`, { profile }),
  });
}
