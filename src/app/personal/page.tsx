import { Metadata } from 'next'
import SuitePage from '@/components/ui/SuitePage'
import { MapPin, Navigation, Clock, Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Transporte Personal — MrBus' }

export default function Page() {
  return (
    <SuitePage
      title="Transporte Personal"
      subtitle="Gestión de rutas fijas, paradas y asistencia de pasajeros"
      color="#0369A1"
      lightBg="#E0F2FE"
      icon={Users}
      modules={[
        {
          name: 'Rutas',
          desc: 'Definición de rutas fijas de transporte personal. Origen, destino, paradas intermedias y horarios.',
          href: '/personal/rutas',
          icon: MapPin,
          status: 'active',
          kpis: ['Origen', 'Destino', 'Horarios'],
        },
        {
          name: 'Control de Paradas',
          desc: 'Gestión de paradas por ruta. Coordenadas GPS, tiempo estimado de llegada y pasajeros asignados.',
          href: '/personal/paradas',
          icon: Navigation,
          status: 'active',
          kpis: ['GPS', 'Paradas', 'Pasajeros'],
        },
        {
          name: 'Asistencia',
          desc: 'Registro de asistencia de pasajeros por servicio. Abordajes, inasistencias y reportes por período.',
          href: '/personal/asistencia',
          icon: Clock,
          status: 'beta',
          kpis: ['Abordajes', 'Inasistencias', 'Reportes'],
        },
      ]}
    />
  )
}
