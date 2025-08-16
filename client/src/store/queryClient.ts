import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Query keys factory
export const queryKeys = {
  all: ['api'] as const,
  workflows: () => [...queryKeys.all, 'workflows'] as const,
  workflow: (id: string) => [...queryKeys.workflows(), id] as const,
  executions: () => [...queryKeys.all, 'executions'] as const,
  execution: (id: string) => [...queryKeys.executions(), id] as const,
  executionAnalytics: (params?: Record<string, any>) => [...queryKeys.executions(), 'analytics', params] as const,
  user: () => [...queryKeys.all, 'user'] as const,
};