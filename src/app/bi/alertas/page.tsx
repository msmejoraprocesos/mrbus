'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from "@/lib/supabase/client"
import { fmtDate } from "@/lib/utils/index"

export default function Page() {
  const [vehDocs, setVehDocs] = useState<any[]>([])
  const [drvDocs, setDrvDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const today = new Date()
    const in30 = new Date(today); in30.setDate(today.getDate() + 30)
    const [{ data: vd }, { data: dd }] = await Promise.all([
      supabase.from("vehicle_documents").select("*, vehicle:vehicles(plate)").lte("expiry_date", in30.toISOString().split("T")[0]).neq("status", "expired").order("expiry_date"),
      supabase.from("driver_documents").select("*, driver:drivers(first_name,last_name)").lte("expiry_date", in30.toISOString().split("T")[0]).order("expiry_date"),
    ])
    setVehDocs(vd ?? [])
    setDrvDocs(dd ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date()
  const allVehDocs = vehDocs
  const allDrvDocs = drvDocs
  const criticalCount = [...allVehDocs, ...allDrvDocs].filter((d: any) => {
    const days = Math.ceil((new Date(d.expiry_date).getTime() - today.getTime()) / 86400000)
    return days <= 7
  }).length

  if (loading) return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Cargando alertas...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">🔔</div>
        <div><h1 className="text-2xl font-bold text-indigo-900">Alertas Inteligentes</h1>
        <p className="text-gray-400 text-sm">{criticalCount > 0 ? criticalCount + " alertas críticas que requieren atención inmediata" : "Sin alertas críticas"}</p></div>
      </div>
      {criticalCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div><p className="font-semibold text-red-800">{criticalCount} documento(s) vencen en los próximos 7 días</p>
          <p className="text-xs text-red-600 mt-0.5">Revisar y renovar para evitar bloqueos operativos</p></div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-orange-50 flex items-center justify-between">
            <h2 className="font-semibold text-orange-900">📋 Documentos de flotilla por vencer</h2>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">{allVehDocs.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {allVehDocs.length === 0 ? <p className="px-5 py-8 text-center text-gray-400 text-sm">✅ Sin documentos próximos a vencer</p>
            : allVehDocs.map((d:any) => {
              const daysLeft = Math.ceil((new Date(d.expiry_date).getTime() - today.getTime()) / 86400000)
              const vehicle = Array.isArray(d.vehicle) ? d.vehicle[0] : d.vehicle
              return (
                <div key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{d.doc_name}</p>
                    <p className="text-xs text-gray-400">{vehicle?.plate ?? "—"} · Vence: {fmtDate(d.expiry_date)}</p>
                  </div>
                  <span className={"text-xs px-2 py-0.5 rounded-full font-bold " + (daysLeft <= 7 ? "bg-red-100 text-red-700" : daysLeft <= 15 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                    {daysLeft <= 0 ? "VENCIDO" : daysLeft + " días"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-red-50 flex items-center justify-between">
            <h2 className="font-semibold text-red-900">👤 Documentos de operadores por vencer</h2>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{allDrvDocs.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {allDrvDocs.length === 0 ? <p className="px-5 py-8 text-center text-gray-400 text-sm">✅ Sin documentos próximos a vencer</p>
            : allDrvDocs.map((d:any) => {
              const daysLeft = Math.ceil((new Date(d.expiry_date).getTime() - today.getTime()) / 86400000)
              const driver = Array.isArray(d.driver) ? d.driver[0] : d.driver
              const DOC_L: Record<string,string> = { license:"Licencia", medical_exam:"Examen médico", drug_test:"Examen antidoping", sct_badge:"Gafete SCT" }
              return (
                <div key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{DOC_L[d.doc_type] ?? d.doc_name}</p>
                    <p className="text-xs text-gray-400">{driver ? driver.first_name + " " + driver.last_name : "—"} · Vence: {fmtDate(d.expiry_date)}</p>
                  </div>
                  <span className={"text-xs px-2 py-0.5 rounded-full font-bold " + (daysLeft <= 7 ? "bg-red-100 text-red-700" : daysLeft <= 15 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                    {daysLeft <= 0 ? "VENCIDO" : daysLeft + " días"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
