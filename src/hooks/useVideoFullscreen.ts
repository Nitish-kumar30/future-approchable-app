import { useCallback, useEffect, useRef, useState } from 'react';

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function useVideoFullscreen() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!getFullscreenElement());
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const doc = document as FullscreenDocument;
    if (getFullscreenElement()) {
      document.exitFullscreen?.().catch(() => doc.webkitExitFullscreen?.().catch(() => {}));
    } else {
      const target = el as FullscreenElement;
      el.requestFullscreen?.().catch(() => target.webkitRequestFullscreen?.().catch(() => {}));
    }
  }, []);

  return { wrapperRef, isFullscreen, toggleFullscreen };
}
