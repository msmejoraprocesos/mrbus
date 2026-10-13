/**
 * lib/approvals.ts
 * Sistema central de flujos de aprobación — MrBus
 */

import { createClient } from '@/lib/supabase/client'

export type ApprovalModule =
  | 'purchase_order'
  | 'cxp_payment'
  | 'liquidacion'
  | 'nomina'
  | 'inventory_adjustment'
  | 'maintenance_order'
  | 'vacation'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type ApprovalRequest = {
  id: string
  module: ApprovalModule
  record_id: string
  record_type: string
  record_data: Record<string, unknown>
  amount: number | null
  description: string
  requested_by: string
  required_role: string
  status: ApprovalStatus
  approved_by: string | null
  approved_at: string | null
  rejected_reason: string | null
  pin_verified: boolean
  created_at: string
}

/** Jerarquía de roles para aprobación */
export function getRolesCanApprove(role: string): string[] {
  const hierarchy = ['supervisor', 'manager', 'finanzas', 'admin', 'director']
  const idx = hierarchy.indexOf(role)
  if (idx === -1) return [role]
  return hierarchy.slice(0, idx + 1)
}

/** Determina qué rol se necesita para aprobar según el monto y módulo */
export async function getRequiredRole(
  module: ApprovalModule,
  amount: number
): Promise<string> {
  const sb = createClient()

  const { data: rules } = await sb
    .from('approval_rules')
    .select('required_role, min_amount, max_amount')
    .eq('module', module)
    .eq('is_active', true)
    .lte('min_amount', amount)
    .order('min_amount', { ascending: false })

  if (rules) {
    for (const rule of rules) {
      if (!rule.max_amount || amount <= rule.max_amount) {
        return rule.required_role
      }
    }
  }

  // Por defecto: supervisor para montos pequeños, director para grandes
  if (amount < 5000) return 'supervisor'
  if (amount < 50000) return 'manager'
  return 'director'
}

/** Crear una solicitud de aprobación */
export async function createApprovalRequest(params: {
  module: ApprovalModule
  record_id: string
  record_type: string
  record_data: Record<string, unknown>
  amount?: number
  description: string
  requested_by: string
}): Promise<{ success: boolean; request_id?: string; required_role?: string; error?: string }> {
  const sb = createClient()

  const required_role = await getRequiredRole(params.module, params.amount || 0)

  const { data, error } = await sb
    .from('approval_requests')
    .insert({
      module: params.module,
      record_id: params.record_id,
      record_type: params.record_type,
      record_data: params.record_data,
      amount: params.amount || null,
      description: params.description,
      requested_by: params.requested_by,
      required_role,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, request_id: data.id, required_role }
}

/** Aprobar una solicitud con PIN */
export async function approveRequest(params: {
  request_id: string
  approved_by: string
  pin: string
  user_id: string
}): Promise<{ success: boolean; error?: string }> {
  const sb = createClient()

  // Verificar PIN del usuario
  const { data: profile } = await sb
    .from('profiles')
    .select('pin_hash')
    .eq('id', params.user_id)
    .single()

  const pinValid = profile?.pin_hash === params.pin

  if (!pinValid) {
    return { success: false, error: 'PIN incorrecto' }
  }

  const { error } = await sb
    .from('approval_requests')
    .update({
      status: 'approved',
      approved_by: params.approved_by,
      approved_at: new Date().toISOString(),
      pin_verified: true,
    })
    .eq('id', params.request_id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/** Rechazar una solicitud */
export async function rejectRequest(params: {
  request_id: string
  rejected_by: string
  reason: string
}): Promise<{ success: boolean; error?: string }> {
  const sb = createClient()

  const { error } = await sb
    .from('approval_requests')
    .update({
      status: 'rejected',
      approved_by: params.rejected_by,
      approved_at: new Date().toISOString(),
      rejected_reason: params.reason,
    })
    .eq('id', params.request_id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/** Obtener pendientes de aprobación para un rol */
export async function getPendingApprovals(
  userRole: string
): Promise<ApprovalRequest[]> {
  const sb = createClient()
  const roles = getRolesCanApprove(userRole)

  const { data } = await sb
    .from('approval_requests')
    .select('*')
    .eq('status', 'pending')
    .in('required_role', roles)
    .order('created_at', { ascending: false })

  return (data || []) as ApprovalRequest[]
}
