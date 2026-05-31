import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Flota' }
export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: '#EDE9FE' }}>
            🔧
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#5B21B6' }}>Flota</h1>
            <p className="text-gray-400 text-sm mt-0.5">4 módulos en esta suite</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>4 disponibles
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block"></span>0 próximamente
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a href="/flota/unidades" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#EDE9FE', borderColor: '#E9D5FF' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>🚌</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#5B21B6' }}>Unidades</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#5B21B6', opacity: 0.6 }}>Catálogo con perfil de costos y documentos</p>
        </a>
        <a href="/flota/combustible" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#EDE9FE', borderColor: '#E9D5FF' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>⛽</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#5B21B6' }}>Combustible</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#5B21B6', opacity: 0.6 }}>Cargas, rendimiento y gasto por unidad</p>
        </a>
        <a href="/flota/mantenimiento" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#EDE9FE', borderColor: '#E9D5FF' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>🔧</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#5B21B6' }}>Mantenimiento</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#5B21B6', opacity: 0.6 }}>Preventivo, correctivo y órdenes de trabajo</p>
        </a>
        <a href="/flota/llantas" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#EDE9FE', borderColor: '#E9D5FF' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>⚙️</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#5B21B6' }}>Llantas</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#5B21B6', opacity: 0.6 }}>Inventario por posición y vida útil</p>
        </a>
      </div>
    </div>
  )
}
