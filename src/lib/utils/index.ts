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

export const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n ?? 0)
export const fmtN = (n: number, dec = 2) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n ?? 0)
export const fmtDate = (d?: string|null) => d ? new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' }) : '—'
export const fmtDT = (d?: string|null) => d ? new Date(d).toLocaleString('es-MX', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'
export const fmtPct = (n: number) => `${(n ?? 0).toFixed(1)}%`

export const MAINT_STATUS: Record<string,string> = { scheduled:'Programado', in_progress:'En proceso', completed:'Completado', cancelled:'Cancelado' }
export const MAINT_STATUS_COLORS: Record<string,string> = { scheduled:'bg-blue-100 text-blue-700', in_progress:'bg-amber-100 text-amber-700', completed:'bg-green-100 text-green-700', cancelled:'bg-gray-100 text-gray-500' }
export const MAINT_TYPE: Record<string,string> = { preventive:'Preventivo', corrective:'Correctivo', tire:'Llantas', cleaning:'Lavado', inspection:'Inspección' }
export const DOC_STATUS_COLORS: Record<string,string> = { valid:'bg-green-100 text-green-700', expiring_soon:'bg-amber-100 text-amber-700', expired:'bg-red-100 text-red-700' }
export const DOC_STATUS: Record<string,string> = { valid:'Vigente', expiring_soon:'Por vencer', expired:'Vencido' }
export const AR_STATUS: Record<string,string> = { pending:'Pendiente', partial:'Parcial', paid:'Pagado', overdue:'Vencido', cancelled:'Cancelado' }
export const AR_STATUS_COLORS: Record<string,string> = { pending:'bg-amber-100 text-amber-700', partial:'bg-blue-100 text-blue-700', paid:'bg-green-100 text-green-700', overdue:'bg-red-100 text-red-700', cancelled:'bg-gray-100 text-gray-400' }
export const SHIP_STATUS: Record<string,string> = { registered:'Registrado', collected:'Recolectado', in_transit:'En tránsito', delivered:'Entregado', problem:'Problema', returned:'Devuelto' }
export const SHIP_STATUS_COLORS: Record<string,string> = { registered:'bg-gray-100 text-gray-600', collected:'bg-blue-100 text-blue-700', in_transit:'bg-amber-100 text-amber-700', delivered:'bg-green-100 text-green-700', problem:'bg-red-100 text-red-700', returned:'bg-purple-100 text-purple-700' }
export const CONTRACT_STATUS: Record<string,string> = { draft:'Borrador', sent:'Enviado', signed:'Firmado', active:'Activo', completed:'Completado', cancelled:'Cancelado' }
export const CONTRACT_STATUS_COLORS: Record<string,string> = { draft:'bg-gray-100 text-gray-600', sent:'bg-blue-100 text-blue-700', signed:'bg-purple-100 text-purple-700', active:'bg-green-100 text-green-700', completed:'bg-emerald-100 text-emerald-700', cancelled:'bg-red-100 text-red-700' }
