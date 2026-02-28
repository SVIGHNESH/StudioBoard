import { useEffect } from "react";

export const useResizeObserver = (element: HTMLElement | null, callback: () => void) => {
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(() => callback());
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, callback]);
};
