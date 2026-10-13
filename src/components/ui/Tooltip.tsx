'use client'
import React from 'react'

interface TooltipProps {
  children: React.ReactNode
  text: string
  position?: 'top' | 'right' | 'bottom' | 'left'
}

const POSITIONS: Record<string, { container: string; tooltip: string; arrow: string }> = {
  top: {
    container: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    tooltip: '',
    arrow: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-4 border-transparent',
  },
  bottom: {
    container: 'top-full left-1/2 -translate-x-1/2 mt-2',
    tooltip: '',
    arrow: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-4 border-transparent',
  },
  right: {
    container: 'left-full top-1/2 -translate-y-1/2 ml-2',
    tooltip: '',
    arrow: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-4 border-transparent',
  },
  left: {
    container: 'right-full top-1/2 -translate-y-1/2 mr-2',
    tooltip: '',
    arrow: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-4 border-transparent',
  },
}

export default function Tooltip({ children, text, position = 'top' }: TooltipProps) {
  const pos = POSITIONS[position]
  return (
    <span className="relative inline-flex items-center group">
      {children}
      <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold cursor-help hover:bg-slate-300 transition-colors">
        ?
      </span>
      <span
        className={`absolute ${pos.container} z-50 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150`}
      >
        <span
          className="block bg-slate-800 text-white text-[12px] rounded-md px-2.5 py-1.5 shadow-lg whitespace-normal leading-snug"
          style={{ maxWidth: '200px' }}
        >
          {text}
        </span>
        <span className={`absolute ${pos.arrow}`} />
      </span>
    </span>
  )
}

interface FieldLabelProps {
  htmlFor?: string
  required?: boolean
  tooltip?: string
  tooltipPosition?: 'top' | 'right' | 'bottom' | 'left'
  children: React.ReactNode
  className?: string
}

export function FieldLabel({ htmlFor, required, tooltip, tooltipPosition = 'top', children, className }: FieldLabelProps) {
  const labelContent = (
    <>
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </>
  )

  return (
    <label htmlFor={htmlFor} className={`text-xs font-medium text-slate-600 mb-1 flex items-center ${className ?? ''}`}>
      {tooltip ? (
        <Tooltip text={tooltip} position={tooltipPosition}>
          {labelContent}
        </Tooltip>
      ) : (
        labelContent
      )}
    </label>
  )
}
