import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Finanzas' }
export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💰</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
            <p className="text-gray-400 text-sm mt-0.5">6 módulos en esta suite</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>0 disponibles</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>3 en desarrollo</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">💵</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-amber-700 bg-amber-50 border-amber-200">🔨 En desarrollo</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Caja Chica</h3>
          <p className="text-gray-400 text-xs leading-relaxed">Fondos fijos, comprobantes y reposición</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">📈</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-amber-700 bg-amber-50 border-amber-200">🔨 En desarrollo</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">CxC</h3>
          <p className="text-gray-400 text-xs leading-relaxed">Cuentas por cobrar y cobranza</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">📉</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-amber-700 bg-amber-50 border-amber-200">🔨 En desarrollo</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">CxP</h3>
          <p className="text-gray-400 text-xs leading-relaxed">Cuentas por pagar y proveedores</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">🏦</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-gray-500 bg-gray-50 border-gray-200">⏳ Próximamente</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Tesorería</h3>
          <p className="text-gray-400 text-xs leading-relaxed">Bancos, conciliación y flujo de caja</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">📚</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-gray-500 bg-gray-50 border-gray-200">⏳ Próximamente</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Contabilidad</h3>
          <p className="text-gray-400 text-xs leading-relaxed">Catálogo de cuentas, pólizas y balanza</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">🎯</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-gray-500 bg-gray-50 border-gray-200">⏳ Próximamente</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Presupuestos</h3>
          <p className="text-gray-400 text-xs leading-relaxed">Presupuesto anual vs real por área</p>
        </div>
      </div>
    </div>
  )
}
