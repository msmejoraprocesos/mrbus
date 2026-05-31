import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmt, fmtDate } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Caja Chica" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const [{ data: funds }, { data: movs }] = await Promise.all([
    supabase.from("petty_cash").select("*, custodian:users(full_name)"),
    supabase.from("petty_cash_movements").select("*, petty_cash:petty_cash(fund_name)").order("movement_date", { ascending: false }).limit(50),
  ])
  const pcFunds = funds ?? []
  const pcMovs = movs ?? []
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-xl">💵</div>
        <h1 className="text-2xl font-bold text-teal-900">Caja Chica</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pcFunds.map((f:any) => (
          <div key={f.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-900">{f.fund_name}</p>
              <span className={"text-xs px-2 py-0.5 rounded-full font-semibold " + (f.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>{f.status === "active" ? "Activa" : "Reponiendo"}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Fondo inicial</p>
                <p className="font-bold text-gray-900">{fmt(f.initial_amount)}</p>
              </div>
              <div className={"rounded-lg p-3 text-center " + (f.current_balance < f.initial_amount * 0.2 ? "bg-red-50" : "bg-green-50")}>
                <p className="text-xs text-gray-400">Saldo actual</p>
                <p className={"font-bold " + (f.current_balance < f.initial_amount * 0.2 ? "text-red-600" : "text-green-700")}>{fmt(f.current_balance)}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={"h-2 rounded-full " + (f.current_balance / f.initial_amount < 0.2 ? "bg-red-500" : "bg-green-500")} style={{ width: Math.round(f.current_balance / f.initial_amount * 100) + "%" }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{Math.round(f.current_balance / f.initial_amount * 100)}% disponible</p>
            </div>
          </div>
        ))}
        {pcFunds.length === 0 && <div className="col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-12 text-gray-400"><span className="text-5xl mb-3">💵</span><p>Sin fondos de caja chica</p></div>}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-teal-50"><h2 className="font-semibold text-teal-900">Últimos movimientos</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b">
              {["Fecha","Fondo","Concepto","Tipo","Monto"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {pcMovs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin movimientos</td></tr>
              ) : pcMovs.map((m:any) => (
                <tr key={m.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(m.movement_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{m.petty_cash?.fund_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-900">{m.concept}</td>
                  <td className="px-4 py-3"><span className={"text-xs px-2 py-0.5 rounded-full font-semibold " + (m.movement_type === "expense" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700")}>{m.movement_type === "expense" ? "Gasto" : "Reposición"}</span></td>
                  <td className={"px-4 py-3 font-bold " + (m.movement_type === "expense" ? "text-red-600" : "text-green-700")}>{m.movement_type === "expense" ? "-" : "+"}{fmt(m.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
