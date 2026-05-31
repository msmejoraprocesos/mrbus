import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmt, fmtPct } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Rentabilidad" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("quotations")
    .select("id,service_type,client_price,margin_pct,cost_breakdown,status,created_at")
    .eq("status", "approved").order("created_at", { ascending: false })
  const quotations = data ?? []
  const totalRevenue = quotations.reduce((s:number,q:any) => s + (q.client_price ?? 0), 0)
  const totalCost = quotations.reduce((s:number,q:any) => s + ((q.cost_breakdown as any)?.total_cost ?? 0), 0)
  const totalProfit = totalRevenue - totalCost
  const avgMargin = quotations.length > 0 ? quotations.reduce((s:number,q:any) => s + (q.margin_pct ?? 0), 0) / quotations.length : 0
  const byType = quotations.reduce((acc:Record<string,{count:number,revenue:number,cost:number}>, q:any) => {
    const t = q.service_type ?? "other"
    if (!acc[t]) acc[t] = { count:0, revenue:0, cost:0 }
    acc[t].count++
    acc[t].revenue += q.client_price ?? 0
    acc[t].cost += (q.cost_breakdown as any)?.total_cost ?? 0
    return acc
  }, {})
  const SERVICE_L: Record<string,string> = { tourism_b2b:"🌴 Turismo B2B", agency_b2c:"🎫 Agencia B2C", personnel:"🏭 Personal", rental:"🚌 Renta", executive:"✈️ Ejecutivo", parcel_in_trip:"📦 Paquetería en viaje", parcel_dedicated:"📦 Paquetería dedicada" }
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">💹</div>
        <div><h1 className="text-2xl font-bold text-indigo-900">Análisis de Rentabilidad</h1>
        <p className="text-gray-400 text-sm">{quotations.length} cotizaciones aprobadas</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"Ingresos totales", val:fmt(totalRevenue), bg:"bg-green-50", tc:"text-green-700" },
          { label:"Costos totales", val:fmt(totalCost), bg:"bg-red-50", tc:"text-red-600" },
          { label:"Utilidad bruta", val:fmt(totalProfit), bg:"bg-teal-50", tc:"text-teal-700" },
          { label:"Margen promedio", val:fmtPct(avgMargin), bg:"bg-indigo-50", tc:"text-indigo-700" },
        ].map(s => (
          <div key={s.label} className={"rounded-xl border border-gray-100 shadow-sm p-4 " + s.bg}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={"text-2xl font-bold mt-1 " + s.tc}>{s.val}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Rentabilidad por tipo de servicio</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b">
              {["Servicio","Cotizaciones","Ingreso total","Costo total","Utilidad","Margen"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(byType).sort(([,a],[,b]) => (b as any).revenue - (a as any).revenue).map(([type, data]) => {
                const d = data as any
                const margin = d.revenue > 0 ? (d.revenue - d.cost) / d.revenue * 100 : 0
                return (
                  <tr key={type} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{SERVICE_L[type] ?? type}</td>
                    <td className="px-4 py-3 font-bold text-gray-700">{d.count}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{fmt(d.revenue)}</td>
                    <td className="px-4 py-3 text-red-500">{fmt(d.cost)}</td>
                    <td className="px-4 py-3 font-bold text-teal-700">{fmt(d.revenue - d.cost)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-2"><div className={"h-2 rounded-full " + (margin >= 30 ? "bg-green-500" : margin >= 20 ? "bg-amber-500" : "bg-red-500")} style={{ width: Math.min(margin, 100) + "%" }} /></div>
                        <span className={"text-xs font-bold " + (margin >= 30 ? "text-green-700" : margin >= 20 ? "text-amber-700" : "text-red-600")}>{fmtPct(margin)}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {Object.keys(byType).length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin cotizaciones aprobadas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
