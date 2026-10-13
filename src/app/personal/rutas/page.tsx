'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate, cn } from '@/lib/utils/index'
import { Building2, RefreshCw } from 'lucide-react'

type Agreement = {
  id: string
  client_name: string
  status: string
  billing_scheme: string
  valid_from: string | null
  valid_until: string | null
  auto_renew: boolean | null
  operation_days: Record<string, boolean> | null
  routes?: { id: string }[]
  employees?: { id: string; is_active: boolean }[]
}

const AGREE_S: Record<string, string> = {
  draft: 'Borrador', active: 'Activo', paused: 'Pausado', expired: 'Vencido', cancelled: 'Cancelado',
}
const AGREE_C: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
}

export default function RutasPersonalPage() {
  const supabase = createClient()
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('service_agreements')
      .select('*, routes:agreement_routes(id), employees:agreement_employees(id,is_active)')
      .order('created_at', { ascending: false })
    setAgreements((data ?? []) as unknown as Agreement[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const active = agreements.filter(a => a.status === 'active').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Building2 size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Convenios de Transporte de Personal</h1>
            <p className="text-xs text-slate-400">{active} activos de {agreements.length} convenios</p>
          </div>
        </div>
        <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Cargando...</div>
      ) : agreements.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center py-16 text-slate-400">
          <span className="text-5xl mb-3">🏭</span>
          <p>No hay convenios de personal</p>
          <p className="text-xs mt-1">Los convenios se generan desde una cotización de tipo Personal</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agreements.map(a => {
            const routes = a.routes ?? []
            const employees = a.employees ?? []
            const activeEmp = employees.filter(e => e.is_active).length
            const opDays = Object.values(a.operation_days ?? {}).filter(Boolean).length
            return (
              <div key={a.id} className="block bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">{a.client_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {a.billing_scheme === 'fixed_route' ? 'Ruta fija mensual'
                        : a.billing_scheme === 'per_seat' ? 'Por asiento' : 'Mixto'}
                    </p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', AGREE_C[a.status] ?? 'bg-slate-100 text-slate-500')}>
                    {AGREE_S[a.status] ?? a.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-400">Rutas</p>
                    <p className="font-bold text-slate-900">{routes.length}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-400">Empleados</p>
                    <p className="font-bold text-slate-900">{activeEmp}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-400">Días op.</p>
                    <p className="font-bold text-slate-900 text-xs">{opDays}d</p>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  Vigencia: {fmtDate(a.valid_from)} — {fmtDate(a.valid_until)}
                  {a.auto_renew && (
                    <span className="ml-2 bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Auto-renueva</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
