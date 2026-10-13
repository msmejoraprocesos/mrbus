import { Metadata } from 'next'
import SuitePage from '@/components/ui/SuitePage'
import { Bus, Fuel, Wrench, Circle } from 'lucide-react'

export const metadata: Metadata = { title: 'Flota — MrBus' }

export default function Page() {
  return (
    <SuitePage
      title="Flota"
      subtitle="Gestión de unidades, combustible, mantenimiento y llantas"
      color="#7C3AED"
      lightBg="#EDE9FE"
      icon={Wrench}
      modules={[
        {
          name: 'Unidades',
          desc: 'Catálogo de autobuses y camionetas. Documentos, seguros, placas y perfil de costos por unidad.',
          href: '/flota/unidades',
          icon: Bus,
          status: 'active',
          kpis: ['Catálogo', 'Documentos', 'Costos'],
        },
        {
          name: 'Combustible',
          desc: 'Registro de cargas de combustible. Historial por unidad, rendimiento km/litro y alertas de consumo.',
          href: '/flota/combustible',
          icon: Fuel,
          status: 'active',
          kpis: ['Cargas', 'Rendimiento', 'Alertas'],
        },
        {
          name: 'Mantenimiento',
          desc: 'Órdenes de mantenimiento preventivo y correctivo. Historial por unidad y programación de servicios.',
          href: '/flota/mantenimiento',
          icon: Wrench,
          status: 'active',
          kpis: ['Preventivo', 'Correctivo', 'Historial'],
        },
        {
          name: 'Llantas',
          desc: 'Control de inventario de llantas. Asignación por unidad, desgaste y reemplazos programados.',
          href: '/flota/llantas',
          icon: Circle,
          status: 'active',
          kpis: ['Inventario', 'Asignación', 'Desgaste'],
        },
      ]}
    />
  )
}
