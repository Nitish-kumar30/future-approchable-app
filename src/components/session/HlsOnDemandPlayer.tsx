import { useRef } from 'react';
import HlsPlayer from '@/components/video/HlsPlayer';
import { shouldMarkVideoComplete } from '@/lib/recordingVideo';
import NextSessionOverlay from '@/components/session/NextSessionOverlay';
import { InspectShield } from '@/components/session/InspectShield';
import { useEndOfVideoOverlay } from '@/components/session/useEndOfVideoOverlay';
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

  return (
    <InspectShield className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border">
      <HlsPlayer
        key={videoUrl}
        src={videoUrl}
        autoPlay={!!autoPlay}
        className="w-full h-full bg-black"
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
    </InspectShield>
  );
}
