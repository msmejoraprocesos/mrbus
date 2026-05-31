import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmtDate } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Reporte de Asistencia" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("boarding_events")
    .select("*, trip:trips(trip_number, departure_date), passenger:passengers(first_name, last_name)")
    .order("timestamp", { ascending: false }).limit(200)
  const events = data ?? []
  const today = new Date().toISOString().split("T")[0]
  const todayEvents = events.filter((e:any) => {
    const trip = Array.isArray(e.trip) ? e.trip[0] : e.trip
    return trip?.departure_date === today
  })
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">📊</div>
        <div><h1 className="text-2xl font-bold text-green-900">Reporte de Asistencia</h1>
        <p className="text-gray-400 text-sm">Control de abordaje de empleados por ruta</p></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:"Abordajes hoy", val:String(todayEvents.filter((e:any) => e.event_type === "checkin").length), bg:"bg-green-50", tc:"text-green-700" },
          { label:"Ausencias hoy", val:String(todayEvents.filter((e:any) => e.event_type === "absent").length), bg:"bg-red-50", tc:"text-red-600" },
          { label:"Total registros", val:String(events.length), bg:"bg-gray-50", tc:"text-gray-700" },
        ].map(s => (
          <div key={s.label} className={"rounded-xl border border-gray-100 shadow-sm p-4 " + s.bg}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={"text-2xl font-bold mt-1 " + s.tc}>{s.val}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-green-50 flex items-center justify-between">
          <h2 className="font-semibold text-green-900">Historial de abordajes</h2>
          <button className="btn-secondary text-xs py-1">Exportar Excel</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b">
              {["Fecha","Viaje","Empleado","Evento","Hora","GPS"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {events.slice(0, 50).map((e:any) => {
                const trip = Array.isArray(e.trip) ? e.trip[0] : e.trip
                const pax = Array.isArray(e.passenger) ? e.passenger[0] : e.passenger
                return (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(trip?.departure_date)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{trip?.trip_number ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{pax ? pax.first_name + " " + pax.last_name : "—"}</td>
                    <td className="px-4 py-3"><span className={"text-xs px-2 py-0.5 rounded-full font-semibold " + (e.event_type === "checkin" ? "bg-green-100 text-green-700" : e.event_type === "absent" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500")}>{e.event_type === "checkin" ? "✅ Abordó" : e.event_type === "absent" ? "❌ Ausente" : e.event_type}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(e.timestamp).toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" })}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{e.latitude ? "📍" + e.latitude.toFixed(4) + ", " + e.longitude.toFixed(4) : "—"}</td>
                  </tr>
                )
              })}
              {events.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Sin registros de abordaje</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
