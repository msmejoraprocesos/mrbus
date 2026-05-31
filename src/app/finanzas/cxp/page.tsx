import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmt, fmtDate, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Cuentas por Pagar" }
export const dynamic = "force-dynamic"
const STATUS: Record<string,string> = { pending:"Pendiente", partial:"Parcial", paid:"Pagado", cancelled:"Cancelado" }
const STATUS_C: Record<string,string> = { pending:"bg-amber-100 text-amber-700", partial:"bg-blue-100 text-blue-700", paid:"bg-green-100 text-green-700", cancelled:"bg-gray-100 text-gray-400" }
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("accounts_payable")
    .select("*, vehicle:vehicles(plate)")
    .order("due_date")
  const records = data ?? []
  const pending = records.filter((r:any) => ["pending","partial"].includes(r.status))
  const totalPending = pending.reduce((s:number,r:any) => s + ((r.amount ?? 0) - (r.paid_amount ?? 0)), 0)
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-xl">📉</div>
        <div><h1 className="text-2xl font-bold text-teal-900">Cuentas por Pagar</h1>
        <p className="text-gray-400 text-sm">{records.length} facturas de proveedores</p></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:"Por pagar", val:fmt(totalPending), bg:"bg-red-50", tc:"text-red-700" },
          { label:"Facturas pendientes", val:String(pending.length), bg:"bg-amber-50", tc:"text-amber-700" },
          { label:"Proveedores activos", val:String(new Set(records.map((r:any) => r.supplier_name)).size), bg:"bg-gray-50", tc:"text-gray-700" },
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
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-teal-50">
              {["Proveedor","Concepto","Categoría","Unidad","Monto","Saldo","Vence","Estado"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {records.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Sin cuentas por pagar</td></tr>
              ) : records.map((r:any) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{r.supplier_name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.concept}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{r.category}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-purple-600">{r.vehicle?.plate ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{fmt(r.amount)}</td>
                  <td className="px-4 py-3 font-bold text-red-600">{fmt((r.amount ?? 0) - (r.paid_amount ?? 0))}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.due_date)}</td>
                  <td className="px-4 py-3"><span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", STATUS_C[r.status])}>{STATUS[r.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
