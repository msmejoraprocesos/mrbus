import { Metadata } from 'next'
import { Settings } from 'lucide-react'
export const metadata: Metadata = { title: 'Configuración' }
export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
      <div className="card flex flex-col items-center py-16 text-gray-400">
        <Settings className="w-12 h-12 mb-3 opacity-30" />
        <p className="font-medium">Próximamente disponible</p>
      </div>
    </div>
  )
}
