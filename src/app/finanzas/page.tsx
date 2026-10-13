import { Metadata } from 'next'
import SuitePage from '@/components/ui/SuitePage'
import { TrendingUp, TrendingDown, Wallet, LineChart, BookOpen, PieChart } from 'lucide-react'

export const metadata: Metadata = { title: 'Finanzas — MrBus' }

export default function Page() {
  return (
    <SuitePage
      title="Finanzas"
      subtitle="Control financiero: cobros, pagos, caja y análisis de rentabilidad"
      color="#0F766E"
      lightBg="#CCFBF1"
      icon={LineChart}
      modules={[
        {
          name: 'Cuentas por Cobrar',
          desc: 'Registro y seguimiento de facturas y cobros pendientes. Semáforo de vencimiento y abonos parciales.',
          href: '/finanzas/cxc',
          icon: TrendingUp,
          status: 'active',
          kpis: ['Facturas', 'Vencimiento', 'Abonos'],
        },
        {
          name: 'Cuentas por Pagar',
          desc: 'Control de obligaciones con proveedores. Fechas límite, programación de pagos y conciliación.',
          href: '/finanzas/cxp',
          icon: TrendingDown,
          status: 'active',
          kpis: ['Proveedores', 'Vencimientos', 'Pagos'],
        },
        {
          name: 'Caja Chica',
          desc: 'Registro de gastos menores. Apertura de caja, movimientos y corte de caja diario.',
          href: '/finanzas/caja',
          icon: Wallet,
          status: 'active',
          kpis: ['Apertura', 'Gastos', 'Corte'],
        },
        {
          name: 'Tesorería',
          desc: 'Posición de efectivo por cuenta bancaria. Flujo del día y proyección de los próximos 30 días.',
          href: '/finanzas/tesoreria',
          icon: LineChart,
          status: 'beta',
          kpis: ['Cuentas', 'Flujo', 'Proyección'],
        },
        {
          name: 'Contabilidad',
          desc: 'Registro contable de operaciones. Pólizas, catálogo de cuentas y estados financieros básicos.',
          href: '/finanzas/contabilidad',
          icon: BookOpen,
          status: 'soon',
        },
        {
          name: 'Presupuestos',
          desc: 'Presupuesto mensual vs real. Desviaciones por área y alertas de sobre-ejercicio.',
          href: '/finanzas/presupuestos',
          icon: PieChart,
          status: 'soon',
        },
      ]}
    />
  )
}
