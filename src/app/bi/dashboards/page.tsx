import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { fmt } from "@/lib/utils/index"
import Link from "next/link"
export const metadata: Metadata = { title: "Dashboards Ejecutivos" }
export const dynamic = "force-dynamic"
export default async function Page() {
  const supabase = createClient()
  const thisMonth = new Date().toISOString().slice(0, 7)
  const [{ data: trips }, { data: leads }, { data: quotations }, { data: vehicles }, { data: drivers }, { data: ar }] = await Promise.all([
    supabase.from("trips").select("id,status").gte("departure_date", thisMonth + "-01"),
    supabase.from("leads").select("id,pipeline_stage"),
    supabase.from("quotations").select("id,status,client_price,margin_pct").gte("created_at", thisMonth + "-01"),
    supabase.from("vehicles").select("id,status"),
    supabase.from("drivers").select("id,status"),
    supabase.from("accounts_receivable").select("id,status,amount,paid_amount"),
  ])
  const allTrips = trips ?? []
  const allLeads = leads ?? []
  const allQ = quotations ?? []
  const allVehicles = vehicles ?? []
  const allDrivers = drivers ?? []
  const allAR = ar ?? []
  const pipeline = { lead:0, contacted:0, quoted:0, negotiating:0, confirmed:0, in_operation:0, lost:0 }
  allLeads.forEach((l:any) => { if (pipeline[l.pipeline_stage as keyof typeof pipeline] !== undefined) pipeline[l.pipeline_stage as keyof typeof pipeline]++ })
  const pendingAR = allAR.filter((r:any) => ["pending","partial"].includes(r.status)).reduce((s:number,r:any) => s + ((r.amount ?? 0) - (r.paid_amount ?? 0)), 0)
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">🖥️</div>
        <div><h1 className="text-2xl font-bold text-indigo-900">Dashboard Ejecutivo</h1>
        <p className="text-gray-400 text-sm">Vista C-Level — {new Date().toLocaleDateString("es-MX", { month:"long", year:"numeric" })}</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"Viajes del mes", val:String(allTrips.length), sub:allTrips.filter((t:any) => t.status === "completed").length + " completados", color:"text-blue-700", bg:"bg-blue-50", href:"/operacion/servicios" },
          { label:"Pipeline activo", val:String(allLeads.filter((l:any) => !["lost"].includes(l.pipeline_stage)).length), sub:pipeline.confirmed + " confirmados", color:"text-green-700", bg:"bg-green-50", href:"/comercial/crm" },
          { label:"Cotizaciones mes", val:String(allQ.length), sub:"$ " + fmt(allQ.reduce((s:number,q:any) => s + (q.client_price ?? 0), 0)), color:"text-indigo-700", bg:"bg-indigo-50", href:"/comercial/cotizacion/list" },
          { label:"Por cobrar", val:fmt(pendingAR), sub:allAR.filter((r:any) => r.status === "overdue").length + " vencidos", color:"text-amber-700", bg:"bg-amber-50", href:"/finanzas/cxc" },
        ].map(s => (
          <Link key={s.label} href={s.href} className={"block rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all " + s.bg}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{s.label}</p>
            <p className={"text-3xl font-bold " + s.color}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Pipeline de ventas</h2>
          <div className="space-y-3">
            {[
              { stage:"Lead", count:pipeline.lead, color:"bg-gray-400" },
              { stage:"Contactado", count:pipeline.contacted, color:"bg-blue-400" },
              { stage:"Cotizado", count:pipeline.quoted, color:"bg-amber-400" },
              { stage:"Negociando", count:pipeline.negotiating, color:"bg-purple-400" },
              { stage:"Confirmado", count:pipeline.confirmed, color:"bg-green-500" },
              { stage:"En operación", count:pipeline.in_operation, color:"bg-emerald-500" },
            ].map(s => {
              const total = allLeads.filter((l:any) => l.pipeline_stage !== "lost").length
              const pct = total > 0 ? Math.round(s.count / total * 100) : 0
              return (
                <div key={s.stage} className="flex items-center gap-3">
                  <p className="text-sm text-gray-600 w-28">{s.stage}</p>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div className={"h-3 rounded-full " + s.color} style={{ width: pct + "%" }} />
                  </div>
                  <p className="text-xs font-bold text-gray-700 w-12 text-right">{s.count}</p>
                </div>
              )
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Estado de la flotilla</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label:"Activas", val:allVehicles.filter((v:any) => v.status === "active").length, color:"text-green-700", bg:"bg-green-50" },
              { label:"En mantenimiento", val:allVehicles.filter((v:any) => v.status === "maintenance").length, color:"text-amber-700", bg:"bg-amber-50" },
              { label:"Operadores activos", val:allDrivers.filter((d:any) => d.status === "active").length, color:"text-blue-700", bg:"bg-blue-50" },
              { label:"Operadores inactivos", val:allDrivers.filter((d:any) => d.status === "inactive").length, color:"text-gray-500", bg:"bg-gray-50" },
            ].map(s => (
              <div key={s.label} className={"rounded-xl p-3 text-center " + s.bg}>
                <p className={"text-2xl font-bold " + s.color}>{s.val}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/operacion/trafico" className="btn-secondary text-xs">Ver estado en tiempo real →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
