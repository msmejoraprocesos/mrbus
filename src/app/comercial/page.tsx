import { Metadata } from 'next'
import SuitePage from '@/components/ui/SuitePage'
import { Users, FileText, FileSignature, Briefcase } from 'lucide-react'

export const metadata: Metadata = { title: 'Comercial — MrBus' }

export default function Page() {
  return (
    <SuitePage
      title="Comercial"
      subtitle="Pipeline de ventas, cotizaciones y contratos de servicio"
      color="#1D4ED8"
      lightBg="#DBEAFE"
      icon={Briefcase}
      modules={[
        {
          name: 'CRM',
          desc: 'Pipeline Kanban de leads. Seguimiento de prospectos desde el primer contacto hasta la firma del contrato.',
          href: '/comercial/crm',
          icon: Users,
          status: 'active',
          kpis: ['Pipeline', 'Actividades', 'Conversión'],
        },
        {
          name: 'Cotizaciones',
          desc: 'Motor de cotización con costos reales. Calcula combustible, casetas, operador y overhead automáticamente.',
          href: '/comercial/cotizacion',
          icon: FileText,
          status: 'active',
          kpis: ['Motor de costos', 'Margen', 'PDF'],
        },
        {
          name: 'Contratos',
          desc: 'Generación de contratos desde cotizaciones confirmadas. Seguimiento de firma y activación del servicio.',
          href: '/comercial/contratos',
          icon: FileSignature,
          status: 'active',
          kpis: ['Stepper', 'Firma', 'Activación'],
        },
      ]}
    />
  )
}
