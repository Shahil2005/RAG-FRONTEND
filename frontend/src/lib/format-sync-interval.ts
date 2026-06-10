/** Human-readable label for INGESTION_SYNC_INTERVAL_MS (e.g. 3600000 → "1 hour"). */
export function formatSyncIntervalMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'unknown interval';
  const hours = ms / (60 * 60 * 1000);
  if (hours >= 1 && Number.isInteger(hours)) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  const minutes = ms / (60 * 1000);
  if (minutes >= 1 && Number.isInteger(minutes)) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }
  return `${Math.round(ms / 1000)} seconds`;
}
