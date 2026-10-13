import Link from 'next/link'
import { LucideIcon, ArrowRight, Lock } from 'lucide-react'
import { cn } from '@/lib/utils/index'

interface Module {
  name: string
  desc: string
  href: string
  icon: LucideIcon
  status: 'active' | 'beta' | 'soon'
  kpis?: string[]
}

interface SuitePageProps {
  title: string
  subtitle: string
  color: string      // color principal de la suite (hex)
  lightBg: string    // fondo claro (hex)
  icon: LucideIcon
  modules: Module[]
}

const STATUS_MAP = {
  active: { label: 'Activo',          bg: '#F0FDF4', text: '#166534', dot: '#22C55E' },
  beta:   { label: 'Beta',            bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  soon:   { label: 'Próximamente',    bg: '#F8FAFC', text: '#94A3B8', dot: '#CBD5E1' },
}

export default function SuitePage({ title, subtitle, color, lightBg, icon: Icon, modules }: SuitePageProps) {
  const active  = modules.filter(m => m.status === 'active').length
  const beta    = modules.filter(m => m.status === 'beta').length
  const soon    = modules.filter(m => m.status === 'soon').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: lightBg }}
          >
            <Icon size={22} style={{ color }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{title}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Stats rápidas */}
        <div className="flex items-center gap-3 text-xs">
          {active > 0 && (
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {active} activo{active !== 1 ? 's' : ''}
            </span>
          )}
          {beta > 0 && (
            <span className="flex items-center gap-1.5 text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {beta} beta
            </span>
          )}
          {soon > 0 && (
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              {soon} próximo{soon !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Grid de módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(mod => {
          const ModIcon = mod.icon
          const st = STATUS_MAP[mod.status]
          const isDisabled = mod.status === 'soon'

          return isDisabled ? (
            <div
              key={mod.name}
              className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 opacity-60"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  <Lock size={14} className="text-slate-400" />
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: st.bg, color: st.text }}
                >
                  {st.label}
                </span>
              </div>
              <h3 className="font-semibold text-sm text-slate-500 mb-1">{mod.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{mod.desc}</p>
            </div>
          ) : (
            <Link
              key={mod.name}
              href={mod.href}
              className={cn(
                'group block rounded-xl border bg-white p-5',
                'hover:shadow-md hover:-translate-y-0.5 transition-all duration-150',
                'border-slate-100'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: lightBg }}
                >
                  <ModIcon size={16} style={{ color }} />
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                  style={{ backgroundColor: st.bg, color: st.text }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                  {st.label}
                </span>
              </div>

              <h3 className="font-semibold text-sm text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">
                {mod.name}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">{mod.desc}</p>

              {/* KPIs rápidos si existen */}
              {mod.kpis && mod.kpis.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {mod.kpis.map(k => (
                    <span key={k} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">
                      {k}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color }}>
                Abrir módulo
                <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
