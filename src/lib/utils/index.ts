import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
}
export function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
}
export function fullName(f: string | null, l: string | null) { return [f, l].filter(Boolean).join(' ') || 'Sin nombre' }
export function initials(f: string | null, l: string | null) { return [(f?.[0]??''),(l?.[0]?? '')].join('').toUpperCase() || '?' }

export const TRIP_STATUS_LABELS: Record<string,string> = {
  draft:'Borrador', scheduled:'Programado', boarding:'En abordaje',
  in_transit:'En ruta', completed:'Completado', cancelled:'Cancelado'
}
export const TRIP_STATUS_COLORS: Record<string,string> = {
  draft:'bg-gray-100 text-gray-600', scheduled:'bg-blue-100 text-blue-700',
  boarding:'bg-amber-100 text-amber-700', in_transit:'bg-green-100 text-green-700',
  completed:'bg-emerald-100 text-emerald-700', cancelled:'bg-red-100 text-red-700'
}
export const BOARDING_STATUS_LABELS: Record<string,string> = { pending:'Pendiente', boarded:'Abordó', absent:'Ausente', cancelled:'Cancelado' }
export const BOARDING_STATUS_COLORS: Record<string,string> = {
  pending:'bg-amber-100 text-amber-700', boarded:'bg-green-100 text-green-700',
  absent:'bg-red-100 text-red-700', cancelled:'bg-gray-100 text-gray-500'
}
export const PAYMENT_STATUS_LABELS: Record<string,string> = {
  pending:'Pendiente', partial:'Parcial', paid:'Pagado', refunded:'Reembolsado', complimentary:'Cortesía'
}
export const PAYMENT_STATUS_COLORS: Record<string,string> = {
  pending:'bg-red-50 text-red-600', partial:'bg-amber-50 text-amber-600',
  paid:'bg-green-50 text-green-600', refunded:'bg-gray-100 text-gray-500', complimentary:'bg-purple-50 text-purple-600'
}
export const TRIP_TYPE_LABELS: Record<string,string> = {
  personnel:'Transporte de personal', tourism:'Turismo / Excursión',
  rental:'Renta con operador', charter:'Charter', executive:'Traslado ejecutivo',
  school:'Transporte escolar', event:'Evento'
}
