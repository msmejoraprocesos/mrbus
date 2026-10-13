'use client'
import React from 'react'
import Tooltip from './Tooltip'

interface KpiCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  bg: string
  trend?: { value: number; label: string }
  alert?: boolean
  active?: boolean
  onClick?: () => void
  tooltip?: string
}

export default function KpiCard({
  label, value, icon: Icon, color, bg, trend, alert, active, onClick, tooltip
}: KpiCardProps) {
  const trendSign = trend && trend.value > 0 ? '↑' : trend && trend.value < 0 ? '↓' : '→'
  const trendColor = trend
    ? trend.value > 0
      ? 'text-green-600'
      : trend.value < 0
        ? 'text-red-500'
        : 'text-slate-400'
    : ''

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={[
        'relative bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-left w-full transition-all',
        onClick ? 'hover:shadow-md cursor-pointer' : 'cursor-default',
        active ? 'ring-2 ring-offset-1 ring-purple-400' : '',
      ].join(' ')}
      style={{ background: 'white' }}
    >
      {/* Alert pulse */}
      {alert && (
        <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
        </span>
      )}

      {/* Icon badge */}
      <div
        className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: bg }}
      >
        <Icon size={15} style={{ color }} />
      </div>

      {/* Label */}
      <p className="text-xs text-slate-500 font-medium mb-1 flex items-center">
        {tooltip ? (
          <Tooltip text={tooltip} position="top">
            {label}
          </Tooltip>
        ) : label}
      </p>

      {/* Value */}
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>

      {/* Trend */}
      {trend && (
        <p className={`text-xs mt-1 ${trendColor}`}>
          {trendSign} {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
    </button>
  )
}
