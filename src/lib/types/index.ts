// src/lib/types/index.ts
// Tipos TypeScript del sistema TransportOS

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ── Enums ─────────────────────────────────────────────────────

export type TripStatus =
  | 'draft'
  | 'scheduled'
  | 'boarding'
  | 'in_transit'
  | 'completed'
  | 'cancelled'

export type TripType =
  | 'personnel'
  | 'tourism'
  | 'rental'
  | 'charter'
  | 'executive'
  | 'school'
  | 'event'

export type BoardingStatus = 'pending' | 'boarded' | 'absent' | 'cancelled'
export type PaymentStatus  = 'pending' | 'partial' | 'paid' | 'refunded' | 'complimentary'
export type VehicleStatus  = 'active' | 'maintenance' | 'retired'
export type DriverStatus   = 'active' | 'inactive' | 'suspended'
export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'supervisor'
  | 'dispatcher'
  | 'receptionist'
  | 'driver'
  | 'accountant'
  | 'auditor'

// ── Entidades base ────────────────────────────────────────────

export interface Organization {
  id: string
  slug: string
  name: string
  rfc: string | null
  logo_url: string | null
  country: string
  timezone: string
  plan: 'starter' | 'growth' | 'business' | 'enterprise'
  trial_ends_at: string | null
  is_active: boolean
  settings: Json
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  organization_id: string
  name: UserRole
  permissions: string[]
  is_system: boolean
  created_at: string
}

export interface User {
  id: string
  organization_id: string
  role_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  employee_number: string | null
  is_active: boolean
  last_login_at: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface UserWithRole extends User {
  role: Role
}

export interface Vehicle {
  id: string
  organization_id: string
  plate: string
  economic_number: string | null
  brand: string | null
  model: string | null
  year: number | null
  type: 'bus' | 'minibus' | 'van' | 'sedan' | 'suv' | 'other'
  capacity: number
  status: VehicleStatus
  photo_url: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  organization_id: string
  user_id: string | null
  first_name: string
  last_name: string
  employee_number: string | null
  phone: string | null
  email: string | null
  license_number: string | null
  license_type: string | null
  license_expires: string | null
  status: DriverStatus
  photo_url: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  organization_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  lat: number | null
  lng: number | null
  type: 'terminal' | 'hotel' | 'airport' | 'office' | 'other' | null
  is_active: boolean
  created_at: string
}

export interface Trip {
  id: string
  organization_id: string
  trip_number: string
  type: TripType
  origin_id: string | null
  destination_id: string | null
  origin_label: string | null
  destination_label: string | null
  departure_date: string
  departure_time: string
  arrival_date: string | null
  arrival_time: string | null
  vehicle_id: string | null
  driver_id: string | null
  co_driver_id: string | null
  capacity: number
  status: TripStatus
  client_name: string | null
  notes: string | null
  started_at: string | null
  completed_at: string | null
  created_by: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface TripWithRelations extends Trip {
  vehicle: Vehicle | null
  driver: Driver | null
  passengers_count?: number
  boarded_count?: number
}

export interface Passenger {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  id_number: string | null
  employee_number: string | null
  department: string | null
  company: string | null
  qr_code: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface TripPassenger {
  id: string
  trip_id: string
  passenger_id: string | null
  organization_id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  seat_number: string | null
  payment_status: PaymentStatus
  payment_amount: number | null
  boarding_status: BoardingStatus
  boarded_at: string | null
  boarded_by: string | null
  boarding_lat: number | null
  boarding_lng: number | null
  boarding_notes: string | null
  added_by: string | null
  added_at: string
  qr_token: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface TripPassengerWithDetails extends TripPassenger {
  passenger: Pick<Passenger, 'first_name' | 'last_name' | 'phone' | 'employee_number'> | null
}

export interface BoardingEvent {
  id: string
  trip_id: string
  trip_passenger_id: string
  organization_id: string
  event_type: 'boarded' | 'cancelled' | 'absent' | 'note' | 'override'
  performed_by: string
  performed_at: string
  lat: number | null
  lng: number | null
  notes: string | null
  metadata: Json
}

// ── DTOs para la UI ───────────────────────────────────────────

export interface DashboardKPIs {
  trips_today: number
  trips_active: number
  passengers_today: number
  passengers_boarded: number
  vehicles_active: number
  pending_passengers: number
}

export interface TripBoardingStats {
  trip_id: string
  capacity: number
  total_passengers: number
  boarded: number
  pending: number
  absent: number
  cancelled: number
  occupancy_pct: number
}

// ── Payloads de API ───────────────────────────────────────────

export interface CheckInPayload {
  trip_id: string
  trip_passenger_id: string
  lat?: number
  lng?: number
  notes?: string
}

export interface CreateTripInput {
  type: TripType
  origin_label: string
  destination_label: string
  departure_date: string
  departure_time: string
  capacity: number
  vehicle_id?: string
  driver_id?: string
  client_name?: string
  notes?: string
}

export interface AddPassengerInput {
  first_name: string
  last_name: string
  phone?: string
  payment_status: PaymentStatus
  payment_amount?: number
}

// ── Respuestas genéricas ──────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T | null
  error: string | null
  success: boolean
}
