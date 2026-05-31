import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { fmt, fmtDate, SHIP_STATUS, SHIP_STATUS_COLORS, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Guías de Paquetería" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("shipping_orders")
    .select("*, trip:trips(trip_number)")
    .order("created_at", { ascending: false })
  const orders = data ?? []
  const inTransit = orders.filter((o:any) => o.status === "in_transit").length
  const delivered = orders.filter((o:any) => o.status === "delivered").length
  const totalRevenue = orders.filter((o:any) => ["delivered","in_transit"].includes(o.status)).reduce((s:number,o:any) => s + (o.quoted_price ?? 0), 0)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl">📄</div>
          <div><h1 className="text-2xl font-bold text-gray-900">Guías de Paquetería</h1>
          <p className="text-gray-400 text-sm">{orders.length} envíos registrados</p></div>
        </div>
        <Link href="/paqueteria/guias/new" className="btn-primary"><Plus className="w-4 h-4" />Nueva guía</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"En tránsito", val:String(inTransit), bg:"bg-amber-50", tc:"text-amber-700" },
          { label:"Entregados", val:String(delivered), bg:"bg-green-50", tc:"text-green-700" },
          { label:"Con problema", val:String(orders.filter((o:any) => o.status === "problem").length), bg:"bg-red-50", tc:"text-red-600" },
          { label:"Ingreso total", val:fmt(totalRevenue), bg:"bg-teal-50", tc:"text-teal-700" },
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
              {["No. Guía","Remitente","Destinatario","Dirección entrega","Peso","Tipo","Precio","Viaje","Estado","Fecha"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400"><span className="text-4xl block mb-2">📦</span>Sin guías registradas</td></tr>
              ) : orders.map((o:any) => {
                const trip = Array.isArray(o.trip) ? o.trip[0] : o.trip
                return (
                  <tr key={o.id} className="hover:bg-gray-50/50 group">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{o.order_number}</td>
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{o.sender_name}</p>{o.sender_phone && <p className="text-xs text-gray-400">{o.sender_phone}</p>}</td>
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{o.recipient_name}</p>{o.recipient_phone && <p className="text-xs text-gray-400">{o.recipient_phone}</p>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">{o.recipient_address}</td>
                    <td className="px-4 py-3 font-semibold">{o.weight_kg} kg</td>
                    <td className="px-4 py-3"><span className={"text-xs px-1.5 py-0.5 rounded font-medium " + (o.cargo_type === "valuables" ? "bg-purple-100 text-purple-700" : o.cargo_type === "guarded" ? "bg-amber-100 text-amber-700" : o.cargo_type === "fragile" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}>{o.cargo_type === "valuables" ? "💎 Valores" : o.cargo_type === "guarded" ? "🔒 Resguardo" : o.cargo_type === "fragile" ? "⚠️ Frágil" : "📦 Normal"}</span></td>
                    <td className="px-4 py-3 font-bold text-gray-900">{fmt(o.quoted_price ?? 0)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{trip?.trip_number ?? "Dedicado"}</td>
                    <td className="px-4 py-3"><span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", SHIP_STATUS_COLORS[o.status])}>{SHIP_STATUS[o.status]}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(o.created_at)}</td>
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
