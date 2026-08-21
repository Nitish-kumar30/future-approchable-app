import { useEffect, useRef } from 'react';
import CustomHlsPlayer from '@/components/video/custom-player/CustomHlsPlayer';
import { shouldMarkVideoComplete } from '@/lib/recordingVideo';
import NextSessionOverlay from '@/components/session/NextSessionOverlay';
import { InspectShield } from '@/components/session/InspectShield';
import { useEndOfVideoOverlay } from '@/components/session/useEndOfVideoOverlay';
import { useVideoFullscreen } from '@/hooks/useVideoFullscreen';
import type { OnDemandPlayerProps } from '@/components/session/onDemandPlayerTypes';

export default function HlsOnDemandPlayer({
  videoUrl,
  title,
  nextSession,
  onCompleted,
  onNextSession,
  autoPlay,
  onAutoPlayConsumed,
  onPlay,
}: OnDemandPlayerProps) {
  const completedFiredRef = useRef(false);
  const playFiredRef = useRef(false);
  const autoPlayConsumedRef = useRef(false);

  // The player no longer remounts between sessions (so fullscreen persists), so these
  // per-video guards must be re-armed manually whenever the source changes.
  useEffect(() => {
    completedFiredRef.current = false;
    playFiredRef.current = false;
    autoPlayConsumedRef.current = false;
  }, [videoUrl]);

  const { showOverlay, countdown, openOverlay, handleCancel, handleStartNow } = useEndOfVideoOverlay(
    nextSession,
    onNextSession,
  );
  const videoElRef = useRef<HTMLVideoElement>(null);
  const { wrapperRef, isFullscreen, toggleFullscreen, enterFullscreen, exitFullscreen, usesNativeVideoFullscreen } =
    useVideoFullscreen(videoElRef);
  // On iPhone, fullscreen only applies to the raw <video> (native OS
  // fullscreen), so the "up next" overlay — a sibling <div> — never appears on
  // top of it. Drop out of native fullscreen just long enough to show the
  // overlay, then re-enter it automatically once the next video starts.
  const wantsFullscreenOnNextRef = useRef(false);

  const handleCancelOverlay = () => {
    wantsFullscreenOnNextRef.current = false;
    handleCancel();
  };

  return (
    <InspectShield className="relative rounded-lg border border-border bg-black">
      <div
        ref={wrapperRef}
        className={`relative isolate ${isFullscreen ? 'w-screen h-screen rounded-none' : 'aspect-video'}`}
      >
        <CustomHlsPlayer
          key={videoUrl}
          videoRef={videoElRef}
          src={videoUrl}
          title={title}
          autoPlay={!!autoPlay}
          interactive={!showOverlay}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          className="relative z-0 h-full w-full bg-black"
          onPlay={() => {
            if (!autoPlayConsumedRef.current) {
              autoPlayConsumedRef.current = true;
              onAutoPlayConsumed?.();
            }
            if (!playFiredRef.current) {
              playFiredRef.current = true;
              onPlay?.();
            }
            if (wantsFullscreenOnNextRef.current) {
              wantsFullscreenOnNextRef.current = false;
              enterFullscreen();
            }
          }}
          onProgress={(currentTime, duration) => {
            if (!completedFiredRef.current && shouldMarkVideoComplete(currentTime, duration)) {
              completedFiredRef.current = true;
              onCompleted();
            }
          }}
          onEnded={() => {
            if (!completedFiredRef.current) {
              completedFiredRef.current = true;
              onCompleted();
            }
            if (usesNativeVideoFullscreen && isFullscreen) {
              wantsFullscreenOnNextRef.current = true;
              exitFullscreen();
            }
            openOverlay();
          }}
        />
        {showOverlay && (
          <NextSessionOverlay
            nextSession={nextSession}
            countdown={countdown}
            onCancel={handleCancelOverlay}
            onStartNow={handleStartNow}
          />
        )}
      </div>
    </InspectShield>
  );
}
