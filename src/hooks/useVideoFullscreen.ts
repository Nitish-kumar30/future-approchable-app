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
 * which puts just the <video> into the native iOS fullscreen player. This means
 * any DOM overlay rendered as a sibling (e.g. an "up next" countdown) is NOT
 * visible while this native fullscreen is active — the OS renders the video in
 * a layer above the page, and only the video's own native controls sit on top.
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
  const [usesNativeVideoFullscreen] = useState(() => isIphoneSafari());

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
    // Listen on the document in the *capture* phase rather than attaching
    // directly to `videoRef.current`. `webkitbeginfullscreen`/`webkitendfullscreen`
    // don't bubble, but capture-phase listeners still see them as they travel
    // down to the target. This matters because pages that swap out the <video>
    // element (e.g. a new element per lesson via a `key` prop) would otherwise
    // leave the old element's listeners orphaned and never learn about
    // fullscreen changes on the replacement element.
    const onBegin = (e: Event) => {
      if (e.target === videoRef?.current) setIsFullscreen(true);
    };
    const onEnd = (e: Event) => {
      if (e.target === videoRef?.current) setIsFullscreen(false);
    };
    document.addEventListener('webkitbeginfullscreen', onBegin, true);
    document.addEventListener('webkitendfullscreen', onEnd, true);
    return () => {
      document.removeEventListener('webkitbeginfullscreen', onBegin, true);
      document.removeEventListener('webkitendfullscreen', onEnd, true);
    };
  }, [videoRef]);

  const enterFullscreen = useCallback(() => {
    const video = videoRef?.current as IosVideoElement | null | undefined;
    if (isIphoneSafari() && video?.webkitEnterFullscreen) {
      if (!video.webkitDisplayingFullscreen) video.webkitEnterFullscreen();
      return;
    }
    const el = wrapperRef.current;
    if (!el || getFullscreenElement()) return;
    const target = el as FullscreenElement;
    el.requestFullscreen?.().catch(() => target.webkitRequestFullscreen?.().catch(() => {}));
  }, [videoRef]);

  const exitFullscreen = useCallback(() => {
    const video = videoRef?.current as IosVideoElement | null | undefined;
    if (isIphoneSafari() && video?.webkitDisplayingFullscreen) {
      video.webkitExitFullscreen?.();
      return;
    }
    if (getFullscreenElement()) {
      const doc = document as FullscreenDocument;
      document.exitFullscreen?.().catch(() => doc.webkitExitFullscreen?.().catch(() => {}));
    }
  }, [videoRef]);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef?.current as IosVideoElement | null | undefined;
    if (isIphoneSafari() && video?.webkitEnterFullscreen) {
      if (video.webkitDisplayingFullscreen) {
        exitFullscreen();
      } else {
        enterFullscreen();
      }
      return;
    }

    if (getFullscreenElement()) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [videoRef, enterFullscreen, exitFullscreen]);

  return {
    wrapperRef,
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    /** True on iPhone Safari, where fullscreen is native-video-only and DOM overlays can't render on top of it. */
    usesNativeVideoFullscreen,
  };
}
