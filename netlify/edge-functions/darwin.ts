/**
 * Netlify Edge Function - Darwin SOAP API Proxy
 *
 * Proxies requests to the National Rail Darwin API, converting SOAP to JSON.
 * Makes two parallel calls:
 *   - GetDepartureBoard (up to 149 rows, no calling points)
 *   - GetDepBoardWithDetails (up to 10 rows, with calling points)
 * Then merges: all services from the board, enriched with calling points where available.
 *
 * Environment variable required: DARWIN_ACCESS_TOKEN
 */

import type { Config } from '@netlify/edge-functions'

const DARWIN_ENDPOINT = 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb11.asmx'

interface CallingPoint {
  locationName: string
  crs: string
  st: string
  et: string
}

interface CallingPointList {
  callingPoint: CallingPoint[]
}

interface Service {
  serviceID: string
  std: string
  etd: string
  platform?: string
  operator?: string
  operatorCode?: string
  isCancelled?: boolean
  destination: { locationName: string; crs: string }[]
  subsequentCallingPoints?: CallingPointList[]
}

interface DeparturesResponse {
  trainServices: Service[] | null
}

function buildDepartureBoardRequest(token: string, crs: string, filterCrs?: string, numRows = 149): string {
  const filterXml = filterCrs
    ? `\n      <ldb:filterCrs>${filterCrs}</ldb:filterCrs>\n      <ldb:filterType>to</ldb:filterType>`
    : ''

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:typ="http://thalesgroup.com/RTTI/2013-11-28/Token/types"
               xmlns:ldb="http://thalesgroup.com/RTTI/2017-10-01/ldb/">
  <soap:Header>
    <typ:AccessToken>
      <typ:TokenValue>${token}</typ:TokenValue>
    </typ:AccessToken>
  </soap:Header>
  <soap:Body>
    <ldb:GetDepartureBoardRequest>
      <ldb:numRows>${numRows}</ldb:numRows>
      <ldb:crs>${crs}</ldb:crs>${filterXml}
    </ldb:GetDepartureBoardRequest>
  </soap:Body>
</soap:Envelope>`
}

function buildDepBoardWithDetailsRequest(token: string, crs: string, filterCrs?: string, numRows = 10): string {
  const filterXml = filterCrs
    ? `\n      <ldb:filterCrs>${filterCrs}</ldb:filterCrs>\n      <ldb:filterType>to</ldb:filterType>`
    : ''

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:typ="http://thalesgroup.com/RTTI/2013-11-28/Token/types"
               xmlns:ldb="http://thalesgroup.com/RTTI/2017-10-01/ldb/">
  <soap:Header>
    <typ:AccessToken>
      <typ:TokenValue>${token}</typ:TokenValue>
    </typ:AccessToken>
  </soap:Header>
  <soap:Body>
    <ldb:GetDepBoardWithDetailsRequest>
      <ldb:numRows>${numRows}</ldb:numRows>
      <ldb:crs>${crs}</ldb:crs>${filterXml}
    </ldb:GetDepBoardWithDetailsRequest>
  </soap:Body>
</soap:Envelope>`
}

// --- Regex-based XML helpers (DOMParser is not available in Deno) ---

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/** Match tag with any namespace prefix (e.g. lt4:, lt5:, lt7:) */
function nsTag(localName: string): string {
  return `\\w+:${localName}`
}

function getTagText(xml: string, tagPattern: string): string | undefined {
  const match = xml.match(new RegExp(`<${tagPattern}[^>]*>([^<]*)</${tagPattern}>`))
  return match?.[1] ? decodeXmlEntities(match[1]) : undefined
}

function getTagBlocks(xml: string, tagPattern: string): string[] {
  const regex = new RegExp(`<${tagPattern}[^>]*>[\\s\\S]*?</${tagPattern}>`, 'g')
  const results: string[] = []
  let match
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[0])
  }
  return results
}

function getFirstTagBlock(xml: string, tagPattern: string): string | undefined {
  const match = xml.match(new RegExp(`<${tagPattern}[^>]*>[\\s\\S]*?</${tagPattern}>`))
  return match?.[0]
}

// --- SOAP response parsing ---

function parseCallingPoints(serviceXml: string): CallingPointList[] {
  const result: CallingPointList[] = []
  const subsequentPoints = getFirstTagBlock(serviceXml, nsTag('subsequentCallingPoints'))
  if (!subsequentPoints) return result

  const callingPointLists = getTagBlocks(subsequentPoints, nsTag('callingPointList'))
  for (const list of callingPointLists) {
    const points = getTagBlocks(list, nsTag('callingPoint'))
    const callingPoints: CallingPoint[] = points.map((point) => ({
      locationName: getTagText(point, nsTag('locationName')) || '',
      crs: getTagText(point, nsTag('crs')) || '',
      st: getTagText(point, nsTag('st')) || '',
      et: getTagText(point, nsTag('et')) || '',
    }))
    result.push({ callingPoint: callingPoints })
  }

  return result
}

