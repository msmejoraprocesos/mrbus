import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { fmtDate, DOC_STATUS, DOC_STATUS_COLORS, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Operadores" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("drivers")
    .select("*, docs:driver_documents(*), cost:driver_cost_profiles(*)")
    .order("last_name")
  const drivers = data ?? []
  const active = drivers.filter((d:any) => d.status === "active").length
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">👤</div>
          <div><h1 className="text-2xl font-bold text-red-900">Operadores</h1>
          <p className="text-gray-400 text-sm">{active} activos de {drivers.length} registrados</p></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {drivers.map((d:any) => {
          const docs = d.docs ?? []
          const expired = docs.filter((x:any) => x.status === "expired").length
          const expiring = docs.filter((x:any) => x.status === "expiring_soon").length
          const license = docs.find((x:any) => x.doc_type === "license")
          return (
            <Link key={d.id} href={"/rrhh/operadores/" + d.id}
              className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-700">
                  {(d.first_name?.[0] ?? "") + (d.last_name?.[0] ?? "")}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{d.first_name} {d.last_name}</p>
                  <p className="text-xs text-gray-400">{d.employee_number ?? "Sin número"}</p>
                </div>
                <span className={"ml-auto text-xs px-2 py-0.5 rounded-full font-semibold " + (d.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                  {d.status === "active" ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                <div><span className="text-gray-400">Licencia:</span> <span className="font-medium">{d.license_type ?? "—"}</span></div>
                <div><span className="text-gray-400">Vence:</span> <span className="font-medium">{license ? fmtDate(license.expiry_date) : "—"}</span></div>
                <div><span className="text-gray-400">Tel:</span> <span className="font-medium">{d.phone ?? "—"}</span></div>
                <div><span className="text-gray-400">Docs:</span> <span className="font-medium">{docs.length} registrados</span></div>
              </div>
              {(expired > 0 || expiring > 0) && (
                <div className={"text-xs px-2 py-1 rounded-lg " + (expired > 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>
                  {expired > 0 ? "⚠️ " + expired + " doc(s) vencido(s)" : "⏰ " + expiring + " doc(s) por vencer"}
                </div>
              )}
            </Link>
          )
        })}
        {drivers.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-16 text-gray-400">
            <span className="text-5xl mb-3">👤</span>
            <p>No hay operadores registrados</p>
          </div>
        )}
      </div>
    </div>
  )
}
