import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

type IosVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/**
 * iPhone Safari (unlike iPadOS/desktop Safari) does not support the Fullscreen
 * API on arbitrary elements — `div.requestFullscreen()` silently rejects there.
 * The only fullscreen affordance it exposes is `HTMLVideoElement.webkitEnterFullscreen()`,
 * which puts just the <video> into the native iOS fullscreen player.
 */
function isIphoneSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIphone = /iPhone|iPod/.test(ua);
  const isIpadOnDesktopUa = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !/iPad/.test(ua);
  return isIphone && !isIpadOnDesktopUa;
}

/**
 * @param videoRef Optional ref to the underlying <video> element. Required for
 * fullscreen to work on iPhone Safari; without it, toggling fullscreen there is a no-op.
 */
export function useVideoFullscreen(videoRef?: RefObject<HTMLVideoElement | null>) {
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

  useEffect(() => {
    const video = videoRef?.current as IosVideoElement | null | undefined;
    if (!video) return;
    const onBegin = () => setIsFullscreen(true);
    const onEnd = () => setIsFullscreen(false);
    video.addEventListener('webkitbeginfullscreen', onBegin);
    video.addEventListener('webkitendfullscreen', onEnd);
    return () => {
      video.removeEventListener('webkitbeginfullscreen', onBegin);
      video.removeEventListener('webkitendfullscreen', onEnd);
    };
  }, [videoRef]);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef?.current as IosVideoElement | null | undefined;
    if (isIphoneSafari() && video?.webkitEnterFullscreen) {
      if (video.webkitDisplayingFullscreen) {
        video.webkitExitFullscreen?.();
      } else {
        video.webkitEnterFullscreen();
      }
      return;
    }

    const el = wrapperRef.current;
    if (!el) return;
    const doc = document as FullscreenDocument;
    if (getFullscreenElement()) {
      document.exitFullscreen?.().catch(() => doc.webkitExitFullscreen?.().catch(() => {}));
    } else {
      const target = el as FullscreenElement;
      el.requestFullscreen?.().catch(() => target.webkitRequestFullscreen?.().catch(() => {}));
    }
  }, [videoRef]);

  return { wrapperRef, isFullscreen, toggleFullscreen };
}
