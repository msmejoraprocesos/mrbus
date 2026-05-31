import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Paquetería' }
export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📦</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paquetería</h1>
            <p className="text-gray-400 text-sm mt-0.5">3 módulos en esta suite</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>0 disponibles</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>2 en desarrollo</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">📄</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-amber-700 bg-amber-50 border-amber-200">🔨 En desarrollo</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Guías</h3>
          <p className="text-gray-400 text-xs leading-relaxed">Folio, remitente, destinatario, Carta Porte</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">🚚</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-amber-700 bg-amber-50 border-amber-200">🔨 En desarrollo</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Recolección y Entrega</h3>
          <p className="text-gray-400 text-xs leading-relaxed">Firma digital, foto y seguimiento GPS</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">📦</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-gray-500 bg-gray-50 border-gray-200">⏳ Próximamente</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Consolidación</h3>
          <p className="text-gray-400 text-xs leading-relaxed">Juntar múltiples paquetes en un viaje</p>
        </div>
      </div>
    </div>
  )
}
