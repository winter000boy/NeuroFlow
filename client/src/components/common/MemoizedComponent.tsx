import React, { memo, useMemo } from 'react';

interface MemoizedComponentProps<T> {
  data: T;
  render: (data: T) => React.ReactNode;
  dependencies?: any[];
  displayName?: string;
}

function MemoizedComponentInner<T>({
  data,
  render,
  dependencies = [],
}: MemoizedComponentProps<T>) {
  const memoizedContent = useMemo(
    () => render(data),
    [data, ...dependencies]
  );

  return <>{memoizedContent}</>;
}

export const MemoizedComponent = memo(MemoizedComponentInner) as <T>(
  props: MemoizedComponentProps<T>
) => React.JSX.Element;

// Higher-order component for memoizing expensive components
export const withMemoization = <P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  const MemoizedComp = memo(Component, areEqual);
  MemoizedComp.displayName = `Memoized(${Component.displayName || Component.name})`;
  return MemoizedComp;
};

// Custom hook for memoizing expensive calculations
export const useExpensiveCalculation = <T, R>(
  data: T,
  calculation: (data: T) => R,
  dependencies: any[] = []
): R => {
  return useMemo(() => calculation(data), [data, ...dependencies]);
};