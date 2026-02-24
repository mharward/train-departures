/**
 * Netlify Edge Function - TfL API Proxy
 *
 * Proxies requests to the TfL Unified API, adding the API key server-side.
 * Environment variable: TFL_API_KEY (optional, for higher rate limits)
 */

import type { Config } from '@netlify/edge-functions'

const TFL_BASE_URL = 'https://api.tfl.gov.uk'

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const url = new URL(request.url)

  // Strip /api/tfl prefix to get the TfL API path
  const tflPath = url.pathname.replace(/^\/api\/tfl/, '')
  if (!tflPath) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const tflUrl = new URL(`${TFL_BASE_URL}${tflPath}`)

  // Forward query parameters from the original request
  for (const [key, value] of url.searchParams) {
    tflUrl.searchParams.set(key, value)
  }

  // Add API key if configured
  const apiKey = Deno.env.get('TFL_API_KEY')
  if (apiKey) {
    tflUrl.searchParams.set('app_key', apiKey)
  }

  try {
    const response = await fetch(tflUrl.toString(), {
      headers: { Accept: 'application/json' },
    })

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30',
      },
    })
  } catch (error) {
    console.error('TfL proxy error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch from TfL' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}

export const config: Config = {
  path: '/api/tfl/*',
}
