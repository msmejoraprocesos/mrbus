import { Metadata } from 'next'
import SuitePage from '@/components/ui/SuitePage'
import { BarChart3, TrendingUp, LayoutDashboard, Bell } from 'lucide-react'

export const metadata: Metadata = { title: 'Inteligencia — MrBus' }

export default function Page() {
  return (
    <SuitePage
      title="Inteligencia de Negocio"
      subtitle="KPIs operativos, rentabilidad por ruta y alertas automáticas"
      color="#4338CA"
      lightBg="#E0E7FF"
      icon={BarChart3}
      modules={[
        {
          name: 'KPIs',
          desc: 'Indicadores clave en tiempo real. Ocupación, ingresos, km recorridos y cumplimiento de servicios.',
          href: '/bi/kpi',
          icon: BarChart3,
          status: 'active',
          kpis: ['Tiempo real', 'Ocupación', 'Ingresos'],
        },
        {
          name: 'Rentabilidad',
          desc: 'Análisis de rentabilidad por ruta, cliente y tipo de servicio. Comparativo por período.',
          href: '/bi/rentabilidad',
          icon: TrendingUp,
          status: 'active',
          kpis: ['Por ruta', 'Por cliente', 'Comparativo'],
        },
        {
          name: 'Dashboards',
          desc: 'Tableros ejecutivos personalizables. Resumen gerencial con los indicadores más importantes.',
          href: '/bi/dashboards',
          icon: LayoutDashboard,
          status: 'active',
          kpis: ['Gerencial', 'Operativo', 'Comercial'],
        },
        {
          name: 'Alertas',
          desc: 'Sistema de alertas por umbrales. Documentos por vencer, servicios sin asignar y pagos vencidos.',
          href: '/bi/alertas',
          icon: Bell,
          status: 'active',
          kpis: ['Documentos', 'Servicios', 'Pagos'],
        },
      ]}
    />
  )
}
