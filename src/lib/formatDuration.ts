/**
 * Compacts a raw "NNN mins"/"NNN minutes" duration string into "Xh Ym".
 * Any other format (e.g. "8 weeks") is passed through unchanged, since
 * duration is free-text data and not guaranteed to be in minutes.
 */
export function formatDuration(raw: string | null | undefined): string | null {
  if (!raw) return raw ?? null;
  const match = raw.trim().match(/^(\d+)\s*(mins?|minutes?)$/i);
  if (!match) return raw;

  const totalMinutes = parseInt(match[1], 10);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
