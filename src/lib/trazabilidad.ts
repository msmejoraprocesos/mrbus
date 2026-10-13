/**
 * lib/trazabilidad.ts
 * Sistema central de trazabilidad e integridad de datos — MrBus
 *
 * PRINCIPIOS:
 * 1. Cada operación crítica registra audit_trail
 * 2. Los cambios incluyen ANTES y DESPUÉS del dato
 * 3. Se registra usuario, módulo, tabla, folio y timestamp
 * 4. Validaciones de negocio antes de persistir
 */

import { createClient } from '@/lib/supabase/client'
import { auditLog, getNextFolio } from '@/lib/audit'

// ─── Tipos de integridad ──────────────────────────────────────────────────────
export type IntegrityError = {
  field: string
  message: string
  hint?: string
}

export type IntegrityResult = {
  valid: boolean
  errors: IntegrityError[]
}

// ─── Validaciones de negocio ──────────────────────────────────────────────────

/** Valida que un monto es positivo y razonable */
export function validateAmount(
  amount: number,
  field = 'monto',
  max = 9999999
): IntegrityResult {
  const errors: IntegrityError[] = []
  if (isNaN(amount) || amount <= 0) {
    errors.push({
      field,
      message: `${field} debe ser mayor a $0`,
      hint: 'Ingresa un valor numérico positivo',
    })
  }
  if (amount > max) {
    errors.push({
      field,
      message: `${field} excede el máximo permitido ($${max.toLocaleString()})`,
      hint: 'Verifica el monto antes de continuar',
    })
  }
  return { valid: errors.length === 0, errors }
}

/** Valida que una fecha no sea futura */
export function validateDateNotFuture(
  date: string,
  field = 'fecha'
): IntegrityResult {
  const errors: IntegrityError[] = []
  if (!date) {
    errors.push({ field, message: 'La fecha es requerida' })
    return { valid: false, errors }
  }
  if (new Date(date) > new Date()) {
    errors.push({
      field,
      message: `${field} no puede ser futura`,
      hint: 'Usa la fecha actual o anterior',
    })
  }
  return { valid: errors.length === 0, errors }
}

/** Valida que un folio no exista ya en la tabla */
export async function validateFolioUnico(
  tabla: string,
  folio: string,
  excludeId?: string
): Promise<IntegrityResult> {
  const sb = createClient()
  let q = sb.from(tabla).select('id').eq('folio', folio)
  if (excludeId) q = q.neq('id', excludeId)
  const { data } = await q.limit(1)
  if (data && data.length > 0) {
    return {
      valid: false,
      errors: [
        {
          field: 'folio',
          message: `El folio ${folio} ya existe en ${tabla}`,
          hint: 'El sistema generará un folio único automáticamente',
        },
      ],
    }
  }
  return { valid: true, errors: [] }
}

/** Valida stock suficiente de una parte/refacción */
export async function validateStockDisponible(
  itemId: string,
  cantidad: number,
  itemName: string
): Promise<IntegrityResult> {
  const sb = createClient()
  const { data: inv } = await sb
    .from('inventory_items')
    .select('stock_actual')
    .eq('id', itemId)
    .single()

  const disponible = inv?.stock_actual || 0
  if (disponible < cantidad) {
    return {
      valid: false,
      errors: [
        {
          field: itemName,
          message: `Stock insuficiente para "${itemName}": disponible ${disponible}, solicitado ${cantidad}`,
          hint: 'Genera una requisición de compra para reabastecer',
        },
      ],
    }
  }
  return { valid: true, errors: [] }
}

/** Valida que un período contable esté abierto */
export async function validatePeriodoAbierto(
  fecha: string
): Promise<IntegrityResult> {
  const sb = createClient()
  const mes = fecha.slice(0, 7)
  const { data } = await sb
    .from('accounting_periods')
    .select('status')
    .eq('name', mes)
    .single()

  if (data?.status === 'closed') {
    return {
      valid: false,
      errors: [
        {
          field: 'fecha',
          message: `El período ${mes} está cerrado`,
          hint: 'No se pueden registrar operaciones en períodos cerrados.',
        },
      ],
    }
  }
  return { valid: true, errors: [] }
}

// ─── Trazabilidad de operaciones críticas ─────────────────────────────────────

/** Traza un viaje/servicio */
export async function trazarViaje(params: {
  trip_id: string
  folio: string
  tipo: string
  operador?: string
  unidad?: string
  total: number
  user_id: string
}) {
  await auditLog({
    action: 'INSERT',
    module: 'operacion',
    table_name: 'trips',
    record_id: params.trip_id,
    record_folio: params.folio,
    after_data: {
      tipo: params.tipo,
      operador: params.operador,
      unidad: params.unidad,
      total: params.total,
    },
    user_id: params.user_id,
  })
}

