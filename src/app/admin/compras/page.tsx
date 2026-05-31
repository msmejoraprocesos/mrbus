import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmt, fmtDate, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Compras" }
export const dynamic = "force-dynamic"
const STATUS: Record<string,string> = { pending:"Pendiente", partial:"Parcial", paid:"Pagado", cancelled:"Cancelado" }
const STATUS_C: Record<string,string> = { pending:"bg-amber-100 text-amber-700", partial:"bg-blue-100 text-blue-700", paid:"bg-green-100 text-green-700", cancelled:"bg-gray-100 text-gray-400" }
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("accounts_payable")
    .select("*").order("created_at", { ascending: false })
  const purchases = data ?? []
  const byCategory = purchases.reduce((acc:Record<string,number>, p:any) => {
    acc[p.category] = (acc[p.category] ?? 0) + (p.amount ?? 0)
    return acc
  }, {})
  const topCats = Object.entries(byCategory).sort(([,a],[,b]) => (b as number) - (a as number)).slice(0, 4)
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl">🛒</div>
        <div><h1 className="text-2xl font-bold text-gray-900">Compras</h1>
        <p className="text-gray-400 text-sm">{purchases.length} órdenes de compra registradas</p></div>
      </div>
      {topCats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {topCats.map(([cat, total]) => (
            <div key={cat} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500 font-medium capitalize">{cat}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{fmt(total as number)}</p>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-gray-50">
              {["Proveedor","Concepto","Categoría","Monto","Pagado","Saldo","Vence","Estado"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {purchases.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Sin órdenes de compra</td></tr>
              ) : purchases.map((p:any) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.supplier_name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.concept}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">{p.category}</span></td>
                  <td className="px-4 py-3 font-semibold">{fmt(p.amount)}</td>
                  <td className="px-4 py-3 text-green-600">{fmt(p.paid_amount ?? 0)}</td>
                  <td className="px-4 py-3 font-bold text-red-500">{fmt((p.amount ?? 0) - (p.paid_amount ?? 0))}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(p.due_date)}</td>
                  <td className="px-4 py-3"><span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", STATUS_C[p.status])}>{STATUS[p.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
