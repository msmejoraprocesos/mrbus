import { Metadata } from 'next'
import SuitePage from '@/components/ui/SuitePage'
import { CalendarClock, Gauge, FileCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'Renta de Vehículos — MrBus' }

export default function Page() {
  return (
    <SuitePage
      title="Renta de Vehículos"
      subtitle="Servicios eventuales y control de horas y kilómetros por contrato"
      color="#C2410C"
      lightBg="#FFEDD5"
      icon={CalendarClock}
      modules={[
        {
          name: 'Servicios Eventuales',
          desc: 'Registro de rentas puntuales de autobuses y camionetas. Contrato, operador asignado y condiciones de servicio.',
          href: '/renta/servicios',
          icon: FileCheck,
          status: 'active',
          kpis: ['Contratos', 'Operador', 'Condiciones'],
        },
        {
          name: 'Control Horas / Km',
          desc: 'Seguimiento de horas y kilómetros por contrato. Excedentes facturables y reporte de liquidación.',
          href: '/renta/control',
          icon: Gauge,
          status: 'active',
          kpis: ['Horas', 'Kilómetros', 'Excedentes'],
        },
      ]}
    />
  )
}
