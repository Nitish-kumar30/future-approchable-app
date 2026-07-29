import { useEffect, type RefObject } from 'react';

/**
 * Measures the fixed sticky pay bar and writes its height to
 * --sticky-pay-bar-height on <html>. Keeps main/footer padding
 * in sync with the real rendered bar.
 */
export function useSyncStickyPayBarHeight(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sync = () => {
      document.documentElement.style.setProperty(
        '--sticky-pay-bar-height',
        `${el.offsetHeight}px`,
      );
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    window.addEventListener('resize', sync);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
      document.documentElement.style.removeProperty('--sticky-pay-bar-height');
    };
  }, [ref]);
}
