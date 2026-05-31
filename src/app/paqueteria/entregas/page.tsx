import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmtDate, SHIP_STATUS, SHIP_STATUS_COLORS, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Recolección y Entrega" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const { data: events } = await supabase.from("shipping_events")
    .select("*, order:shipping_orders(order_number, sender_name, recipient_name, cargo_type)")
    .order("performed_at", { ascending: false }).limit(100)
  const allEvents = events ?? []
  const today = new Date().toISOString().split("T")[0]
  const todayEv = allEvents.filter((e:any) => e.performed_at?.startsWith(today))
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl">🚚</div>
        <div><h1 className="text-2xl font-bold text-gray-900">Recolección y Entrega</h1>
        <p className="text-gray-400 text-sm">Trazabilidad de cada paquete en tiempo real</p></div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:"Eventos hoy", val:String(todayEv.length), bg:"bg-blue-50", tc:"text-blue-700" },
          { label:"Entregas hoy", val:String(todayEv.filter((e:any) => e.event_type === "delivered").length), bg:"bg-green-50", tc:"text-green-700" },
          { label:"Recolecciones hoy", val:String(todayEv.filter((e:any) => e.event_type === "collected").length), bg:"bg-amber-50", tc:"text-amber-700" },
          { label:"Problemas hoy", val:String(todayEv.filter((e:any) => e.event_type === "problem").length), bg:"bg-red-50", tc:"text-red-600" },
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
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-gray-50">
              {["Guía","Remitente → Destinatario","Evento","Fecha/Hora","Foto","Firma","Notas"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {allEvents.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400"><span className="text-4xl block mb-2">🚚</span>Sin eventos de entrega registrados</td></tr>
              ) : allEvents.map((e:any) => {
                const order = Array.isArray(e.order) ? e.order[0] : e.order
                const EVENT_C: Record<string,string> = { collected:"bg-blue-100 text-blue-700", in_transit:"bg-amber-100 text-amber-700", delivered:"bg-green-100 text-green-700", problem:"bg-red-100 text-red-700", returned:"bg-purple-100 text-purple-700", note:"bg-gray-100 text-gray-600" }
                const EVENT_L: Record<string,string> = { collected:"📦 Recolectado", in_transit:"🚚 En tránsito", delivered:"✅ Entregado", problem:"⚠️ Problema", returned:"↩️ Devuelto", note:"📝 Nota" }
                return (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{order?.order_number ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{order ? order.sender_name + " → " + order.recipient_name : "—"}</td>
                    <td className="px-4 py-3"><span className={"text-xs px-2 py-0.5 rounded-full font-semibold " + (EVENT_C[e.event_type] ?? "bg-gray-100 text-gray-600")}>{EVENT_L[e.event_type] ?? e.event_type}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{e.performed_at ? new Date(e.performed_at).toLocaleString("es-MX", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "—"}</td>
                    <td className="px-4 py-3">{e.photo_url ? <a href={e.photo_url} target="_blank" rel="noreferrer" className="text-blue-500 text-xs">📷 Ver</a> : <span className="text-gray-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3">{e.signature_url ? <a href={e.signature_url} target="_blank" rel="noreferrer" className="text-blue-500 text-xs">✍️ Ver</a> : <span className="text-gray-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{e.notes ?? "—"}</td>
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
