import { Metadata } from 'next'
import SuitePage from '@/components/ui/SuitePage'
import { Bus, CalendarDays, Navigation, Map, Radio, Gauge } from 'lucide-react'

export const metadata: Metadata = { title: 'Operación — MrBus' }

export default function Page() {
  return (
    <SuitePage
      title="Operación"
      subtitle="Gestión integral de viajes, rutas y control en tiempo real"
      color="#15803D"
      lightBg="#DCFCE7"
      icon={Bus}
      modules={[
        {
          name: 'Servicios',
          desc: 'Registro y gestión de todos los servicios de transporte. Alta de viajes, asignación de unidades y operadores.',
          href: '/operacion/servicios',
          icon: Bus,
          status: 'active',
          kpis: ['Alta de viajes', 'Asignación', 'Historial'],
        },
        {
          name: 'Programación',
          desc: 'Agenda de viajes de los próximos 7 días. Visualización por día con estado de cada servicio.',
          href: '/operacion/programacion',
          icon: CalendarDays,
          status: 'active',
          kpis: ['Vista semanal', 'Calendario', 'Alertas'],
        },
        {
          name: 'Tráfico',
          desc: 'Panel de asignación diaria. Operadores disponibles, unidades libres y servicios del día.',
          href: '/operacion/trafico',
          icon: Gauge,
          status: 'active',
          kpis: ['Hoy', 'Operadores', 'Unidades'],
        },
        {
          name: 'Rutas',
          desc: 'Catálogo de rutas guardadas con distancias, tiempos estimados y costos de referencia.',
          href: '/operacion/rutas',
          icon: Map,
          status: 'active',
          kpis: ['Catálogo', 'Km', 'Casetas'],
        },
        {
          name: 'Centro de Control',
          desc: 'Monitor de viajes activos. Estado en tiempo real, incidencias y checklist de salida/llegada.',
          href: '/operacion/control',
          icon: Radio,
          status: 'active',
          kpis: ['GPS', 'Checklist', 'Incidencias'],
        },
      ]}
    />
  )
}
