import { Metadata } from 'next'
import SuitePage from '@/components/ui/SuitePage'
import { UserCircle, Users2, Banknote } from 'lucide-react'

export const metadata: Metadata = { title: 'RRHH — MrBus' }

export default function Page() {
  return (
    <SuitePage
      title="Recursos Humanos"
      subtitle="Gestión de operadores, personal y liquidaciones de nómina"
      color="#BE123C"
      lightBg="#FFE4E6"
      icon={UserCircle}
      modules={[
        {
          name: 'Operadores',
          desc: 'Catálogo de operadores. Licencias, documentos, perfil de costo y historial de servicios.',
          href: '/rrhh/operadores',
          icon: UserCircle,
          status: 'active',
          kpis: ['Catálogo', 'Licencias', 'Historial'],
        },
        {
          name: 'Recursos Humanos',
          desc: 'Gestión del personal administrativo. Contratos, evaluaciones y control de asistencia.',
          href: '/rrhh/rh',
          icon: Users2,
          status: 'active',
          kpis: ['Personal', 'Contratos', 'Asistencia'],
        },
        {
          name: 'Liquidaciones',
          desc: 'Cálculo y registro de liquidaciones de nómina por operador. Descuentos, bonos y comprobantes.',
          href: '/rrhh/liquidaciones',
          icon: Banknote,
          status: 'active',
          kpis: ['Nómina', 'Descuentos', 'Comprobantes'],
        },
      ]}
    />
  )
}
