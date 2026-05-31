import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Finanzas' }
export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: '#CCFBF1' }}>
            💰
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#134E4A' }}>Finanzas</h1>
            <p className="text-gray-400 text-sm mt-0.5">6 módulos en esta suite</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>3 disponibles
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block"></span>3 próximamente
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a href="/finanzas/cxc" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#CCFBF1', borderColor: '#99F6E4' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>📈</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#134E4A' }}>Cuentas por Cobrar</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#134E4A', opacity: 0.6 }}>Saldos pendientes de clientes</p>
        </a>
        <a href="/finanzas/cxp" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#CCFBF1', borderColor: '#99F6E4' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>📉</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#134E4A' }}>Cuentas por Pagar</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#134E4A', opacity: 0.6 }}>Facturas de proveedores y gastos</p>
        </a>
        <a href="/finanzas/caja" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#CCFBF1', borderColor: '#99F6E4' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>💵</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#134E4A' }}>Caja Chica</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#134E4A', opacity: 0.6 }}>Fondos fijos y movimientos</p>
        </a>
        <div className="rounded-xl border p-5 opacity-60" style={{ backgroundColor: '#CCFBF1', borderColor: '#99F6E4' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white' }}>🏦</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-gray-400 bg-gray-50 border-gray-100">⏳ Próximamente</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#134E4A' }}>Tesorería</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#134E4A', opacity: 0.6 }}>Bancos, conciliación y flujo de caja</p>
        </div>
        <div className="rounded-xl border p-5 opacity-60" style={{ backgroundColor: '#CCFBF1', borderColor: '#99F6E4' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white' }}>📚</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-gray-400 bg-gray-50 border-gray-100">⏳ Próximamente</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#134E4A' }}>Contabilidad</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#134E4A', opacity: 0.6 }}>Pólizas, balanza y estados financieros</p>
        </div>
        <div className="rounded-xl border p-5 opacity-60" style={{ backgroundColor: '#CCFBF1', borderColor: '#99F6E4' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white' }}>🎯</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-gray-400 bg-gray-50 border-gray-100">⏳ Próximamente</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#134E4A' }}>Presupuestos</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#134E4A', opacity: 0.6 }}>Presupuesto anual vs real por área</p>
        </div>
      </div>
    </div>
  )
}
