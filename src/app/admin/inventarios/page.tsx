import { Metadata } from "next"
export const metadata: Metadata = { title: "Inventarios" }
export default function Page() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl">📦</div>
        <div><h1 className="text-2xl font-bold text-gray-900">Inventarios</h1><p className="text-gray-400 text-sm">Control de refacciones, consumibles y herramientas</p></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-20 text-gray-400">
        <span className="text-6xl mb-4">📦</span>
        <p className="text-lg font-semibold text-gray-500">Inventarios</p>
        <p className="text-sm mt-2">Módulo en construcción — Fase 2</p>
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 max-w-md text-center">
          <p className="text-xs text-gray-600">Control de refacciones, consumibles y herramientas. La base de datos está lista y esperando la interfaz.</p>
        </div>
      </div>
    </div>
  )
}
