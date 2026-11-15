import { useEffect, useRef, useState } from 'react';

// width and height of an element, kept up to date
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setSize({ width: el.clientWidth, height: el.clientHeight });
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ width: entry?.contentRect.width ?? 0, height: entry?.contentRect.height ?? 0 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size.width, size.height] as const;
}
