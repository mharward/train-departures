/**
 * Netlify Edge Function - Darwin SOAP API Proxy
 *
 * Proxies requests to the National Rail Darwin API, converting SOAP to JSON.
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

function buildSoapRequest(token: string, crs: string): string {
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
      <ldb:numRows>150</ldb:numRows>
      <ldb:crs>${crs}</ldb:crs>
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

function getTagText(xml: string, tagName: string): string | undefined {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`))
  return match?.[1] ? decodeXmlEntities(match[1]) : undefined
}

function getTagBlocks(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>[\\s\\S]*?</${tagName}>`, 'g')
  const results: string[] = []
  let match
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[0])
  }
  return results
}

function getFirstTagBlock(xml: string, tagName: string): string | undefined {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>[\\s\\S]*?</${tagName}>`))
  return match?.[0]
}

// --- SOAP response parsing ---

function parseCallingPoints(serviceXml: string): CallingPointList[] {
  const result: CallingPointList[] = []
  const subsequentPoints = getFirstTagBlock(serviceXml, 'lt7:subsequentCallingPoints')
  if (!subsequentPoints) return result

  const callingPointLists = getTagBlocks(subsequentPoints, 'lt7:callingPointList')
  for (const list of callingPointLists) {
    const points = getTagBlocks(list, 'lt7:callingPoint')
    const callingPoints: CallingPoint[] = points.map((point) => ({
      locationName: getTagText(point, 'lt7:locationName') || '',
      crs: getTagText(point, 'lt7:crs') || '',
      st: getTagText(point, 'lt7:st') || '',
      et: getTagText(point, 'lt7:et') || '',
    }))
    result.push({ callingPoint: callingPoints })
  }

  return result
}

function parseDestinations(serviceXml: string): { locationName: string; crs: string }[] {
  const destinationBlock = getFirstTagBlock(serviceXml, 'lt5:destination')
  if (!destinationBlock) return []

  return getTagBlocks(destinationBlock, 'lt4:location').map((loc) => ({
    locationName: getTagText(loc, 'lt4:locationName') || '',
    crs: getTagText(loc, 'lt4:crs') || '',
  }))
}

function parseSoapResponse(xmlText: string): DeparturesResponse {
  const trainServicesBlock = getFirstTagBlock(xmlText, 'lt7:trainServices')
  if (!trainServicesBlock) {
    return { trainServices: null }
  }

  const serviceBlocks = getTagBlocks(trainServicesBlock, 'lt7:service')
  const services: Service[] = serviceBlocks.map((svc) => {
    const isCancelled = getTagText(svc, 'lt4:isCancelled') === 'true'
    const callingPointLists = parseCallingPoints(svc)

    return {
      serviceID: getTagText(svc, 'lt4:serviceID') || '',
      std: getTagText(svc, 'lt4:std') || '',
      etd: getTagText(svc, 'lt4:etd') || '',
      platform: getTagText(svc, 'lt4:platform'),
      operator: getTagText(svc, 'lt4:operator'),
      operatorCode: getTagText(svc, 'lt4:operatorCode'),
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
        })),
      })),
    })),
  }
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
  const accessToken = Deno.env.get('DARWIN_ACCESS_TOKEN')

  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Darwin API token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const soapRequest = buildSoapRequest(accessToken, crs)

    const response = await fetch(DARWIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
      },
      body: soapRequest,
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Darwin API error:', response.status, text)
      return new Response(JSON.stringify({ error: `Darwin API error: ${response.status}` }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    const xmlText = await response.text()
    const parsed = parseSoapResponse(xmlText)
    const transformed = transformToHuxleyFormat(parsed)

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
