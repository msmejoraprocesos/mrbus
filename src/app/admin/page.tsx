import { Metadata } from 'next'
import SuitePage from '@/components/ui/SuitePage'
import { Monitor, ShoppingCart, Warehouse, Box, Boxes } from 'lucide-react'

export const metadata: Metadata = { title: 'Administración — MrBus' }

export default function Page() {
  return (
    <SuitePage
      title="Administración"
      subtitle="Activo fijo, compras, almacenes e inventarios"
      color="#374151"
      lightBg="#F3F4F6"
      icon={Boxes}
      modules={[
        {
          name: 'Activo Fijo',
          desc: 'Registro y depreciación de activos. Seguimiento de valor en libros y vida útil restante.',
          href: '/admin/activos',
          icon: Monitor,
          status: 'active',
          kpis: ['Depreciación', 'Valor libro', 'Vida útil'],
        },
        {
          name: 'Compras',
          desc: 'Órdenes de compra a proveedores. Aprobación, recepción y conciliación con cuentas por pagar.',
          href: '/admin/compras',
          icon: ShoppingCart,
          status: 'active',
          kpis: ['OC', 'Aprobación', 'Recepción'],
        },
        {
          name: 'Almacenes',
          desc: 'Control de almacenes de refacciones y materiales. Entradas, salidas y stock mínimo.',
          href: '/admin/almacenes',
          icon: Warehouse,
          status: 'active',
          kpis: ['Almacenes', 'Bitácora', 'Transferencia'],
        },
        {
          name: 'Inventarios',
          desc: 'Control de refacciones, consumibles y herramientas. Semáforo de stock mínimo y máximo.',
          href: '/admin/inventarios',
          icon: Box,
          status: 'active',
          kpis: ['Stock', 'Semáforo', 'Ubicación'],
        },
      ]}
    />
  )
}
