/**
 * Shared formatting utilities used across Dashboard, OperatorDetail, OperatorTable, etc.
 */

/** Format a date string or Date object as HH:MM (es-ES). Returns "—" if falsy. */
export function formatTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a duration in minutes as "X min" or "Xh Ym". Returns "—" if null/undefined. */
export function formatDuration(minutes) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}
