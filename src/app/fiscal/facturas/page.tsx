import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import Link from "next/link"
import { fmt, fmtDate, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Facturación Electrónica" }
export const dynamic = "force-dynamic"
const CFDI_S: Record<string,string> = { draft:"Borrador", stamped:"Timbrada", cancelled:"Cancelada", substituted:"Sustituida" }
const CFDI_C: Record<string,string> = { draft:"bg-gray-100 text-gray-600", stamped:"bg-green-100 text-green-700", cancelled:"bg-red-100 text-red-700", substituted:"bg-amber-100 text-amber-700" }
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("invoices")
    .select("*, trip:trips(trip_number)")
    .order("created_at", { ascending: false })
  const invoices = data ?? []
  const stamped = invoices.filter((i:any) => i.cfdi_status === "stamped")
  const totalStamped = stamped.reduce((s:number,i:any) => s + (i.total ?? 0), 0)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl">🧾</div>
          <div><h1 className="text-2xl font-bold text-orange-900">Facturación Electrónica — CFDI 4.0</h1>
          <p className="text-gray-400 text-sm">{invoices.length} facturas registradas</p></div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"Timbradas", val:String(stamped.length), bg:"bg-green-50", tc:"text-green-700" },
          { label:"Total facturado", val:fmt(totalStamped), bg:"bg-teal-50", tc:"text-teal-700" },
          { label:"Borradores", val:String(invoices.filter((i:any) => i.cfdi_status === "draft").length), bg:"bg-gray-50", tc:"text-gray-700" },
          { label:"Canceladas", val:String(invoices.filter((i:any) => i.cfdi_status === "cancelled").length), bg:"bg-red-50", tc:"text-red-600" },
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
              {["No. Factura","Cliente","RFC","Subtotal","IVA","Total","UUID SAT","Estado","Fecha"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400"><span className="text-4xl block mb-2">🧾</span>Sin facturas registradas</td></tr>
              ) : invoices.map((inv:any) => (
                <tr key={inv.id} className="hover:bg-gray-50/50 group">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{inv.invoice_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{inv.client_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.client_rfc}</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(inv.subtotal)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(inv.tax_amount)}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{fmt(inv.total)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-[120px] truncate">{inv.cfdi_uuid ?? "—"}</td>
                  <td className="px-4 py-3"><span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", CFDI_C[inv.cfdi_status])}>{CFDI_S[inv.cfdi_status]}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(inv.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
