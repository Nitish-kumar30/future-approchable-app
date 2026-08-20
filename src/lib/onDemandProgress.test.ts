import { describe, expect, it } from 'vitest';
import { getResumeSessionId } from './onDemandProgress';

const sessions = [
  { id: 's1', recording_url: 'https://video.gumlet.io/abc/video.m3u8', session_order: 1 },
  { id: 's2', recording_url: 'https://video.gumlet.io/def/video.m3u8', session_order: 2 },
  { id: 's3', recording_url: 'https://video.gumlet.io/ghi/video.m3u8', session_order: 3 },
];

describe('getResumeSessionId', () => {
  it('returns first trackable session when none completed', () => {
    const result = getResumeSessionId(sessions, new Set(), new Set());
    expect(result).toBe('s1');
  });

  it('returns first incomplete session when some are completed', () => {
    const result = getResumeSessionId(sessions, new Set(['s1', 's2']), new Set());
    expect(result).toBe('s3');
  });

  it('falls back to first trackable when all are completed', () => {
    const result = getResumeSessionId(sessions, new Set(['s1', 's2', 's3']), new Set());
    expect(result).toBe('s1');
  });

  it('includes quiz-only sessions as trackable', () => {
    const quizOnly = [
      { id: 's1', recording_url: null, session_order: 1 },
      { id: 's2', recording_url: 'https://video.gumlet.io/def/video.m3u8', session_order: 2 },
    ];
    const result = getResumeSessionId(quizOnly, new Set(), new Set(['s1']));
    expect(result).toBe('s1');
  });

  it('returns null when no trackable sessions', () => {
    const noTrackable = [{ id: 's1', recording_url: null, session_order: 1 }];
    const result = getResumeSessionId(noTrackable, new Set(), new Set());
    expect(result).toBeNull();
  });

  it('orders by session_order', () => {
    const unordered = [
      { id: 's3', recording_url: 'https://video.gumlet.io/ghi/video.m3u8', session_order: 3 },
      { id: 's1', recording_url: 'https://video.gumlet.io/abc/video.m3u8', session_order: 1 },
    ];
    const result = getResumeSessionId(unordered, new Set(), new Set());
    expect(result).toBe('s1');
  });
});
