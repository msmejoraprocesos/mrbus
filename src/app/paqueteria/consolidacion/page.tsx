'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate } from '@/lib/utils/index'
import { auditLog } from '@/lib/audit'
import { Package, RefreshCw, Link2, Unlink, CheckCircle } from 'lucide-react'

type Trip = {
  id: string
  trip_number: string
  departure_date: string
  origin_label: string
  destination_label: string
  status: string
}

type ShipOrder = {
  id: string
  order_number: string
  sender_name: string
  recipient_name: string
  recipient_address: string | null
  weight_kg: number | null
  declared_value: number | null
  status: string
  trip_id: string | null
}

const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-blue-100 text-blue-700',
  collected:  'bg-amber-100 text-amber-700',
  in_transit: 'bg-green-100 text-green-700',
  delivered:  'bg-slate-100 text-slate-500',
  returned:   'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = {
  registered: 'Registrado', collected: 'Recolectado', in_transit: 'En tránsito', delivered: 'Entregado', returned: 'Devuelto',
}

export default function ConsolidacionPage() {
  const supabase = createClient()
  const [trips, setTrips]   = useState<Trip[]>([])
  const [orders, setOrders] = useState<ShipOrder[]>([])
  const [loading, setLoading]   = useState(true)
  const [selectedTrip, setSelectedTrip]   = useState<string>('')
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [tripsRes, ordersRes] = await Promise.all([
      supabase.from('trips')
        .select('id,trip_number,departure_date,origin_label,destination_label,status')
        .in('status', ['scheduled','boarding','in_transit'])
        .order('departure_date'),
      supabase.from('shipping_orders')
        .select('*')
        .in('status', ['registered','collected'])
        .order('created_at', { ascending: false }),
    ])
    setTrips(tripsRes.data ?? [])
    setOrders(ordersRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function toggleOrder(id: string) {
    setSelectedOrders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function asignar() {
    if (!selectedTrip || selectedOrders.size === 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? ''
    const ids = Array.from(selectedOrders)

    const { error } = await supabase.from('shipping_orders')
      .update({ trip_id: selectedTrip, status: 'in_transit' })
      .in('id', ids)

    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    const trip = trips.find(t => t.id === selectedTrip)
    await auditLog({ action: 'UPDATE', module: 'consolidacion', table_name: 'shipping_orders', record_folio: trip?.trip_number, user_id: uid })

    setSelectedOrders(new Set())
    setSelectedTrip('')
    setSaving(false)
    load()
  }

  async function desasignar(orderId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? ''
    await supabase.from('shipping_orders').update({ trip_id: null, status: 'collected' }).eq('id', orderId)
    await auditLog({ action: 'UPDATE', module: 'consolidacion', table_name: 'shipping_orders', user_id: uid })
    load()
  }

  // Orders assigned to a specific trip (for the trip detail panel)
  const assignedToTrip = (tripId: string) => orders.filter(o => (o as any).trip_id === tripId)

  const pendingOrders = orders.filter(o => !o.trip_id)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Package size={20} className="text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Consolidación de Paquetería</h1>
            <p className="text-xs text-slate-400">{pendingOrders.length} paquetes sin asignar · {trips.length} viajes disponibles</p>
          </div>
        </div>
        <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Viajes disponibles */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-green-50">
            <h2 className="font-semibold text-green-900 text-sm">🚌 Viajes disponibles</h2>
          </div>
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {loading ? (
              <p className="text-center text-slate-400 py-8 text-sm">Cargando...</p>
            ) : trips.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Sin viajes activos</p>
            ) : trips.map(t => {
              const count = (orders as any[]).filter(o => o.trip_id === t.id).length
              return (
                <div key={t.id}
                  onClick={() => setSelectedTrip(selectedTrip === t.id ? '' : t.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedTrip === t.id ? 'border-green-400 bg-green-50 ring-2 ring-green-200' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{t.trip_number}</p>
                      <p className="text-xs text-slate-500">{t.origin_label} → {t.destination_label}</p>
                      <p className="text-xs text-slate-400">{fmtDate(t.departure_date)}</p>
                    </div>
                    <div className="text-right">
                      {count > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                          {count} paquete{count > 1 ? 's' : ''}
                        </span>
                      )}
                      {selectedTrip === t.id && (
                        <p className="text-xs text-green-600 font-medium mt-1">✓ Seleccionado</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Paquetes sin asignar */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-amber-50 flex items-center justify-between">
            <h2 className="font-semibold text-amber-900 text-sm">📦 Sin asignar ({pendingOrders.length})</h2>
            {selectedOrders.size > 0 && (
              <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                {selectedOrders.size} seleccionado{selectedOrders.size > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {pendingOrders.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">✅ Todos los paquetes están asignados</p>
            ) : pendingOrders.map(o => (
              <div key={o.id}
                onClick={() => toggleOrder(o.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedOrders.has(o.id) ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-xs font-bold text-slate-700">{o.order_number}</p>
                    <p className="text-xs text-slate-600">{o.sender_name} → {o.recipient_name}</p>
                    <p className="text-xs text-slate-400">
                      {o.weight_kg ? `${o.weight_kg} kg` : ''}
                      {o.declared_value ? ` · ${fmt(o.declared_value)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[o.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                    {selectedOrders.has(o.id) && <CheckCircle size={14} className="text-blue-600" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assign action */}
      {selectedOrders.size > 0 && selectedTrip && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-900 text-sm">
              Asignar {selectedOrders.size} paquete{selectedOrders.size > 1 ? 's' : ''} al viaje {trips.find(t => t.id === selectedTrip)?.trip_number}
            </p>
            <p className="text-xs text-green-700">Los paquetes cambiarán a estado "En tránsito"</p>
          </div>
          <button onClick={asignar} disabled={saving}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Link2 size={14} />}
            Confirmar asignación
          </button>
        </div>
      )}

      {/* Hint when partial selection */}
      {(selectedOrders.size > 0 && !selectedTrip) && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3">
          ⬆️ Selecciona un viaje de destino para asignar los {selectedOrders.size} paquete{selectedOrders.size > 1 ? 's' : ''} seleccionado{selectedOrders.size > 1 ? 's' : ''}
        </p>
      )}
      {(selectedOrders.size === 0 && selectedTrip) && (
        <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-4 py-3">
          ⬆️ Selecciona los paquetes que quieres asignar al viaje seleccionado
        </p>
      )}
    </div>
  )
}
