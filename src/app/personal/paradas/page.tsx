'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, RefreshCw } from 'lucide-react'

type Route = {
  id: string
  route_name: string
  departure_time: string | null
  shift: string | null
  stops: { order?: number; name: string; time?: string }[] | null
  agreement?: { client_name: string } | null
  employees?: { id: string; employee_name: string; stop_name: string | null; is_active: boolean }[]
}

export default function ParadasPage() {
  const supabase = createClient()
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('agreement_routes')
      .select('*, agreement:service_agreements(client_name), employees:agreement_employees(id,employee_name,stop_name,is_active)')
      .order('route_name')
    setRoutes((data ?? []) as unknown as Route[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <MapPin size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Control de Paradas</h1>
            <p className="text-xs text-slate-400">{routes.length} rutas con paradas</p>
          </div>
        </div>
        <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Cargando...</div>
      ) : routes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center py-16 text-slate-400">
          <span className="text-5xl mb-3">📍</span>
          <p>Las paradas se definen en los convenios de personal</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {routes.map(r => {
            const employees = r.employees ?? []
            const activeEmp = employees.filter(e => e.is_active)
            const stops = r.stops ?? []
            const agree = Array.isArray(r.agreement) ? (r.agreement as any)[0] : r.agreement
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">{r.route_name}</p>
                    <p className="text-xs text-slate-400">
                      {agree?.client_name ?? '—'} · {r.departure_time ?? '—'} · Turno {r.shift ?? '—'}
                    </p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    {activeEmp.length} emp.
                  </span>
                </div>
                {stops.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {stops.slice(0, 4).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0">
                          {s.order ?? i + 1}
                        </div>
                        <span className="text-slate-700">{s.name}</span>
                        {s.time && <span className="text-slate-400">{s.time}</span>}
                      </div>
                    ))}
                    {stops.length > 4 && (
                      <p className="text-xs text-slate-400 pl-7">+{stops.length - 4} paradas más</p>
                    )}
                  </div>
                )}
                <div className="border-t border-slate-100 pt-2">
                  <p className="text-xs text-slate-400 font-medium mb-1">Empleados asignados ({activeEmp.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {activeEmp.slice(0, 5).map(e => (
                      <span key={e.id} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {e.employee_name}
                      </span>
                    ))}
                    {activeEmp.length > 5 && (
                      <span className="text-xs text-slate-400">+{activeEmp.length - 5} más</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
