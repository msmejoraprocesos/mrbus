import { Metadata } from 'next'
import SuitePage from '@/components/ui/SuitePage'
import { FileText, Truck, Receipt } from 'lucide-react'

export const metadata: Metadata = { title: 'Fiscal — MrBus' }

export default function Page() {
  return (
    <SuitePage
      title="Fiscal"
      subtitle="Facturación CFDI y Carta Porte para el SAT"
      color="#C2410C"
      lightBg="#FFEDD5"
      icon={Receipt}
      modules={[
        {
          name: 'Facturación CFDI',
          desc: 'Emisión de facturas electrónicas CFDI 4.0. Timbrado automático al completar un servicio.',
          href: '/fiscal/facturas',
          icon: FileText,
          status: 'active',
          kpis: ['CFDI 4.0', 'Timbrado', 'Cancelación'],
        },
        {
          name: 'Carta Porte',
          desc: 'Complemento Carta Porte 3.0 para el transporte de mercancías. Requerido por el SAT desde 2022.',
          href: '/fiscal/cartaporte',
          icon: Truck,
          status: 'active',
          kpis: ['Complemento', 'SAT', 'Operadores'],
        },
      ]}
    />
  )
}
