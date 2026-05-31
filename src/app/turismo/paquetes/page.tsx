import { Metadata } from "next"
export const metadata: Metadata = { title: "Paquetes Turísticos" }
export default function Page() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-xl">🏨</div>
        <div><h1 className="text-2xl font-bold text-sky-900">Paquetes Turísticos</h1><p className="text-gray-400 text-sm">Viajes todo incluido — hotel, guía, entradas</p></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-20 text-gray-400">
        <span className="text-6xl mb-4">🏨</span>
        <p className="text-lg font-semibold text-gray-500">Paquetes Turísticos</p>
        <p className="text-sm mt-2">Módulo en construcción — Fase 2</p>
        <div className="mt-6 bg-sky-50 border border-sky-100 rounded-xl p-4 max-w-md text-center">
          <p className="text-xs text-sky-700">Permitirá crear paquetes que incluyan hospedaje, guías turísticos, entradas a atracciones y transportación, con gestión de costos y márgenes por paquete.</p>
        </div>
      </div>
    </div>
  )
}
