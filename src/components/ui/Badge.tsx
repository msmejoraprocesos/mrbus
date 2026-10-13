import { cn } from '@/lib/utils/index'

interface BadgeProps {
  label: string
  color?: string   // hex bg
  textColor?: string
  dot?: boolean
  size?: 'xs' | 'sm'
  className?: string
}

// Badge de color sólido con dot opcional
export function Badge({ label, color = '#E2E8F0', textColor, dot, size = 'sm', className }: BadgeProps) {
  const isLight = isLightColor(color)
  const text = textColor ?? (isLight ? '#1E293B' : '#FFFFFF')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        className
      )}
      style={{ backgroundColor: color, color: text }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: text }}
        />
      )}
      {label}
    </span>
  )
}

// Badges predefinidos para estados comunes en MrBus
export function StatusBadge({ status, map }: {
  status: string
  map: Record<string, { label: string; bg: string; text: string }>
}) {
  const entry = map[status]
  if (!entry) return <Badge label={status} />
  return <Badge label={entry.label} color={entry.bg} textColor={entry.text} dot />
}

// Detectar si un color hex es claro u oscuro
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

// ── Paletas de estado predefinidas ───────────────────────────────
export const ESTADO_LEAD = {
  nuevo:       { label: 'Nuevo',         bg: '#EFF6FF', text: '#1D4ED8' },
  contactado:  { label: 'Contactado',    bg: '#FFF7ED', text: '#C2410C' },
  propuesta:   { label: 'Propuesta',     bg: '#F5F3FF', text: '#7C3AED' },
  negociacion: { label: 'Negociación',   bg: '#FEFCE8', text: '#B45309' },
  confirmado:  { label: 'Confirmado',    bg: '#F0FDF4', text: '#15803D' },
  perdido:     { label: 'Perdido',       bg: '#F9FAFB', text: '#6B7280' },
}

export const ESTADO_VIAJE = {
  scheduled:   { label: 'Programado',   bg: '#EFF6FF', text: '#1D4ED8' },
  in_progress: { label: 'En curso',     bg: '#FFF7ED', text: '#C2410C' },
  completed:   { label: 'Completado',   bg: '#F0FDF4', text: '#15803D' },
  cancelled:   { label: 'Cancelado',    bg: '#FEF2F2', text: '#DC2626' },
  delayed:     { label: 'Con demora',   bg: '#FEFCE8', text: '#B45309' },
}

export const ESTADO_CONTRATO = {
  draft:      { label: 'Borrador',      bg: '#F8FAFC', text: '#64748B' },
  sent:       { label: 'Enviado',       bg: '#EFF6FF', text: '#1D4ED8' },
  signed:     { label: 'Firmado',       bg: '#F5F3FF', text: '#7C3AED' },
  active:     { label: 'Activo',        bg: '#F0FDF4', text: '#15803D' },
  completed:  { label: 'Completado',    bg: '#ECFDF5', text: '#059669' },
  cancelled:  { label: 'Cancelado',     bg: '#FEF2F2', text: '#DC2626' },
}

export const ESTADO_PAGO = {
  pending:    { label: 'Pendiente',     bg: '#FEF2F2', text: '#DC2626' },
  partial:    { label: 'Parcial',       bg: '#FFF7ED', text: '#C2410C' },
  paid:       { label: 'Pagado',        bg: '#F0FDF4', text: '#15803D' },
  overdue:    { label: 'Vencido',       bg: '#FEE2E2', text: '#991B1B' },
  cancelled:  { label: 'Cancelado',     bg: '#F8FAFC', text: '#94A3B8' },
}
