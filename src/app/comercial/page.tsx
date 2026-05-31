import { Metadata } from 'next'
import Link from 'next/link'
export const metadata: Metadata = { title: 'Comercial' }
const modules = [
  { name: 'CRM', desc: 'Pipeline de ventas y seguimiento de leads', icon: '👥', href: '/comercial/crm', status: 'done' },
  { name: 'Cotizaciones', desc: 'Motor de cotización con costos reales', icon: '📋', href: '/comercial/cotizacion', status: 'dev' },
  { name: 'Contratos', desc: 'Generación y firma de contratos', icon: '📑', href: '/comercial/contratos', status: 'soon' },
]
const STATUS: Record<string, [string, string, string]> = {
  done: ['✅ Disponible', 'text-green-700', 'bg-green-50 border-green-200'],
  dev:  ['🔨 En desarrollo', 'text-amber-700', 'bg-amber-50 border-amber-200'],
  soon: ['⏳ Próximamente', 'text-gray-400', 'bg-gray-50 border-gray-100'],
}
export default function ComercialPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: '#DBEAFE' }}>💼</div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E40AF' }}>Comercial</h1>
          <p className="text-gray-400 text-sm mt-0.5">{modules.length} módulos en esta suite</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(mod => {
          const [sl, tc, bc] = STATUS[mod.status]
          const Card = (
            <div className="rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group h-full"
              style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: '#DBEAFE' }}>{mod.icon}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${tc} ${bc}`}>{sl}</span>
              </div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: '#1E40AF' }}>{mod.name}</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#1E40AF', opacity: 0.6 }}>{mod.desc}</p>
            </div>
          )
          return mod.status === 'done'
            ? <Link key={mod.name} href={mod.href}>{Card}</Link>
            : <div key={mod.name}>{Card}</div>
        })}
      </div>
    </div>
  )
}
