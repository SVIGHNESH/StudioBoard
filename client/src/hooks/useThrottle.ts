import { useCallback, useRef } from "react";

export const useThrottle = <T extends (...args: never[]) => void>(callback: T, delay: number) => {
  const lastRun = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const remaining = delay - (now - lastRun.current);

      if (remaining <= 0) {
        lastRun.current = now;
        callback(...args);
        return;
      }

      if (timeoutRef.current) return;
      timeoutRef.current = window.setTimeout(() => {
        lastRun.current = Date.now();
        timeoutRef.current = null;
        callback(...args);
      }, remaining);
    },
    [callback, delay]
  );
};
