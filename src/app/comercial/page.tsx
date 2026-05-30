import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Comercial' }
export default function Page() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-3xl">💼</span>
        <h1 className="text-2xl font-bold text-gray-900">Comercial</h1>
      </div>
      <div className="card flex flex-col items-center py-16 text-gray-400">
        <span className="text-5xl mb-4">💼</span>
        <p className="font-medium text-lg text-gray-600">Suite Comercial</p>
        <p className="text-sm mt-2">Módulos en desarrollo — próximamente disponible</p>
      </div>
    </div>
  )
}
