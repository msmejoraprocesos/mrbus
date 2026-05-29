import { Metadata } from 'next'
import { UserCircle, Plus } from 'lucide-react'
export const metadata: Metadata = { title: 'Operadores' }
export default function DriversPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Operadores</h1>
        <button className="btn-primary"><Plus className="w-4 h-4" />Agregar operador</button>
      </div>
      <div className="card flex flex-col items-center py-16 text-gray-400">
        <UserCircle className="w-12 h-12 mb-3 opacity-30" />
        <p className="font-medium">Módulo de operadores</p>
        <p className="text-sm mt-1">Próximamente disponible</p>
      </div>
    </div>
  )
}
