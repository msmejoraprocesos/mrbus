import { cn } from '@/lib/utils/index'
import { forwardRef } from 'react'

/* ─── Campo de texto/select genérico ─────────────────────────── */
interface FieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}

export function Field({ label, required, error, hint, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

/* ─── Input ──────────────────────────────────────────────────── */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-9 px-3 text-sm rounded-lg border transition-colors bg-white',
        'border-slate-200 text-slate-800 placeholder:text-slate-400',
        'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10',
        error && 'border-red-400 focus:border-red-500 focus:ring-red-500/10',
        props.disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

/* ─── Select ─────────────────────────────────────────────────── */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full h-9 px-3 text-sm rounded-lg border transition-colors bg-white appearance-none cursor-pointer',
        'border-slate-200 text-slate-800',
        'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10',
        error && 'border-red-400',
        props.disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = 'Select'

/* ─── Textarea ───────────────────────────────────────────────── */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full px-3 py-2 text-sm rounded-lg border transition-colors bg-white resize-none',
        'border-slate-200 text-slate-800 placeholder:text-slate-400',
        'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10',
        error && 'border-red-400',
        className
      )}
      rows={3}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

/* ─── Botones ─────────────────────────────────────────────────── */
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
}

const BTN_VARIANTS = {
  primary:   'bg-blue-700 text-white hover:bg-blue-800 border border-blue-700',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200',
  danger:    'bg-red-600 text-white hover:bg-red-700 border border-red-600',
  ghost:     'bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent',
}

const BTN_SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
}

export function Btn({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...props }: BtnProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
