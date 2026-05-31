import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { fmtDate, cn } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Rutas de Personal" }
export const dynamic = "force-dynamic"
const AGREE_S: Record<string,string> = { draft:"Borrador", active:"Activo", paused:"Pausado", expired:"Vencido", cancelled:"Cancelado" }
const AGREE_C: Record<string,string> = { draft:"bg-gray-100 text-gray-600", active:"bg-green-100 text-green-700", paused:"bg-amber-100 text-amber-700", expired:"bg-red-100 text-red-700", cancelled:"bg-gray-100 text-gray-400" }
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("service_agreements")
    .select("*, routes:agreement_routes(id), employees:agreement_employees(id,is_active)")
    .order("created_at", { ascending: false })
  const agreements = data ?? []
  const active = agreements.filter((a:any) => a.status === "active").length
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">🏭</div>
          <div><h1 className="text-2xl font-bold text-green-900">Convenios de Transporte de Personal</h1>
          <p className="text-gray-400 text-sm">{active} activos de {agreements.length} convenios</p></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agreements.map((a:any) => {
          const routes = a.routes ?? []
          const employees = a.employees ?? []
          const activeEmp = employees.filter((e:any) => e.is_active).length
          return (
            <Link key={a.id} href={"/personal/rutas/" + a.id}
              className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">{a.client_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.billing_scheme === "fixed_route" ? "Ruta fija mensual" : a.billing_scheme === "per_seat" ? "Por asiento" : "Mixto"}</p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", AGREE_C[a.status])}>{AGREE_S[a.status]}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400">Rutas</p><p className="font-bold text-gray-900">{routes.length}</p></div>
                <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400">Empleados</p><p className="font-bold text-gray-900">{activeEmp}</p></div>
                <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400">Días op.</p><p className="font-bold text-gray-900 text-xs">{Object.values(a.operation_days ?? {}).filter(Boolean).length}d</p></div>
              </div>
              <div className="text-xs text-gray-400">
                Vigencia: {fmtDate(a.valid_from)} — {fmtDate(a.valid_until)}
                {a.auto_renew && <span className="ml-2 bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Auto-renueva</span>}
              </div>
            </Link>
          )
        })}
        {agreements.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-16 text-gray-400">
            <span className="text-5xl mb-3">🏭</span>
            <p>No hay convenios de personal</p>
            <p className="text-xs mt-1">Los convenios se generan desde una cotización de tipo Personal</p>
          </div>
        )}
      </div>
    </div>
  )
}
