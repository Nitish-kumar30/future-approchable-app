import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { shouldBlockDevToolsKey } from '@/lib/devToolsKeys';
import { useAuth } from '@/hooks/useAuth';

function isLearnInspectRoute(pathname: string): boolean {
  return /^\/on-demand\/[^/]+$/.test(pathname) || /^\/courses\/[^/]+\/learn$/.test(pathname);
}

export function useDisableInspect(options?: { enabled?: boolean }) {
  const { isAdmin, isLoading } = useAuth();
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled || isLoading || isAdmin) return;

    const onContextMenu = (e: Event) => e.preventDefault();
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldBlockDevToolsKey(e)) e.preventDefault();
    };
    const onAuxClick = (e: MouseEvent) => {
      if (e.button === 2) e.preventDefault();
    };

    const capture = { capture: true } as const;

    window.addEventListener('contextmenu', onContextMenu, capture);
    window.addEventListener('mousedown', onMouseDown, capture);
    window.addEventListener('keydown', onKeyDown, capture);
    window.addEventListener('auxclick', onAuxClick, capture);

    return () => {
      window.removeEventListener('contextmenu', onContextMenu, capture);
      window.removeEventListener('mousedown', onMouseDown, capture);
      window.removeEventListener('keydown', onKeyDown, capture);
      window.removeEventListener('auxclick', onAuxClick, capture);
    };
  }, [enabled, isLoading, isAdmin]);
}

/** Activates inspect protection for on-demand and course learn routes. */
export function LearnInspectGuard() {
  const { pathname } = useLocation();
  useDisableInspect({ enabled: isLearnInspectRoute(pathname) });
  return null;
}
