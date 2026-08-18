export const CONNECTOR_RETRY_WINDOW_MS = 15 * 60 * 1000;

export function nextConnectorRetryAt(lastActivity?: Date, now = new Date()): Date {
  if (!lastActivity) return now;
  const scheduled = new Date(lastActivity.getTime() + CONNECTOR_RETRY_WINDOW_MS);
  return scheduled.getTime() > now.getTime() ? scheduled : now;
}
