/**
 * Simple in-memory cache with TTL for API responses
 */

interface CacheEntry<T> {
  data: T
  expires: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const DEFAULT_TTL = 30_000 // 30 seconds

/**
 * Wrap a fetch function with caching
 * @param key Cache key
 * @param fetcher Async function to fetch data
 * @param ttl Time to live in milliseconds (default 30s)
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const now = Date.now()
  const cached = cache.get(key) as CacheEntry<T> | undefined

  if (cached && cached.expires > now) {
    return cached.data
  }

  const data = await fetcher()
  cache.set(key, { data, expires: now + ttl })
  return data
}

/**
 * Clear a specific cache entry
 */
export function clearCache(key: string): void {
  cache.delete(key)
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  cache.clear()
}

/**
 * Clear expired entries (useful for memory management)
 */
export function clearExpiredCache(): void {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (entry.expires <= now) {
      cache.delete(key)
    }
  }
}
