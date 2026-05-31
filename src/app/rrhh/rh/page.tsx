import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmtDate } from "@/lib/utils/index"
export const metadata: Metadata = { title: "Recursos Humanos" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from("drivers").select("*").order("last_name")
  const drivers = data ?? []
  const active = drivers.filter((d:any) => d.status === "active").length
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">👥</div>
        <div><h1 className="text-2xl font-bold text-red-900">Recursos Humanos</h1>
        <p className="text-gray-400 text-sm">Gestión de personal operativo</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"Personal activo", val:active, bg:"bg-green-50", tc:"text-green-700" },
          { label:"Total registrados", val:drivers.length, bg:"bg-gray-50", tc:"text-gray-700" },
          { label:"Con IMSS", val:drivers.filter((d:any)=>d.imss_number).length, bg:"bg-blue-50", tc:"text-blue-700" },
          { label:"Inactivos", val:drivers.filter((d:any)=>d.status==="inactive").length, bg:"bg-red-50", tc:"text-red-600" },
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
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-red-50">
              {["Nombre","No. Empleado","IMSS","Licencia","Teléfono","Fecha alta","Estado"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {drivers.map((d:any) => (
                <tr key={d.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{d.first_name} {d.last_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.employee_number ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{d.imss_number ?? "—"}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{d.license_type ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{d.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(d.hire_date)}</td>
                  <td className="px-4 py-3"><span className={"text-xs px-2 py-0.5 rounded-full font-semibold " + (d.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>{d.status === "active" ? "Activo" : "Inactivo"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
