import { useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import HlsPlayer from '@/components/video/HlsPlayer';
import { shouldMarkVideoComplete } from '@/lib/recordingVideo';
import NextSessionOverlay from '@/components/session/NextSessionOverlay';
import { InspectShield } from '@/components/session/InspectShield';
import { useEndOfVideoOverlay } from '@/components/session/useEndOfVideoOverlay';
import { useVideoFullscreen } from '@/hooks/useVideoFullscreen';
import type { OnDemandPlayerProps } from '@/components/session/onDemandPlayerTypes';

export default function HlsOnDemandPlayer({
  videoUrl,
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
  const { showOverlay, countdown, openOverlay, handleCancel, handleStartNow } = useEndOfVideoOverlay(
    nextSession,
    onNextSession,
  );
  const { wrapperRef, isFullscreen, toggleFullscreen } = useVideoFullscreen();

  return (
    <InspectShield className="relative bg-black rounded-lg overflow-hidden border border-border">
      <div
        ref={wrapperRef}
        className={`relative isolate group ${isFullscreen ? 'w-screen h-screen rounded-none' : 'aspect-video'}`}
      >
        <HlsPlayer
          key={videoUrl}
          src={videoUrl}
          autoPlay={!!autoPlay}
          showControls={!showOverlay}
          className="relative z-0 w-full h-full bg-black"
          onPlay={() => {
            if (!autoPlayConsumedRef.current) {
              autoPlayConsumedRef.current = true;
              onAutoPlayConsumed?.();
            }
            if (!playFiredRef.current) {
              playFiredRef.current = true;
              onPlay?.();
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
            openOverlay();
          }}
        />
        {showOverlay && (
          <NextSessionOverlay
            nextSession={nextSession}
            countdown={countdown}
            onCancel={handleCancel}
            onStartNow={handleStartNow}
          />
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="absolute bottom-2 right-2 z-20 h-8 w-8 flex items-center justify-center rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>
    </InspectShield>
  );
}
