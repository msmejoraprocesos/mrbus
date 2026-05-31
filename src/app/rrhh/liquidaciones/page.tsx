import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmt, fmtDate, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Liquidaciones" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("driver_settlements")
    .select("*, driver:drivers(first_name,last_name)")
    .order("created_at", { ascending: false })
  const settlements = data ?? []
  const STATUS: Record<string,string> = { draft:"Borrador", approved:"Aprobada", paid:"Pagada" }
  const STATUS_C: Record<string,string> = { draft:"bg-gray-100 text-gray-600", approved:"bg-blue-100 text-blue-700", paid:"bg-green-100 text-green-700" }
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">💵</div>
        <div><h1 className="text-2xl font-bold text-red-900">Liquidaciones de Operadores</h1>
        <p className="text-gray-400 text-sm">{settlements.length} registros</p></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-red-50">
              {["Operador","Período","Viajes","Bruto","Deducciones","Anticipos","Neto","Estado"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {settlements.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Sin liquidaciones registradas</td></tr>
              ) : settlements.map((s:any) => {
                const deds = (s.deductions as any[] ?? []).reduce((acc:number, d:any) => acc + (d.amount ?? 0), 0)
                return (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.driver ? s.driver.first_name + " " + s.driver.last_name : "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(s.period_start)} — {fmtDate(s.period_end)}</td>
                    <td className="px-4 py-3 font-semibold">{s.trips_count}</td>
                    <td className="px-4 py-3 text-gray-700">{fmt(s.gross_amount)}</td>
                    <td className="px-4 py-3 text-red-500">{deds > 0 ? "-" + fmt(deds) : "—"}</td>
                    <td className="px-4 py-3 text-amber-600">{s.advances > 0 ? "-" + fmt(s.advances) : "—"}</td>
                    <td className="px-4 py-3 font-bold text-green-700">{fmt(s.net_amount)}</td>
                    <td className="px-4 py-3"><span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", STATUS_C[s.status])}>{STATUS[s.status]}</span></td>
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
