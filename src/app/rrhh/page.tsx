import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Recursos Humanos' }
export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: '#FFE4E6' }}>
            👤
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#9F1239' }}>Recursos Humanos</h1>
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
        <a href="/rrhh/operadores" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#FFE4E6', borderColor: '#FECDD3' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>👤</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#9F1239' }}>Operadores</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#9F1239', opacity: 0.6 }}>Expedientes, licencias y documentos</p>
        </a>
        <a href="/rrhh/rh" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#FFE4E6', borderColor: '#FECDD3' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>👥</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#9F1239' }}>RH General</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#9F1239', opacity: 0.6 }}>Gestión de personal — nómina y IMSS</p>
        </a>
        <a href="/rrhh/liquidaciones" className="block rounded-xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group" style={{ backgroundColor: '#FFE4E6', borderColor: '#FECDD3' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>💵</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-green-700 bg-green-50 border-green-200">✅ Disponible</span>
          </div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#9F1239' }}>Liquidaciones</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#9F1239', opacity: 0.6 }}>Cálculo de pago por viaje al operador</p>
        </a>
      </div>
    </div>
  )
}
