import { useRef, useCallback } from 'react';
export default function useInfiniteScroll(onLoadMore, options = {}) {
  const observerRef = useRef(null);
  const lastElementRef = useCallback((node) => {}, []);
  return { lastElementRef, isLoading: false };
}
