import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TripStatus, BoardingStatus, PaymentStatus, TripType } from '@/lib/types'

// Combina clases de Tailwind sin conflictos
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formato de fecha legible en español
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

// Formato de hora
export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

// Formato de fecha+hora completa
export function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

// Nombre completo
export function fullName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(' ') || 'Sin nombre'
}

// Iniciales para avatar
export function initials(first: string | null, last: string | null): string {
  return [(first?.[0] ?? ''), (last?.[0] ?? '')].join('').toUpperCase() || '?'
}

// Etiquetas de estado del viaje
export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  draft:      'Borrador',
  scheduled:  'Programado',
  boarding:   'En abordaje',
  in_transit: 'En ruta',
  completed:  'Completado',
  cancelled:  'Cancelado',
}

// Colores de estado del viaje (Tailwind classes)
export const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  draft:      'bg-gray-100 text-gray-600',
  scheduled:  'bg-blue-100 text-blue-700',
  boarding:   'bg-amber-100 text-amber-700',
  in_transit: 'bg-green-100 text-green-700',
  completed:  'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-red-100 text-red-700',
}

// Etiquetas de estado de abordaje
export const BOARDING_STATUS_LABELS: Record<BoardingStatus, string> = {
  pending:   'Pendiente',
  boarded:   'Abordó',
  absent:    'Ausente',
  cancelled: 'Cancelado',
}

export const BOARDING_STATUS_COLORS: Record<BoardingStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  boarded:   'bg-green-100 text-green-700',
  absent:    'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

// Etiquetas de estado de pago
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending:       'Pendiente',
  partial:       'Parcial',
  paid:          'Pagado',
  refunded:      'Reembolsado',
  complimentary: 'Cortesía',
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending:       'bg-red-50 text-red-600',
  partial:       'bg-amber-50 text-amber-600',
  paid:          'bg-green-50 text-green-600',
  refunded:      'bg-gray-100 text-gray-500',
  complimentary: 'bg-purple-50 text-purple-600',
}

// Etiquetas de tipo de viaje
export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  personnel: 'Transporte de personal',
  tourism:   'Turismo / Excursión',
  rental:    'Renta con operador',
  charter:   'Charter',
  executive: 'Traslado ejecutivo',
  school:    'Transporte escolar',
  event:     'Evento',
}

// Formatear moneda en pesos mexicanos
export function formatCurrency(amount: number | null): string {
  if (amount === null) return '—'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN'
  }).format(amount)
}

// Generar número de viaje: VJ-2024-001
export function generateTripNumber(count: number): string {
  const year = new Date().getFullYear()
  const num = String(count).padStart(3, '0')
  return `VJ-${year}-${num}`
}
