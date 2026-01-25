// TfL modes that support real-time arrivals
export type TflMode = 'tube' | 'dlr' | 'overground' | 'elizabeth-line'

// Destination for filtering arrivals
export interface Destination {
  id: string
  name: string
  crs: string | null
}

// Schedule for station visibility
export interface Schedule {
  enabled: boolean
  startTime: string
  endTime: string
  days: number[] // 0 = Sunday, 6 = Saturday
}

// Base station properties
interface BaseStation {
  id: string
  name: string
  minMinutes: number
  maxMinutes: number
  destinations: Destination[]
  destinationFilter?: string // Legacy field for backward compatibility
  schedule?: Schedule | null
}

// TfL station (Tube, DLR, Overground, Elizabeth Line)
export interface TflStation extends BaseStation {
  type: 'tfl'
  modes?: TflMode[]
  crs?: never
}

// National Rail station
export interface NationalRailStation extends BaseStation {
  type: 'national-rail'
  crs: string
  modes?: string[]
}

// Discriminated union for all station types
export type Station = TflStation | NationalRailStation

// Station search result (before being added to config)
export interface StationSearchResult {
  id: string
  name: string
  type: 'tfl' | 'national-rail'
  modes: string[]
  crs?: string
}

// Arrival/departure from API
export interface Arrival {
  id: string
  expectedDeparture: number // Unix timestamp
  destinationName: string
  callingPoints?: string[]
  lineName: string
  lineId: string
  modeName: string
  platformName?: string
  status: 'Delayed' | null
  operator?: string | null
  source: 'tfl' | 'national-rail'
}

// Arrival with computed timeToStation
export interface FilteredArrival extends Arrival {
  timeToStation: number // seconds
}

// App configuration stored in localStorage
export interface AppConfig {
  stations: Station[]
  autoRefresh: boolean
  refreshInterval: number
  showPlatform: boolean
  theme: 'system' | 'dark' | 'light'
}

// Filter options for arrivals
export interface FilterOptions {
  minMinutes?: number
  maxMinutes?: number
  destinationFilter?: string
  destinations?: Destination[] | null
}

// Departures state keyed by station ID
export type DeparturesMap = Record<string, FilteredArrival[]>

// Errors state keyed by station ID
export type ErrorsMap = Record<string, string | null>

// TfL API response types
export interface TflArrival {
  vehicleId?: string
  id: string
  timeToStation: number
  destinationName?: string
  towards?: string
  lineName: string
  lineId: string
  modeName: string
  platformName?: string
}

export interface TflStopPoint {
  naptanId: string
  stopType: string
  modes?: string[]
  children?: TflStopPoint[]
}

export interface TflSearchMatch {
  id: string
  name: string
  modes?: string[]
}

export interface TflSearchResponse {
  matches?: TflSearchMatch[]
}

// National Rail (Huxley) API response types
export interface NationalRailCallingPoint {
  locationName?: string
}

export interface NationalRailCallingPointGroup {
  callingPoint?: NationalRailCallingPoint[]
}

export interface NationalRailDestination {
  locationName?: string
}

export interface NationalRailService {
  serviceID: string
  std: string
  etd: string
  isCancelled?: boolean
  destination?: NationalRailDestination[]
  platform?: string
  operator?: string
  operatorCode?: string
  subsequentCallingPoints?: NationalRailCallingPointGroup[]
}

export interface NationalRailDeparturesResponse {
  trainServices?: NationalRailService[]
}

export interface NationalRailStationResponse {
  crsCode: string
  stationName: string
}
