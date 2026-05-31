import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Turismo' }
export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: '#E0F2FE' }}>
            🌴
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0C4A6E' }}>Turismo</h1>
            <p className="text-gray-400 text-sm mt-0.5">3 módulos en esta suite</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>2 disponibles
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block"></span>1 próximamente
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a href="/turismo/reservaciones" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>🎫</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#0C4A6E' }}>Reservaciones</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#0C4A6E', opacity: 0.6 }}>Venta de asientos — Agencia B2C</p>
        </a>
        <a href="/turismo/abordaje" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>✅</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#0C4A6E' }}>Abordaje</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#0C4A6E', opacity: 0.6 }}>Check-in de pasajeros en viaje</p>
        </a>
        <div className="rounded-xl border p-5 opacity-60" style={{ backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white' }}>🏨</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-gray-400 bg-gray-50 border-gray-100">⏳ Próximamente</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#0C4A6E' }}>Paquetes Turísticos</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#0C4A6E', opacity: 0.6 }}>Viajes todo incluido con hotel y guía</p>
        </div>
      </div>
    </div>
  )
}
