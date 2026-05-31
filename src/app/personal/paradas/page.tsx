import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
export const metadata: Metadata = { title: "Control de Paradas" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("agreement_routes")
    .select("*, agreement:service_agreements(client_name), employees:agreement_employees(id,employee_name,stop_name,is_active)")
    .order("route_name")
  const routes = data ?? []
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">📍</div>
        <div><h1 className="text-2xl font-bold text-green-900">Control de Paradas</h1>
        <p className="text-gray-400 text-sm">{routes.length} rutas activas con paradas</p></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {routes.map((r:any) => {
          const employees = r.employees ?? []
          const activeEmp = employees.filter((e:any) => e.is_active)
          const stops = r.stops as any[] ?? []
          const agree = Array.isArray(r.agreement) ? r.agreement[0] : r.agreement
          return (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">{r.route_name}</p>
                  <p className="text-xs text-gray-400">{agree?.client_name ?? "—"} · {r.departure_time} · Turno {r.shift}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{activeEmp.length} emp.</span>
              </div>
              {stops.length > 0 && (
                <div className="mb-3 space-y-1">
                  {stops.slice(0, 4).map((s:any, i:number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center flex-shrink-0">{s.order ?? i+1}</div>
                      <span className="text-gray-700">{s.name}</span>
                      {s.time && <span className="text-gray-400">{s.time}</span>}
                    </div>
                  ))}
                  {stops.length > 4 && <p className="text-xs text-gray-400 pl-7">+{stops.length - 4} paradas más</p>}
                </div>
              )}
              <div className="border-t border-gray-100 pt-2">
                <p className="text-xs text-gray-400 font-medium mb-1">Empleados asignados ({activeEmp.length})</p>
                <div className="flex flex-wrap gap-1">
                  {activeEmp.slice(0, 5).map((e:any) => (
                    <span key={e.id} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{e.employee_name}</span>
                  ))}
                  {activeEmp.length > 5 && <span className="text-xs text-gray-400">+{activeEmp.length - 5} más</span>}
                </div>
              </div>
            </div>
          )
        })}
        {routes.length === 0 && (
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-16 text-gray-400">
            <span className="text-5xl mb-3">📍</span>
            <p>Las paradas se definen en los convenios de personal</p>
          </div>
        )}
      </div>
    </div>
  )
}
