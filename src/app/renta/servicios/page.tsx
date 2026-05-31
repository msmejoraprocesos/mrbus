import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import Link from "next/link"
import { fmt, fmtDate, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Servicios Eventuales de Renta" }
export const dynamic = "force-dynamic"
const STATUS: Record<string,string> = { scheduled:"Programado", active:"Activo", completed:"Completado", billed:"Facturado" }
const STATUS_C: Record<string,string> = { scheduled:"bg-blue-100 text-blue-700", active:"bg-green-100 text-green-700", completed:"bg-emerald-100 text-emerald-700", billed:"bg-gray-100 text-gray-500" }
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("rental_services")
    .select("*, trip:trips(trip_number, origin_label, destination_label, departure_date), contract:contracts(contract_number, lead:leads(first_name,last_name,company))")
    .order("created_at", { ascending: false })
  const rentals = data ?? []
  const active = rentals.filter((r:any) => r.status === "active").length
  const totalRevenue = rentals.filter((r:any) => ["completed","billed"].includes(r.status)).reduce((s:number,r:any) => s + (r.total_price ?? 0), 0)
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl">📋</div>
        <div><h1 className="text-2xl font-bold text-orange-900">Servicios Eventuales de Renta</h1>
        <p className="text-gray-400 text-sm">{rentals.length} servicios · {active} activos</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"Activos ahora", val:String(active), bg:"bg-green-50", tc:"text-green-700" },
          { label:"Programados", val:String(rentals.filter((r:any) => r.status === "scheduled").length), bg:"bg-blue-50", tc:"text-blue-700" },
          { label:"Completados", val:String(rentals.filter((r:any) => r.status === "completed").length), bg:"bg-gray-50", tc:"text-gray-700" },
          { label:"Ingresos completados", val:fmt(totalRevenue), bg:"bg-teal-50", tc:"text-teal-700" },
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
              {["Cliente","Viaje","Tipo","Contratado","Inicio real","Fin real","Precio base","Extras","Total","Estado"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {rentals.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400"><span className="text-4xl block mb-2">📋</span>Sin servicios de renta registrados</td></tr>
              ) : rentals.map((r:any) => {
                const trip = Array.isArray(r.trip) ? r.trip[0] : r.trip
                const contract = Array.isArray(r.contract) ? r.contract[0] : r.contract
                const lead = contract?.lead ? (Array.isArray(contract.lead) ? contract.lead[0] : contract.lead) : null
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50 group">
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{lead ? lead.first_name + " " + lead.last_name : "—"}</p>{lead?.company && <p className="text-xs text-gray-400">{lead.company}</p>}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{trip ? trip.origin_label + " → " + trip.destination_label : "—"}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">{r.rental_type === "hourly" ? "Por horas" : "Por días"}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.rental_type === "hourly" ? (r.contracted_hours ?? "—") + "h" : (r.contracted_km ?? "—") + "km"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.actual_start ? new Date(r.actual_start).toLocaleString("es-MX", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.actual_end ? new Date(r.actual_end).toLocaleString("es-MX", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{fmt(r.base_price)}</td>
                    <td className="px-4 py-3 text-amber-600 font-semibold">{r.extras_price > 0 ? "+" + fmt(r.extras_price) : "—"}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{fmt(r.total_price)}</td>
                    <td className="px-4 py-3"><span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", STATUS_C[r.status])}>{STATUS[r.status]}</span></td>
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
