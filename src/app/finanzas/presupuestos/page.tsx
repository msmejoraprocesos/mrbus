import { Metadata } from "next"
export const metadata: Metadata = { title: "Presupuestos" }
export default function Page() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-xl">🎯</div>
        <div><h1 className="text-2xl font-bold text-teal-900">Presupuestos</h1><p className="text-gray-400 text-sm">Módulo en construcción</p></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-20 text-gray-400">
        <span className="text-6xl mb-4">🎯</span>
        <p className="text-lg font-semibold text-gray-500">Presupuestos</p>
        <p className="text-sm mt-2">Este módulo estará disponible próximamente</p>
        <div className="mt-6 bg-teal-50 border border-teal-100 rounded-xl p-4 max-w-sm text-center">
          <p className="text-xs text-teal-700">La estructura de base de datos ya está lista.<br/>La interfaz se construirá en la siguiente fase.</p>
        </div>
      </div>
    </div>
  )
}
