import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmt, fmtDate, fmtN } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Activo Fijo" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("vehicles")
    .select("*, cost_profile:vehicle_cost_profiles(purchase_value, useful_life_years, residual_value)")
    .order("year", { ascending: false })
  const vehicles = data ?? []
  const totalValue = vehicles.reduce((s:number,v:any) => {
    const p = Array.isArray(v.cost_profile) ? v.cost_profile[0] : v.cost_profile
    return s + (p?.purchase_value ?? 0)
  }, 0)
  const currentYear = new Date().getFullYear()
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl">🏗️</div>
        <div><h1 className="text-2xl font-bold text-gray-900">Activo Fijo</h1>
        <p className="text-gray-400 text-sm">{vehicles.length} unidades registradas · Valor total: {fmt(totalValue)}</p></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-gray-50">
              {["Unidad","Marca/Modelo","Año","Valor compra","Vida útil","Valor residual","Depreciación anual","Años transcurridos","Valor actual est."].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {vehicles.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Sin activos registrados</td></tr>
              ) : vehicles.map((v:any) => {
                const p = Array.isArray(v.cost_profile) ? v.cost_profile[0] : v.cost_profile
                const purchase = p?.purchase_value ?? 0
                const life = p?.useful_life_years ?? 10
                const residual = p?.residual_value ?? 0
                const deprAnual = life > 0 ? (purchase - residual) / life : 0
                const yearsOld = v.year ? currentYear - v.year : 0
                const currentValue = Math.max(residual, purchase - (deprAnual * yearsOld))
                const deprPct = purchase > 0 ? ((purchase - currentValue) / purchase * 100) : 0
                return (
                  <tr key={v.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3"><p className="font-mono font-bold text-gray-700">{v.plate}</p><p className="text-xs text-gray-400">{v.economic_number}</p></td>
                    <td className="px-4 py-3 text-gray-700">{v.brand} {v.model}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{v.year ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{purchase > 0 ? fmt(purchase) : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{life} años</td>
                    <td className="px-4 py-3 text-gray-500">{residual > 0 ? fmt(residual) : "—"}</td>
                    <td className="px-4 py-3 text-red-500">{deprAnual > 0 ? fmt(deprAnual) + "/año" : "—"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{yearsOld > 0 ? yearsOld + " años" : "—"}</td>
                    <td className="px-4 py-3">
                      {purchase > 0 ? (
                        <div>
                          <p className="font-bold text-green-700">{fmt(currentValue)}</p>
                          <p className="text-xs text-red-400">{fmtN(deprPct, 0)}% depreciado</p>
                        </div>
                      ) : "—"}
                    </td>
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
