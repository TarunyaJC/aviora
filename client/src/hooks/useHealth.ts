import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';

export interface HealthData {
  status: 'ok';
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient<HealthData>('/api/health'),
    staleTime: 30_000,
    retry: 1,
  });
}
