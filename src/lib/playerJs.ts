export function timeupdateSeconds(data: unknown): { seconds: number; duration: number } | null {
  if (!data || typeof data !== 'object') return null;
  const rec = data as { seconds?: unknown; duration?: unknown };
  const seconds = typeof rec.seconds === 'number' ? rec.seconds : null;
  const duration = typeof rec.duration === 'number' ? rec.duration : null;
  if (seconds == null || duration == null) return null;
  return { seconds, duration };
}
