import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Turismo' }
export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌴</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Turismo</h1>
            <p className="text-gray-400 text-sm mt-0.5">3 módulos en esta suite</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>1 disponibles</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>1 en desarrollo</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">🎫</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-amber-700 bg-amber-50 border-amber-200">🔨 En desarrollo</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Reservaciones</h3>
          <p className="text-gray-400 text-xs leading-relaxed">Venta de asientos individuales</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">✅</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Abordaje</h3>
          <p className="text-gray-400 text-xs leading-relaxed">Check-in de pasajeros en viaje</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">🏨</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-gray-500 bg-gray-50 border-gray-200">⏳ Próximamente</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Paquetes Turísticos</h3>
          <p className="text-gray-400 text-xs leading-relaxed">Viajes con hotel, guía y entradas</p>
        </div>
      </div>
    </div>
  )
}
