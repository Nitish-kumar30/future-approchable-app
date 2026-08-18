/** Returns true for common DevTools / view-source keyboard shortcuts. */
export function shouldBlockDevToolsKey(e: KeyboardEvent): boolean {
  if (e.key === 'F12') return true;

  const key = e.key.toLowerCase();

  if (e.ctrlKey && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) return true;
  if (e.ctrlKey && !e.shiftKey && key === 'u') return true;

  if (e.metaKey && e.altKey && (key === 'i' || key === 'j' || key === 'c')) return true;

  return false;
}
