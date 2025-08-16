import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

interface OptimisticUpdateOptions<T> {
  queryKey: string[];
  updateFn: (oldData: T | undefined, newData: Partial<T>) => T;
  rollbackFn?: (oldData: T | undefined) => T | undefined;
}

export const useOptimisticUpdate = <T>({
  queryKey,
  updateFn,
  rollbackFn,
}: OptimisticUpdateOptions<T>) => {
  const queryClient = useQueryClient();

  const optimisticUpdate = useCallback(
    async (newData: Partial<T>, mutationFn: () => Promise<T>) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<T>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<T>(queryKey, (oldData) =>
        updateFn(oldData, newData)
      );

      try {
        // Perform the actual mutation
        const result = await mutationFn();
        
        // Update with the actual result
        queryClient.setQueryData<T>(queryKey, result);
        
        return result;
      } catch (error) {
        // Rollback on error
        if (rollbackFn) {
          queryClient.setQueryData<T>(queryKey, rollbackFn(previousData));
        } else {
          queryClient.setQueryData<T>(queryKey, previousData);
        }
        throw error;
      }
    },
    [queryClient, queryKey, updateFn, rollbackFn]
  );

  return optimisticUpdate;
};