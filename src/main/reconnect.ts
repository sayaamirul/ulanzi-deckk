export const DEFAULT_RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 15000] as const;

export const reconnectDelay = (
  attempt: number,
  delays: readonly number[] = DEFAULT_RECONNECT_DELAYS_MS,
): number => delays[Math.min(Math.max(attempt, 0), delays.length - 1)];
