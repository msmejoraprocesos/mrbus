import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmt, fmtPct } from "@/lib/utils/index"
export const metadata: Metadata = { title: "KPI Operativos" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]
  const thisMonth = today.slice(0, 7)
  const [{ data: trips }, { data: pax }, { data: vehicles }, { data: drivers }] = await Promise.all([
    supabase.from("trips").select("id,status,departure_date,service_type").gte("departure_date", thisMonth + "-01"),
    supabase.from("trip_passengers").select("id,boarding_status").limit(10000),
    supabase.from("vehicles").select("id,status"),
    supabase.from("drivers").select("id,status"),
  ])
  const allTrips = trips ?? []
  const allPax = pax ?? []
  const allVehicles = vehicles ?? []
  const allDrivers = drivers ?? []
  const completed = allTrips.filter((t:any) => t.status === "completed").length
  const cancelled = allTrips.filter((t:any) => t.status === "cancelled").length
  const completionRate = allTrips.length > 0 ? (completed / (allTrips.length - cancelled)) * 100 : 0
  const boarded = allPax.filter((p:any) => p.boarding_status === "boarded").length
  const boardingRate = allPax.length > 0 ? (boarded / allPax.length) * 100 : 0
  const activeVehicles = allVehicles.filter((v:any) => v.status === "active").length
  const activeDrivers = allDrivers.filter((d:any) => d.status === "active").length
  const KPIs = [
    { title:"Viajes del mes", val:String(allTrips.length), sub:"Total programados", color:"text-blue-700", bg:"bg-blue-50", icon:"📅" },
    { title:"Viajes completados", val:String(completed), sub:fmtPct(completionRate) + " tasa de cumplimiento", color:"text-green-700", bg:"bg-green-50", icon:"✅" },
    { title:"Cancelaciones", val:String(cancelled), sub:fmtPct(cancelled > 0 ? cancelled / allTrips.length * 100 : 0) + " tasa de cancelación", color:"text-red-600", bg:"bg-red-50", icon:"❌" },
    { title:"Pasajeros abordados", val:String(boarded), sub:fmtPct(boardingRate) + " tasa de abordaje", color:"text-teal-700", bg:"bg-teal-50", icon:"👥" },
    { title:"Unidades activas", val:String(activeVehicles), sub:"de " + allVehicles.length + " registradas", color:"text-purple-700", bg:"bg-purple-50", icon:"🚌" },
    { title:"Operadores activos", val:String(activeDrivers), sub:"de " + allDrivers.length + " registrados", color:"text-rose-700", bg:"bg-rose-50", icon:"👤" },
  ]
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">📊</div>
        <div><h1 className="text-2xl font-bold text-indigo-900">KPI Operativos</h1>
        <p className="text-gray-400 text-sm">Indicadores clave del mes en curso</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {KPIs.map(k => (
          <div key={k.title} className={"rounded-xl border border-gray-100 shadow-sm p-5 " + k.bg}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{k.title}</p>
              <span className="text-2xl">{k.icon}</span>
            </div>
            <p className={"text-4xl font-bold " + k.color}>{k.val}</p>
            <p className="text-xs text-gray-400 mt-2">{k.sub}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Distribución de viajes por tipo de servicio (mes)</h2>
        <div className="space-y-3">
          {Object.entries(allTrips.reduce((acc:Record<string,number>, t:any) => {
            acc[t.service_type ?? t.type ?? "other"] = (acc[t.service_type ?? t.type ?? "other"] ?? 0) + 1
            return acc
          }, {})).sort(([,a],[,b]) => (b as number) - (a as number)).map(([type, count]) => {
            const pct = allTrips.length > 0 ? Math.round((count as number) / allTrips.length * 100) : 0
            const LABELS: Record<string,string> = { tourism_b2b:"Turismo B2B", agency_b2c:"Agencia B2C", personnel:"Personal", rental:"Renta", executive:"Ejecutivo", parcel_in_trip:"Paquetería en viaje", parcel_dedicated:"Paquetería dedicada", tourism:"Turismo", charter:"Charter" }
            return (
              <div key={type} className="flex items-center gap-3">
                <p className="text-sm text-gray-600 w-48 truncate">{LABELS[type] ?? type}</p>
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div className="h-3 rounded-full bg-indigo-500 transition-all" style={{ width: pct + "%" }} />
                </div>
                <p className="text-xs font-bold text-gray-700 w-12 text-right">{count as number} ({pct}%)</p>
              </div>
            )
          })}
          {allTrips.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin datos del mes</p>}
        </div>
      </div>
    </div>
  )
}
