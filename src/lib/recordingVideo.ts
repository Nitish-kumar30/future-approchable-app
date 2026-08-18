export const COMPLETE_PROGRESS_RATIO = 0.95;

export type RecordingVideo =
  | { kind: 'youtube'; videoId: string; embedUrl: string }
  | { kind: 'vimeo'; videoId: string }
  | { kind: 'gumlet-embed'; assetId: string; embedUrl: string }
  | { kind: 'hls'; hlsUrl: string }
  | { kind: 'unknown' };

const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/i;
const GUMLET_WATCH_RE = /(?:gumlet\.tv\/watch\/|play\.gumlet\.io\/embed\/)([a-zA-Z0-9]+)/i;

export function shouldMarkVideoComplete(seconds: number, duration: number): boolean {
  return duration > 0 && seconds / duration >= COMPLETE_PROGRESS_RATIO;
}

export function detectRecordingVideo(url: string): RecordingVideo {
  const trimmed = url.trim();
  if (!trimmed) return { kind: 'unknown' };

  const yt = trimmed.match(YOUTUBE_RE);
  if (yt) {
    return {
      kind: 'youtube',
      videoId: yt[1],
      embedUrl: `https://www.youtube.com/embed/${yt[1]}`,
    };
  }

  const vimeo = trimmed.match(VIMEO_RE);
  if (vimeo) {
    return { kind: 'vimeo', videoId: vimeo[1] };
  }

  const gumlet = trimmed.match(GUMLET_WATCH_RE);
  if (gumlet) {
    return {
      kind: 'gumlet-embed',
      assetId: gumlet[1],
      embedUrl: `https://play.gumlet.io/embed/${gumlet[1]}`,
    };
  }

  if (/\.m3u8(\?|$)/i.test(trimmed) && /gumlet/i.test(trimmed)) {
    return { kind: 'hls', hlsUrl: trimmed };
  }

  return { kind: 'unknown' };
}

export function isVideoUrl(url: string): boolean {
  return detectRecordingVideo(url).kind !== 'unknown';
}
