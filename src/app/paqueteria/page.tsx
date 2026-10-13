import { Metadata } from 'next'
import SuitePage from '@/components/ui/SuitePage'
import { Package, Truck, Archive } from 'lucide-react'

export const metadata: Metadata = { title: 'Paquetería — MrBus' }

export default function Page() {
  return (
    <SuitePage
      title="Paquetería"
      subtitle="Guías, recolección, entrega y consolidación de envíos"
      color="#475569"
      lightBg="#F1F5F9"
      icon={Package}
      modules={[
        {
          name: 'Guías',
          desc: 'Generación y seguimiento de guías de envío. Folio único, remitente, destinatario y estatus en tiempo real.',
          href: '/paqueteria/guias',
          icon: Package,
          status: 'active',
          kpis: ['Folio', 'Estatus', 'Trazabilidad'],
        },
        {
          name: 'Recolección y Entrega',
          desc: 'Control de rutas de recolección y entrega. Asignación de operador, evidencia fotográfica y firma digital.',
          href: '/paqueteria/entregas',
          icon: Truck,
          status: 'active',
          kpis: ['Recolección', 'Entrega', 'Evidencia'],
        },
        {
          name: 'Consolidación',
          desc: 'Agrupación de paquetes por ruta o destino. Manifiestos de carga y control de bultos por viaje.',
          href: '/paqueteria/consolidacion',
          icon: Archive,
          status: 'soon',
        },
      ]}
    />
  )
}
