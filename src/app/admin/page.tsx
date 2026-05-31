import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Administración' }
export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: '#F1F5F9' }}>
            🏢
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>Administración</h1>
            <p className="text-gray-400 text-sm mt-0.5">4 módulos en esta suite</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>0 disponibles
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>2 en desarrollo
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group"
          style={{ backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: '#F1F5F9' }}>
              🏗️
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-amber-700 bg-amber-50 border-amber-200">🔨 En desarrollo</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#1F2937' }}>Activo Fijo</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#1F2937', opacity: 0.6 }}>Unidades y equipo con depreciación</p>
        </div>
        <div className="rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group"
          style={{ backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: '#F1F5F9' }}>
              🛒
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-amber-700 bg-amber-50 border-amber-200">🔨 En desarrollo</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#1F2937' }}>Compras</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#1F2937', opacity: 0.6 }}>Órdenes de compra y proveedores</p>
        </div>
        <div className="rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group"
          style={{ backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: '#F1F5F9' }}>
              🏭
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-gray-400 bg-gray-50 border-gray-100">⏳ Próximamente</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#1F2937' }}>Almacenes</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#1F2937', opacity: 0.6 }}>Ubicaciones físicas de inventario</p>
        </div>
        <div className="rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group"
          style={{ backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: '#F1F5F9' }}>
              📦
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-gray-400 bg-gray-50 border-gray-100">⏳ Próximamente</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#1F2937' }}>Inventarios</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#1F2937', opacity: 0.6 }}>Refacciones, consumibles y movimientos</p>
        </div>
      </div>
    </div>
  )
}
