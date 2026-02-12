export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number; // timestamp
}

export const checkRateLimit = (
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitStatus => {
  const now = Date.now();
  const storageKey = `rate_limit_${key}`;
  const rawData = localStorage.getItem(storageKey);
  let timestamps: number[] = rawData ? JSON.parse(rawData) : [];

  // Filter out timestamps outside the current window
  timestamps = timestamps.filter((ts) => now - ts < windowMs);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    const resetTime = oldest + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetTime,
    };
  }

  timestamps.push(now);
  localStorage.setItem(storageKey, JSON.stringify(timestamps));

  return {
    allowed: true,
    remaining: maxRequests - timestamps.length,
    resetTime: now + windowMs,
  };
};

export const getWaitTimeMinutes = (resetTime: number): string => {
  const diff = resetTime - Date.now();
  const mins = Math.ceil(diff / 60000);
  return `${mins} minute${mins > 1 ? 's' : ''}`;
};