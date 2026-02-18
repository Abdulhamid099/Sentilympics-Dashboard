export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

const parseTimestamps = (value: string | null): number[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'number')) {
      return parsed;
    }
  } catch (error) {
    console.error('Failed to parse rate-limit timestamps:', error);
  }

  return [];
};

export const checkRateLimit = (
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitStatus => {
  const now = Date.now();
  const storageKey = `rate_limit_${key}`;

  const timestamps = parseTimestamps(localStorage.getItem(storageKey)).filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];

    return {
      allowed: false,
      remaining: 0,
      resetTime: oldest + windowMs,
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
  const millisecondsUntilReset = Math.max(resetTime - Date.now(), 0);
  const minutesUntilReset = Math.ceil(millisecondsUntilReset / 60000);

  return `${minutesUntilReset} minute${minutesUntilReset > 1 ? 's' : ''}`;
};
