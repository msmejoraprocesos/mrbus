import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmt, fmtN } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Control de Horas/Km" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("rental_services")
    .select("*, trip:trips(trip_number, origin_label, destination_label), contract:contracts(contract_number)")
    .in("status", ["completed","billed"]).order("actual_end", { ascending: false })
  const rentals = data ?? []
  const withExtras = rentals.filter((r:any) => (r.extra_hours ?? 0) > 0 || (r.extra_km ?? 0) > 0)
  const totalExtras = rentals.reduce((s:number,r:any) => s + (r.extras_price ?? 0), 0)
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl">⏱️</div>
        <div><h1 className="text-2xl font-bold text-orange-900">Control de Horas / Km</h1>
        <p className="text-gray-400 text-sm">Servicios completados — diferencia real vs contratado</p></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:"Servicios con extras", val:String(withExtras.length), bg:"bg-amber-50", tc:"text-amber-700" },
          { label:"Total ingresos extras", val:fmt(totalExtras), bg:"bg-green-50", tc:"text-green-700" },
          { label:"Servicios analizados", val:String(rentals.length), bg:"bg-gray-50", tc:"text-gray-700" },
        ].map(s => (
          <div key={s.label} className={"rounded-xl border border-gray-100 shadow-sm p-4 " + s.bg}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={"text-2xl font-bold mt-1 " + s.tc}>{s.val}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-orange-50">
              {["Contrato","Ruta","Tipo","Contratado","Real","Diferencia","Extras facturados","Alerta"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {rentals.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Sin servicios completados</td></tr>
              ) : rentals.map((r:any) => {
                const trip = Array.isArray(r.trip) ? r.trip[0] : r.trip
                const contract = Array.isArray(r.contract) ? r.contract[0] : r.contract
                const isHourly = r.rental_type === "hourly"
                const contracted = isHourly ? r.contracted_hours : r.contracted_km
                const actual = isHourly ? r.actual_hours : r.actual_km
                const diff = (actual ?? 0) - (contracted ?? 0)
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{contract?.contract_number ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{trip ? trip.origin_label + " → " + trip.destination_label : "—"}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{isHourly ? "Horas" : "Km"}</span></td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{fmtN(contracted ?? 0, 1)}{isHourly ? "h" : "km"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmtN(actual ?? 0, 1)}{isHourly ? "h" : "km"}</td>
                    <td className={"px-4 py-3 font-bold " + (diff > 0 ? "text-amber-600" : "text-green-600")}>
                      {diff > 0 ? "+" : ""}{fmtN(diff, 1)}{isHourly ? "h" : "km"}
                    </td>
                    <td className={"px-4 py-3 font-bold " + ((r.extras_price ?? 0) > 0 ? "text-amber-600" : "text-gray-400")}>{(r.extras_price ?? 0) > 0 ? fmt(r.extras_price) : "—"}</td>
                    <td className="px-4 py-3">{diff > 0 ? <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">⚠️ Excedió</span> : <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">✅ OK</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
