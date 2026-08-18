import { ExternalLink } from 'lucide-react';
import { detectRecordingVideo } from '@/lib/recordingVideo';
import VimeoPlayer from '@/components/session/VimeoPlayer';
import YouTubePlayer from '@/components/session/YouTubePlayer';
import GumletPlayer from '@/components/session/GumletPlayer';
import HlsOnDemandPlayer from '@/components/session/HlsOnDemandPlayer';
import type { OnDemandPlayerProps } from '@/components/session/onDemandPlayerTypes';

export default function OnDemandVideoPlayer(props: OnDemandPlayerProps) {
  const detected = detectRecordingVideo(props.videoUrl);

  switch (detected.kind) {
    case 'vimeo':
      return <VimeoPlayer {...props} />;
    case 'youtube':
      return <YouTubePlayer {...props} />;
    case 'gumlet-embed':
      return <GumletPlayer {...props} />;
    case 'hls':
      return <HlsOnDemandPlayer {...props} />;
    default:
      return (
        <a
          href={props.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" /> Open recording
        </a>
      );
  }
}
