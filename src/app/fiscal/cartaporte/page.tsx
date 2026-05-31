import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmt, fmtDate, SHIP_STATUS, SHIP_STATUS_COLORS, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Carta Porte" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("shipping_orders")
    .select("*, trip:trips(trip_number)")
    .not("carta_porte_uuid", "is", null)
    .order("created_at", { ascending: false })
  const orders = data ?? []
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl">📋</div>
        <div>
          <h1 className="text-2xl font-bold text-orange-900">Complemento Carta Porte</h1>
          <p className="text-gray-400 text-sm">Obligatorio para transporte de mercancías — NOM SAT</p>
        </div>
      </div>
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-orange-800 mb-1">⚠️ Requisito fiscal obligatorio desde 2022</p>
        <p className="text-xs text-orange-700">Todo traslado de mercancías por carretera requiere el complemento Carta Porte en el CFDI. Sin él, el transportista y el cliente pueden ser sujetos de multa por el SAT.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:"Con Carta Porte", val:String(orders.length), bg:"bg-green-50", tc:"text-green-700" },
          { label:"Pendientes de timbrar", val:String(orders.filter((o:any) => o.status !== "delivered").length), bg:"bg-amber-50", tc:"text-amber-700" },
          { label:"Total carga (kg)", val:orders.reduce((s:number,o:any) => s + (o.weight_kg ?? 0), 0).toLocaleString(), bg:"bg-gray-50", tc:"text-gray-700" },
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
              {["Guía","Remitente","Destinatario","Peso","Tipo","UUID Carta Porte","Estado"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400"><span className="text-4xl block mb-2">📋</span>Sin complementos Carta Porte registrados<br/><span className="text-xs mt-1 block">Los complementos se generan desde las órdenes de paquetería</span></td></tr>
              ) : orders.map((o:any) => (
                <tr key={o.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{o.order_number}</td>
                  <td className="px-4 py-3 text-gray-900">{o.sender_name}</td>
                  <td className="px-4 py-3 text-gray-600">{o.recipient_name}</td>
                  <td className="px-4 py-3 font-semibold">{o.weight_kg} kg</td>
                  <td className="px-4 py-3 text-xs"><span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{o.cargo_type}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-[160px] truncate">{o.carta_porte_uuid}</td>
                  <td className="px-4 py-3"><span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", SHIP_STATUS_COLORS[o.status])}>{SHIP_STATUS[o.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
