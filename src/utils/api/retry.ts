/**
 * Fetch wrapper with retry and exponential backoff
 */

interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
}

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504]

/**
 * Fetch with automatic retry on failure
 * @param url URL to fetch
 * @param options Fetch options
 * @param retryOptions Retry configuration
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  { maxRetries = 3, initialDelay = 1000, maxDelay = 8000 }: RetryOptions = {}
): Promise<Response> {
  let lastError: Error | null = null
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // If successful or non-retryable error, return immediately
      if (response.ok || !RETRYABLE_STATUS_CODES.includes(response.status)) {
        return response
      }

      // Check for Retry-After header
      const retryAfter = response.headers.get('Retry-After')
      if (retryAfter) {
        const retrySeconds = parseInt(retryAfter, 10)
        if (!isNaN(retrySeconds)) {
          delay = Math.min(retrySeconds * 1000, maxDelay)
        }
      }

      // If this was the last attempt, return the response anyway
      if (attempt === maxRetries) {
        return response
      }

      // Wait before retrying
      await sleep(delay)
      delay = Math.min(delay * 2, maxDelay) // Exponential backoff
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        throw lastError
      }

      // Wait before retrying
      await sleep(delay)
      delay = Math.min(delay * 2, maxDelay)
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError || new Error('Fetch failed after retries')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
