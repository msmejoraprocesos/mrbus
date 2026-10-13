/**
 * lib/audit.ts
 * Auditoría completa — registra ANTES/DESPUÉS de cada cambio
 * con usuario, módulo, tabla, folio y timestamp
 */

import { createClient } from '@/lib/supabase/client'

export type AuditAction =
  | 'INSERT' | 'UPDATE' | 'DELETE'
  | 'APPROVE' | 'REJECT' | 'CANCEL'
  | 'LOGIN' | 'LOGOUT'
  | 'OPEN' | 'CLOSE' | 'EXPORT'

export async function auditLog(params: {
  action: AuditAction
  module: string
  table_name?: string
  record_id?: string
  record_folio?: string
  before_data?: Record<string, unknown>
  after_data?: Record<string, unknown>
  company_id?: string | null
  user_id?: string
  user_name?: string
}) {
  try {
    const sb = createClient()

    // Calcular diff si hay before y after
    let changes: Record<string, { before: unknown; after: unknown }> | null = null
    if (params.before_data && params.after_data) {
      changes = {}
      const allKeys = new Set([
        ...Object.keys(params.before_data),
        ...Object.keys(params.after_data),
      ])
      for (const key of Array.from(allKeys)) {
        if (params.before_data[key] !== params.after_data[key]) {
          changes[key] = { before: params.before_data[key], after: params.after_data[key] }
        }
      }
      if (Object.keys(changes).length === 0) changes = null
    }

    await sb.from('audit_trail').insert({
      company_id: params.company_id || null,
      user_id: params.user_id || null,
      user_name: params.user_name || null,
      action: params.action,
      module: params.module,
      table_name: params.table_name || null,
      record_id: params.record_id || null,
      record_folio: params.record_folio || null,
      before_data: params.before_data || null,
      after_data: params.after_data || null,
      changes,
    })
  } catch (e) {
    // Auditoría nunca debe romper el flujo principal
    console.warn('[audit] error:', e)
  }
}

/**
 * Genera el siguiente folio para un módulo
 */
export async function getNextFolio(module: string): Promise<string> {
  const sb = createClient()

  const { data: series } = await sb
    .from('folio_series')
    .select('*')
    .eq('module', module)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!series) {
    // Fallback — folio con timestamp
    return `${module.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`
  }

  // Incrementar el contador
  const numero = series.next_number
  await sb.from('folio_series').update({ next_number: numero + 1 }).eq('id', series.id)

  const numStr = String(numero).padStart(series.padding, '0')
  return `${series.prefix}${numStr}`
}

/**
 * Crea las series de folios por defecto para MrBus
 */
export async function createDefaultFolioSeries() {
  const sb = createClient()

  const series = [
    { module: 'purchase_request',    prefix: 'REQ-', padding: 5 },
    { module: 'purchase_order',      prefix: 'OC-',  padding: 5 },
    { module: 'invoice',             prefix: 'FAC-', padding: 5 },
    { module: 'accounting_entry',    prefix: 'POL-', padding: 5 },
    { module: 'liquidacion',         prefix: 'LIQ-', padding: 5 },
    { module: 'nomina',              prefix: 'NOM-', padding: 5 },
    { module: 'physical_inv',        prefix: 'INV-', padding: 5 },
    { module: 'maintenance_order',   prefix: 'MTO-', padding: 5 },
    { module: 'trip',                prefix: 'VIA-', padding: 5 },
    { module: 'cash_cut',            prefix: 'COR-', padding: 5 },
  ]

  for (const s of series) {
    await sb.from('folio_series').upsert(
      {
        module: s.module,
        prefix: s.prefix,
        next_number: 1,
        padding: s.padding,
        is_active: true,
      },
      { onConflict: 'module' }
    )
  }
}
