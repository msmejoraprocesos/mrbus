import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import { Truck, User } from 'lucide-react'
export const metadata: Metadata = { title: 'Tráfico' }
export const dynamic = 'force-dynamic'
export default async function Page() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const [{ data: trips }, { data: vehicles }, { data: drivers }] = await Promise.all([
    supabase.from('trips').select('*, vehicle:vehicles(plate,economic_number), driver:drivers(first_name,last_name)').eq('departure_date', today).neq('status','cancelled').order('departure_time'),
    supabase.from('vehicles').select('id,plate,economic_number,status,type').eq('status','active'),
    supabase.from('drivers').select('id,first_name,last_name,status').eq('status','active'),
  ])
  const assignedVehicles = new Set(trips?.map((t: any) => t.vehicle_id).filter(Boolean))
  const assignedDrivers = new Set(trips?.map((t: any) => t.driver_id).filter(Boolean))
  const freeVehicles = (vehicles ?? []).filter((v: any) => !assignedVehicles.has(v.id))
  const freeDrivers = (drivers ?? []).filter((d: any) => !assignedDrivers.has(d.id))
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">🎯</div>
        <div><h1 className="text-2xl font-bold text-green-900">Tráfico — hoy</h1><p className="text-gray-400 text-sm">{trips?.length ?? 0} servicios programados</p></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Truck className="w-4 h-4 text-green-600" />Unidades</h2>
            <div className="flex gap-2 text-xs"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{assignedVehicles.size} en servicio</span><span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{freeVehicles.length} disponibles</span></div>
          </div>
          <div className="space-y-2">
            {(trips ?? []).map((t: any) => t.vehicle && (
              <div key={t.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                <div><p className="font-semibold text-sm text-green-900">{t.vehicle.plate}</p><p className="text-xs text-green-600">{t.origin_label} → {t.destination_label}</p></div>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">En servicio</span>
              </div>
            ))}
            {freeVehicles.slice(0,5).map((v: any) => (
              <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div><p className="font-semibold text-sm text-gray-700">{v.plate}</p><p className="text-xs text-gray-400">{v.type}</p></div>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">Disponible</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><User className="w-4 h-4 text-green-600" />Operadores</h2>
            <div className="flex gap-2 text-xs"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{assignedDrivers.size} asignados</span><span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{freeDrivers.length} disponibles</span></div>
          </div>
          <div className="space-y-2">
            {(trips ?? []).map((t: any) => t.driver && (
              <div key={t.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                <div><p className="font-semibold text-sm text-green-900">{t.driver.first_name} {t.driver.last_name}</p><p className="text-xs text-green-600">{t.origin_label} → {t.destination_label}</p></div>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">En servicio</span>
              </div>
            ))}
            {freeDrivers.slice(0,5).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div><p className="font-semibold text-sm text-gray-700">{d.first_name} {d.last_name}</p></div>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">Disponible</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
