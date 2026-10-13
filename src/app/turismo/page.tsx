import { Metadata } from 'next'
import SuitePage from '@/components/ui/SuitePage'
import { Ticket, QrCode, Package2, Star } from 'lucide-react'

export const metadata: Metadata = { title: 'Turismo — MrBus' }

export default function Page() {
  return (
    <SuitePage
      title="Turismo"
      subtitle="Reservaciones de asientos, abordaje digital y paquetes turísticos"
      color="#0369A1"
      lightBg="#E0F2FE"
      icon={Star}
      modules={[
        {
          name: 'Reservaciones',
          desc: 'Venta de asientos por viaje. Selección de lugar en el autobús, cobro y confirmación automática.',
          href: '/turismo/reservaciones',
          icon: Ticket,
          status: 'active',
          kpis: ['Asientos', 'Cobro', 'Confirmación'],
        },
        {
          name: 'Abordaje',
          desc: 'Control de abordaje digital con QR. Registro de pasajeros al momento de subir al autobús.',
          href: '/turismo/abordaje',
          icon: QrCode,
          status: 'active',
          kpis: ['QR', 'Registro', 'Lista'],
        },
        {
          name: 'Paquetes',
          desc: 'Catálogo de paquetes turísticos con precio, itinerario y disponibilidad de lugares por salida.',
          href: '/turismo/paquetes',
          icon: Package2,
          status: 'active',
          kpis: ['Paquetes', 'Itinerario', 'Disponibilidad'],
        },
      ]}
    />
  )
}
