import { describe, expect, it } from 'vitest';
import { detectRecordingVideo, isVideoUrl, shouldMarkVideoComplete } from './recordingVideo';

describe('detectRecordingVideo', () => {
  it('detects YouTube watch, embed, shorts, and youtu.be', () => {
    expect(detectRecordingVideo('https://www.youtube.com/watch?v=dQw4w9wgGcQ')).toEqual({
      kind: 'youtube',
      videoId: 'dQw4w9wgGcQ',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9wgGcQ',
    });
    expect(detectRecordingVideo('https://www.youtube.com/embed/dQw4w9wgGcQ').kind).toBe('youtube');
    expect(detectRecordingVideo('https://youtu.be/dQw4w9wgGcQ').videoId).toBe('dQw4w9wgGcQ');
    expect(detectRecordingVideo('https://www.youtube.com/watch?feature=share&v=dQw4w9wgGcQ').videoId).toBe(
      'dQw4w9wgGcQ',
    );
    expect(detectRecordingVideo('https://www.youtube.com/shorts/dQw4w9wgGcQ').kind).toBe('youtube');
  });

  it('detects Vimeo watch and player URLs', () => {
    expect(detectRecordingVideo('https://vimeo.com/123456789')).toEqual({
      kind: 'vimeo',
      videoId: '123456789',
    });
    expect(detectRecordingVideo('https://player.vimeo.com/video/123456789')).toEqual({
      kind: 'vimeo',
      videoId: '123456789',
    });
  });

  it('converts Gumlet watch and embed URLs', () => {
    expect(detectRecordingVideo('https://gumlet.tv/watch/6a795269a219b0caeb683734')).toEqual({
      kind: 'gumlet-embed',
      assetId: '6a795269a219b0caeb683734',
      embedUrl: 'https://play.gumlet.io/embed/6a795269a219b0caeb683734',
    });
    expect(detectRecordingVideo('https://play.gumlet.io/embed/6a795269a219b0caeb683734')).toEqual({
      kind: 'gumlet-embed',
      assetId: '6a795269a219b0caeb683734',
      embedUrl: 'https://play.gumlet.io/embed/6a795269a219b0caeb683734',
    });
  });

  it('detects Gumlet HLS URLs', () => {
    const hlsUrl = 'https://video.gumlet.io/workspace/asset/main.m3u8';
    expect(detectRecordingVideo(hlsUrl)).toEqual({ kind: 'hls', hlsUrl });
  });

  it('returns unknown for non-player URLs', () => {
    expect(detectRecordingVideo('https://docs.google.com/presentation/d/abc').kind).toBe('unknown');
    expect(detectRecordingVideo('https://loom.com/share/abc').kind).toBe('unknown');
    expect(isVideoUrl('https://example.com/video.mp4')).toBe(false);
  });
});

describe('isVideoUrl', () => {
  it('is true for YouTube, Vimeo, and Gumlet', () => {
    expect(isVideoUrl('https://youtu.be/dQw4w9wgGcQ')).toBe(true);
    expect(isVideoUrl('https://vimeo.com/1')).toBe(true);
    expect(isVideoUrl('https://gumlet.tv/watch/6a795269a219b0caeb683734')).toBe(true);
  });
});

describe('shouldMarkVideoComplete', () => {
  it('is true when 20s or fewer remain', () => {
    expect(shouldMarkVideoComplete(80, 100)).toBe(true);
    expect(shouldMarkVideoComplete(79, 100)).toBe(false);
    expect(shouldMarkVideoComplete(0, 0)).toBe(false);
  });
});
