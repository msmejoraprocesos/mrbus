import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmt, fmtDate, AR_STATUS, AR_STATUS_COLORS, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Cuentas por Cobrar" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("accounts_receivable")
    .select("*, trip:trips(trip_number), contract:contracts(contract_number)")
    .order("due_date")
  const records = data ?? []
  const pending = records.filter((r:any) => ["pending","partial"].includes(r.status))
  const overdue = records.filter((r:any) => r.status === "overdue")
  const totalPending = pending.reduce((s:number,r:any) => s + ((r.amount ?? 0) - (r.paid_amount ?? 0)), 0)
  const totalOverdue = overdue.reduce((s:number,r:any) => s + ((r.amount ?? 0) - (r.paid_amount ?? 0)), 0)
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-xl">📈</div>
        <div><h1 className="text-2xl font-bold text-teal-900">Cuentas por Cobrar</h1>
        <p className="text-gray-400 text-sm">{records.length} registros</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"Por cobrar", val:fmt(totalPending), bg:"bg-amber-50", tc:"text-amber-700" },
          { label:"Vencido", val:fmt(totalOverdue), bg:"bg-red-50", tc:"text-red-700" },
          { label:"Cobros pendientes", val:String(pending.length), bg:"bg-blue-50", tc:"text-blue-700" },
          { label:"Vencidos", val:String(overdue.length), bg:"bg-red-50", tc:"text-red-600" },
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
              {["No. Documento","Cliente","Tipo","Monto","Cobrado","Saldo","Vence","Estado"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {records.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Sin cuentas por cobrar</td></tr>
              ) : records.map((r:any) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.document_number ?? r.id.slice(0,8)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.client_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.document_type === "invoice" ? "Factura" : r.document_type === "advance" ? "Anticipo" : r.document_type}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{fmt(r.amount)}</td>
                  <td className="px-4 py-3 text-green-600">{fmt(r.paid_amount ?? 0)}</td>
                  <td className="px-4 py-3 font-bold text-amber-600">{fmt((r.amount ?? 0) - (r.paid_amount ?? 0))}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.due_date)}</td>
                  <td className="px-4 py-3"><span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", AR_STATUS_COLORS[r.status])}>{AR_STATUS[r.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