/** Traza una liquidación de operador */
export async function trazarLiquidacion(params: {
  liquidacion_id: string
  folio: string
  operador_id: string
  operador_nombre: string
  periodo: string
  total_bruto: number
  total_deducciones: number
  total_neto: number
  viajes_count: number
  user_id: string
}) {
  await auditLog({
    action: 'INSERT',
    module: 'rrhh',
    table_name: 'payroll_settlements',
    record_id: params.liquidacion_id,
    record_folio: params.folio,
    after_data: {
      operador: params.operador_nombre,
      periodo: params.periodo,
      viajes: params.viajes_count,
      bruto: params.total_bruto,
      deducciones: params.total_deducciones,
      neto: params.total_neto,
    },
    user_id: params.user_id,
  })
}

/** Traza un pago de liquidación */
export async function trazarPagoLiquidacion(params: {
  liquidacion_id: string
  folio: string
  operador_nombre: string
  monto_antes: number
  monto_pagado: number
  monto_despues: number
  metodo: string
  user_id: string
}) {
  await auditLog({
    action: 'APPROVE',
    module: 'rrhh',
    table_name: 'payroll_settlements',
    record_id: params.liquidacion_id,
    record_folio: params.folio,
    before_data: { balance: params.monto_antes, operador: params.operador_nombre },
    after_data: {
      pagado: params.monto_pagado,
      balance_nuevo: params.monto_despues,
      metodo: params.metodo,
    },
    user_id: params.user_id,
  })
}

/** Traza un movimiento de inventario de almacén */
export async function trazarMovimientoInventario(params: {
  tipo: 'entrada' | 'salida' | 'ajuste' | 'traspaso'
  item_id: string
  item_nombre: string
  cantidad_antes: number
  cantidad_despues: number
  motivo: string
  user_id: string
  reference_id?: string
  reference_folio?: string
}) {
  await auditLog({
    action: params.tipo === 'entrada' ? 'INSERT' : 'UPDATE',
    module: 'almacenes',
    table_name: 'inventory_items',
    record_id: params.reference_id,
    record_folio: params.reference_folio || `INV-${params.item_nombre}`,
    before_data: { quantity: params.cantidad_antes, item: params.item_nombre },
    after_data: {
      quantity: params.cantidad_despues,
      item: params.item_nombre,
      motivo: params.motivo,
    },
    user_id: params.user_id,
  })
}

/** Traza una orden de compra */
export async function trazarOrdenCompra(params: {
  tipo: 'requisicion' | 'orden_compra' | 'recepcion'
  record_id: string
  folio: string
  proveedor?: string
  total: number
  items_count: number
  user_id: string
}) {
  await auditLog({
    action: 'INSERT',
    module: 'compras',
    table_name:
      params.tipo === 'requisicion' ? 'purchase_requests' : 'purchase_orders',
    record_id: params.record_id,
    record_folio: params.folio,
    after_data: {
      proveedor: params.proveedor || '—',
      total: params.total,
      items: params.items_count,
    },
    user_id: params.user_id,
  })
}

/** Traza un pago CXP */
export async function trazarPago(params: {
  tipo: 'cxp' | 'cxc'
  record_id: string
  folio: string
  entidad: string
  monto_antes: number
  monto_pagado: number
  monto_despues: number
  metodo: string
  user_id: string
}) {
  await auditLog({
    action: 'APPROVE',
    module: params.tipo,
    table_name:
      params.tipo === 'cxp' ? 'vendor_payments' : 'accounts_receivable',
    record_id: params.record_id,
    record_folio: params.folio,
    before_data: { balance: params.monto_antes, entidad: params.entidad },
    after_data: {
      pagado: params.monto_pagado,
      balance_nuevo: params.monto_despues,
      metodo: params.metodo,
    },
    user_id: params.user_id,
  })
}

/** Traza exportación de datos */
export async function trazarExportacion(params: {
  modulo: string
  formato: 'excel' | 'pdf' | 'csv'
  registros: number
  user_id: string
}) {
  await auditLog({
    action: 'EXPORT',
    module: params.modulo,
    table_name: params.modulo,
    after_data: {
      formato: params.formato,
      registros: params.registros,
      timestamp: new Date().toISOString(),
    },
    user_id: params.user_id,
  })
}

/** Traza login/logout */
export async function trazarAcceso(params: {
  action: 'LOGIN' | 'LOGOUT'
  user_id: string
  email: string
}) {
  await auditLog({
    action: params.action,
    module: 'auth',
    table_name: 'profiles',
    record_id: params.user_id,
    after_data: { email: params.email, timestamp: new Date().toISOString() },
    user_id: params.user_id,
  })
}

// ─── Utilidades de datos ──────────────────────────────────────────────────────

/** Normaliza un número de teléfono a formato MX */
export function normalizarTelefono(tel: string): string {
  const digits = tel.replace(/\D/g, '')
  if (digits.length === 10) return `+52${digits}`
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`
  return tel.trim()
}

/** Capitaliza nombre propio */
export function capitalizarNombre(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

/** Sanitiza texto para prevenir XSS/injection */
export function sanitizarTexto(text: string, maxLen = 500): string {
  return text
    .trim()
    .slice(0, maxLen)
    .replace(/<[^>]*>/g, '')
}

/** Redondea a 2 decimales para evitar floating point issues */
export function redondearMonto(amount: number): number {
  return Math.round(amount * 100) / 100
}

// Re-export for convenience
export { auditLog, getNextFolio }
