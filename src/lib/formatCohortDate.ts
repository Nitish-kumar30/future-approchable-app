/**
 * Formats cohort date range with session time in a consistent compact format.
 * Example: "Feb 11-Feb 4, 4:50PM IST"
 */
export function formatCohortDateRange(
  startDate: string | null,
  endDate: string | null,
  sessionTime: string | null
): string | null {
  if (!startDate && !sessionTime) return null;
  
  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  let result = '';
  
  if (startDate) {
    result = formatShortDate(startDate);
    if (endDate) {
      result = `${result}-${formatShortDate(endDate)}`;
    }
  }
  
  if (sessionTime) {
    result = result ? `${result}, ${sessionTime}` : sessionTime;
  }
  
  return result || null;
}

/**
 * Formats a single date in compact format (e.g., "Feb 11")
 */
export function formatShortDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
