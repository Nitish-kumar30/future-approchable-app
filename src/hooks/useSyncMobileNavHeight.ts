import { useEffect, useRef } from 'react';

/**
 * Measures the fixed mobile bottom nav and writes its height to
 * --mobile-nav-height on <html>. Keeps sticky bars and main padding
 * in sync with the real rendered nav (font size, admin items, safe area).
 */
export function useSyncMobileNavHeight(deps: unknown[] = []) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const sync = () => {
      document.documentElement.style.setProperty(
        '--mobile-nav-height',
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
      document.documentElement.style.removeProperty('--mobile-nav-height');
    };
  }, deps);

  return navRef;
}
