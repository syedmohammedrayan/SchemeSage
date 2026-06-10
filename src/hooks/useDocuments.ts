import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface UserDocument {
  id: string;
  userId: string;
  documentType: string;
  filePath: string;
  fileName: string;
  uploadedAt: string;
}

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get<{ documents: UserDocument[] }>('/documents'),
    select: (data) => data.documents,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      return api.upload<{ document: UserDocument }>('/documents/upload', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete('/documents/' + id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
