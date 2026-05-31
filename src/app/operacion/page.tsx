import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Operación' }
export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: '#DCFCE7' }}>
            🚌
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#166534' }}>Operación</h1>
            <p className="text-gray-400 text-sm mt-0.5">5 módulos en esta suite</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>2 disponibles
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>2 en desarrollo
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group"
          style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: '#DCFCE7' }}>
              🚌
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#166534' }}>Servicios</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#166534', opacity: 0.6 }}>Programación y gestión de viajes</p>
        </div>
        <div className="rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group"
          style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: '#DCFCE7' }}>
              📅
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#166534' }}>Programación</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#166534', opacity: 0.6 }}>Agenda y calendario operativo</p>
        </div>
        <div className="rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group"
          style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: '#DCFCE7' }}>
              🎯
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-amber-700 bg-amber-50 border-amber-200">🔨 En desarrollo</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#166534' }}>Tráfico</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#166534', opacity: 0.6 }}>Asignación de unidades y operadores</p>
        </div>
        <div className="rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group"
          style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: '#DCFCE7' }}>
              🗺️
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-amber-700 bg-amber-50 border-amber-200">🔨 En desarrollo</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#166534' }}>Rutas</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#166534', opacity: 0.6 }}>Catálogo de rutas, km y casetas</p>
        </div>
        <div className="rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group"
          style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: '#DCFCE7' }}>
              📡
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-gray-400 bg-gray-50 border-gray-100">⏳ Próximamente</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#166534' }}>Centro de Control</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#166534', opacity: 0.6 }}>Monitor GPS en tiempo real</p>
        </div>
      </div>
    </div>
  )
}