function parseDestinations(serviceXml: string): { locationName: string; crs: string }[] {
  const destinationBlock = getFirstTagBlock(serviceXml, nsTag('destination'))
  if (!destinationBlock) return []

  return getTagBlocks(destinationBlock, nsTag('location')).map((loc) => ({
    locationName: getTagText(loc, nsTag('locationName')) || '',
    crs: getTagText(loc, nsTag('crs')) || '',
  }))
}

function parseSoapResponse(xmlText: string): DeparturesResponse {
  const trainServicesBlock = getFirstTagBlock(xmlText, nsTag('trainServices'))
  if (!trainServicesBlock) {
    return { trainServices: null }
  }

  const serviceBlocks = getTagBlocks(trainServicesBlock, nsTag('service'))
  const services: Service[] = serviceBlocks.map((svc) => {
    const isCancelled = getTagText(svc, nsTag('isCancelled')) === 'true'
    const callingPointLists = parseCallingPoints(svc)

    return {
      serviceID: getTagText(svc, nsTag('serviceID')) || '',
      std: getTagText(svc, nsTag('std')) || '',
      etd: getTagText(svc, nsTag('etd')) || '',
      platform: getTagText(svc, nsTag('platform')),
      operator: getTagText(svc, nsTag('operator')),
      operatorCode: getTagText(svc, nsTag('operatorCode')),
      isCancelled,
      destination: parseDestinations(svc),
      subsequentCallingPoints: callingPointLists,
    }
  })

  return { trainServices: services }
}

// Transform to Huxley-compatible format
function transformToHuxleyFormat(data: DeparturesResponse) {
  if (!data.trainServices) {
    return { trainServices: null }
  }

  return {
    trainServices: data.trainServices.map((svc) => ({
      serviceID: svc.serviceID,
      std: svc.std,
      etd: svc.etd,
      platform: svc.platform,
      operator: svc.operator,
      operatorCode: svc.operatorCode,
      isCancelled: svc.isCancelled,
      destination: svc.destination.map((d) => ({ locationName: d.locationName })),
      subsequentCallingPoints: (svc.subsequentCallingPoints || []).map((list) => ({
        callingPoint: list.callingPoint.map((cp) => ({
          locationName: cp.locationName,
          st: cp.st || undefined,
          et: cp.et || undefined,
        })),
      })),
    })),
  }
}

/**
 * Merge two sets of services: take all from the board (many services),
 * enrich with calling points from the detailed response (up to 10).
 */
function mergeServices(board: DeparturesResponse, details: DeparturesResponse): DeparturesResponse {
  if (!board.trainServices) return details

  const detailsMap = new Map<string, Service>()
  if (details.trainServices) {
    for (const svc of details.trainServices) {
      detailsMap.set(svc.serviceID, svc)
    }
  }

  return {
    trainServices: board.trainServices.map((svc) => {
      const detailed = detailsMap.get(svc.serviceID)
      if (detailed?.subsequentCallingPoints?.length) {
        return { ...svc, subsequentCallingPoints: detailed.subsequentCallingPoints }
      }
      return svc
    }),
  }
}

async function fetchDarwin(soapBody: string): Promise<string> {
  const response = await fetch(DARWIN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
    body: soapBody,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Darwin API error ${response.status}: ${text}`)
  }

  return response.text()
}

export default async function handler(request: Request): Promise<Response> {
  // Handle CORS preflight
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

  // Extract CRS code from path: /api/darwin/departures/KGX
  const match = url.pathname.match(/\/api\/darwin\/departures\/([A-Z]{3})$/i)
  if (!match) {
    return new Response(JSON.stringify({ error: 'Invalid request. Use /api/darwin/departures/{CRS}' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const crs = match[1].toUpperCase()
  const filterCrs = url.searchParams.get('filterCrs')?.toUpperCase() || undefined
  const numRowsParam = parseInt(url.searchParams.get('numRows') || '149', 10)
  const numRows = Math.max(1, Math.min(isNaN(numRowsParam) ? 149 : numRowsParam, 149))
  const detailRows = Math.min(numRows, 10)
  const accessToken = Deno.env.get('DARWIN_ACCESS_TOKEN')

  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Darwin API token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Make both calls in parallel: board (up to 149 rows) + details (up to 10 rows)
    const [boardXml, detailsXml] = await Promise.all([
      fetchDarwin(buildDepartureBoardRequest(accessToken, crs, filterCrs, numRows)),
      fetchDarwin(buildDepBoardWithDetailsRequest(accessToken, crs, filterCrs, detailRows)),
    ])

    const board = parseSoapResponse(boardXml)
    const details = parseSoapResponse(detailsXml)
    const merged = mergeServices(board, details)
    const transformed = transformToHuxleyFormat(merged)

    return new Response(JSON.stringify(transformed), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30',
      },
    })
  } catch (error) {
    console.error('Darwin proxy error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch departures' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}

export const config: Config = {
  path: '/api/darwin/*',
}
