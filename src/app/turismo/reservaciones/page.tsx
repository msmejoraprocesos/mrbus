import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { fmt, fmtDate, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Reservaciones" }
export const dynamic = "force-dynamic"
const TRIP_S: Record<string,string> = { setup:"Configurando", on_sale:"En venta", full:"Lleno", confirmed:"Confirmado", at_risk:"En riesgo", cancelled:"Cancelado", completed:"Completado" }
const TRIP_C: Record<string,string> = { setup:"bg-gray-100 text-gray-600", on_sale:"bg-blue-100 text-blue-700", full:"bg-purple-100 text-purple-700", confirmed:"bg-green-100 text-green-700", at_risk:"bg-red-100 text-red-700", cancelled:"bg-gray-100 text-gray-400", completed:"bg-emerald-100 text-emerald-700" }
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("agency_trips")
    .select("*, trip:trips(trip_number, departure_date), reservations:seat_reservations(id,status,total_price,total_paid)")
    .order("created_at", { ascending: false })
  const trips = data ?? []
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-xl">🎫</div>
          <div><h1 className="text-2xl font-bold text-sky-900">Reservaciones — Agencia B2C</h1>
          <p className="text-gray-400 text-sm">{trips.length} viajes de agencia</p></div>
        </div>
        <Link href="/turismo/reservaciones/new" className="btn-primary"><Plus className="w-4 h-4" />Nuevo viaje de agencia</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {trips.map((t:any) => {
          const reservations = t.reservations ?? []
          const sold = reservations.filter((r:any) => ["reserved","paid"].includes(r.status)).length
          const paid_full = reservations.filter((r:any) => r.status === "paid").length
          const revenue = reservations.reduce((s:number,r:any) => s + (r.total_paid ?? 0), 0)
          const seatsAvail = (t.trip?.capacity ?? 40) - (t.seats_blocked ?? 2)
          const pct = seatsAvail > 0 ? Math.round(sold / seatsAvail * 100) : 0
          const trip = Array.isArray(t.trip) ? t.trip[0] : t.trip
          return (
            <Link key={t.id} href={"/turismo/reservaciones/" + t.id}
              className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{t.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{trip?.departure_date ? fmtDate(trip.departure_date) : "Fecha por definir"}</p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold ml-2 flex-shrink-0", TRIP_C[t.status])}>{TRIP_S[t.status]}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="text-center bg-blue-50 rounded-lg p-2"><p className="text-xs text-gray-400">Precio/asiento</p><p className="font-bold text-blue-700 text-sm">{fmt(t.price_per_seat)}</p></div>
                <div className="text-center bg-green-50 rounded-lg p-2"><p className="text-xs text-gray-400">Vendidos</p><p className="font-bold text-green-700 text-sm">{sold}/{seatsAvail}</p></div>
                <div className="text-center bg-teal-50 rounded-lg p-2"><p className="text-xs text-gray-400">Cobrado</p><p className="font-bold text-teal-700 text-sm">{fmt(revenue)}</p></div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400"><span>Ocupación</span><span className="font-semibold">{pct}%</span></div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={"h-2 rounded-full " + (pct >= 100 ? "bg-purple-500" : pct >= t.min_seats_to_confirm / seatsAvail * 100 ? "bg-green-500" : "bg-amber-500")} style={{ width: Math.min(pct, 100) + "%" }} />
                </div>
                <p className="text-[10px] text-gray-400">Mínimo para salir: {t.min_seats_to_confirm} asientos</p>
              </div>
            </Link>
          )
        })}
        {trips.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-16 text-gray-400">
            <span className="text-5xl mb-3">🎫</span>
            <p>No hay viajes de agencia creados</p>
            <Link href="/turismo/reservaciones/new" className="btn-primary mt-4">Crear primer viaje</Link>
          </div>
        )}
      </div>
    </div>
  )
}
