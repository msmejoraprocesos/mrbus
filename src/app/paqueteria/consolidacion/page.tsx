import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmt, fmtDate, SHIP_STATUS, SHIP_STATUS_COLORS, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Consolidación" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const [{ data: trips }, { data: orders }] = await Promise.all([
    supabase.from("trips").select("id,trip_number,departure_date,origin_label,destination_label,status").in("status", ["scheduled","boarding","in_transit"]).order("departure_date"),
    supabase.from("shipping_orders").select("*").in("status", ["registered","collected"]),
  ])
  const activeTrips = trips ?? []
  const pendingOrders = orders ?? []
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl">📦</div>
        <div><h1 className="text-2xl font-bold text-gray-900">Consolidación de Paquetería</h1>
        <p className="text-gray-400 text-sm">Asignar paquetes a viajes activos para maximizar bodega</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">🚌 Viajes con espacio disponible</h2>
          <div className="space-y-3">
            {activeTrips.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin viajes activos</p>
            ) : activeTrips.map((t:any) => (
              <div key={t.id} className="p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-green-900">{t.trip_number}</p>
                    <p className="text-xs text-green-700">{t.origin_label} → {t.destination_label}</p>
                    <p className="text-xs text-gray-400">{fmtDate(t.departure_date)}</p>
                  </div>
                  <button className="btn-primary text-xs py-1 px-2">Asignar paquete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">📦 Paquetes sin asignar ({pendingOrders.length})</h2>
          <div className="space-y-2">
            {pendingOrders.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin paquetes pendientes de asignar</p>
            ) : pendingOrders.map((o:any) => (
              <div key={o.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs font-bold text-gray-700">{o.order_number}</p>
                  <p className="text-xs text-gray-600">{o.sender_name} → {o.recipient_name}</p>
                  <p className="text-xs text-gray-400">{o.weight_kg} kg · {o.recipient_address}</p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", SHIP_STATUS_COLORS[o.status])}>{SHIP_STATUS[o.status]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
