import { useState, useEffect, useMemo, useCallback } from 'react';

interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  visibleItems: number;
  totalHeight: number;
  offsetY: number;
}

export const useVirtualScroll = <T>(
  items: T[],
  options: VirtualScrollOptions
): VirtualScrollResult & {
  scrollElementProps: {
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  getItemProps: (index: number) => {
    style: React.CSSProperties;
    key: string | number;
  };
} => {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const virtualScrollResult = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleItems + overscan * 2
    );
    const offsetY = startIndex * itemHeight;

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight,
      offsetY,
    };
  }, [items.length, itemHeight, containerHeight, scrollTop, overscan]);

  const scrollElementProps = useMemo(
    () => ({
      onScroll: handleScroll,
      style: {
        height: containerHeight,
        overflowY: 'auto' as const,
      },
    }),
    [handleScroll, containerHeight]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      style: {
        position: 'absolute' as const,
        top: index * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight,
      },
      key: index,
    }),
    [itemHeight]
  );

  return {
    ...virtualScrollResult,
    scrollElementProps,
    getItemProps,
  };
};