import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Paquetería' }
export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: '#F1F5F9' }}>
            📦
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#334155' }}>Paquetería</h1>
            <p className="text-gray-400 text-sm mt-0.5">3 módulos en esta suite</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>3 disponibles
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block"></span>0 próximamente
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a href="/paqueteria/guias" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>📄</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#334155' }}>Guías</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#334155', opacity: 0.6 }}>Registro de envíos con Carta Porte</p>
        </a>
        <a href="/paqueteria/entregas" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>🚚</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#334155' }}>Recolección y Entrega</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#334155', opacity: 0.6 }}>Trazabilidad con foto y firma digital</p>
        </a>
        <a href="/paqueteria/consolidacion" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>📦</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#334155' }}>Consolidación</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#334155', opacity: 0.6 }}>Asignar paquetes a viajes activos</p>
        </a>
      </div>
    </div>
  )
}
