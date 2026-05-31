import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Unidades' }
export const dynamic = 'force-dynamic'
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from('vehicles')
    .select('*, cost_profile:vehicle_cost_profiles(*), docs:vehicle_documents(*)')
    .order('economic_number')
  const vehicles = data ?? []
  const active = vehicles.filter((v:any) => v.status === 'active').length
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">🚌</div>
          <div><h1 className="text-2xl font-bold text-purple-900">Unidades</h1>
          <p className="text-gray-400 text-sm">{active} activas de {vehicles.length} registradas</p></div>
        </div>
        <Link href="/flota/unidades/new" className="btn-primary"><Plus className="w-4 h-4"/>Nueva unidad</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vehicles.map((v:any) => {
          const profile = Array.isArray(v.cost_profile) ? v.cost_profile[0] : v.cost_profile
          const docs = v.docs ?? []
          const expiredDocs = docs.filter((d:any) => d.status === 'expired').length
          const expiringDocs = docs.filter((d:any) => d.status === 'expiring_soon').length
          return (
            <Link key={v.id} href={"/flota/unidades/" + v.id} className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900 text-lg">{v.plate}</p>
                  <p className="text-sm text-gray-400">{v.brand} {v.model} {v.year}</p>
                </div>
                <span className={"text-xs px-2 py-0.5 rounded-full font-semibold " + (v.status === 'active' ? 'bg-green-100 text-green-700' : v.status === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                  {v.status === 'active' ? 'Activa' : v.status === 'maintenance' ? 'Mantenimiento' : 'Inactiva'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400">Capacidad</p><p className="font-bold text-gray-900">{v.capacity}</p></div>
                <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400">Tipo</p><p className="font-bold text-gray-900 text-xs">{v.type}</p></div>
                <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400">Ejes</p><p className="font-bold text-gray-900">{profile?.axle_count ?? '2'}</p></div>
              </div>
              {(expiredDocs > 0 || expiringDocs > 0) && (
                <div className={"text-xs px-2 py-1 rounded-lg " + (expiredDocs > 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600')}>
                  {expiredDocs > 0 ? "⚠️ " + expiredDocs + " doc(s) vencido(s)" : "⏰ " + expiringDocs + " doc(s) por vencer"}
                </div>
              )}
            </Link>
          )
        })}
        {vehicles.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-16 text-gray-400">
            <span className="text-5xl mb-3">🚌</span>
            <p>No hay unidades registradas</p>
            <Link href="/flota/unidades/new" className="btn-primary mt-4">Registrar unidad</Link>
          </div>
        )}
      </div>
    </div>
  )
}
