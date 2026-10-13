'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Phone, Mail, MessageCircle, Plus, Loader2,
  CheckCircle2, Building2, MapPin, Tag, Calendar, Banknote,
  FileText, Activity, User, ChevronRight, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

// ── Constantes compartidas ──────────────────────────────────────
const STAGES = [
  { key: 'lead',        label: 'Lead',        color: '#64748B', bg: '#F1F5F9' },
  { key: 'contacted',   label: 'Contactado',  color: '#0369A1', bg: '#E0F2FE' },
  { key: 'quoted',      label: 'Cotizado',    color: '#C2410C', bg: '#FFEDD5' },
  { key: 'negotiating', label: 'Negociando',  color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'confirmed',   label: 'Confirmado',  color: '#15803D', bg: '#DCFCE7' },
  { key: 'lost',        label: 'Perdido',     color: '#B91C1C', bg: '#FEE2E2' },
]

const ACTIVITY_TYPES = [
  { key: 'llamada',  label: 'Llamada',  icon: '📞', color: '#1D4ED8', bg: '#DBEAFE' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#15803D', bg: '#DCFCE7' },
  { key: 'cita',     label: 'Cita',     icon: '📅', color: '#9A3412', bg: '#FFEDD5' },
  { key: 'email',    label: 'Email',    icon: '✉️', color: '#6D28D9', bg: '#EDE9FE' },
  { key: 'nota',     label: 'Nota',     icon: '📝', color: '#475569', bg: '#F1F5F9' },
]

const SERVICE_LABELS: Record<string, string> = {
  tourism_b2b: 'Turismo B2B', agency_b2c: 'Agencia B2C',
  personnel: 'Transporte de Personal', rental: 'Renta de Unidad',
  executive: 'Traslado Ejecutivo', parcel_in_trip: 'Paquetería en ruta',
  parcel_dedicated: 'Paquetería dedicada',
}

const SOURCE_LABELS: Record<string, string> = {
  phone: 'Teléfono', social: 'Redes sociales', referral: 'Referido',
  web: 'Sitio web', walk_in: 'Visita directa', whatsapp: 'WhatsApp', other: 'Otro',
}

function fmtMXN(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}
function fmtFecha(iso: string, withTime = false) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}
function daysSince(iso: string | null) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

type Tab = 'actividades' | 'cotizaciones'

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [lead, setLead] = useState<any>(null)
  const [actividades, setActividades] = useState<any[]>([])
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('actividades')

  // Form nueva actividad
  const [showActForm, setShowActForm] = useState(false)
  const [savingAct, setSavingAct] = useState(false)
  const [formAct, setFormAct] = useState({
    tipo: 'llamada', titulo: '', notas: '',
    fecha: new Date().toISOString().split('T')[0],
    proximo: '',
  })

  async function load() {
    setLoading(true)
    const [{ data: l }, { data: acts }, { data: cotz }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).single(),
      supabase.from('lead_actividades').select('*').eq('lead_id', id).order('fecha', { ascending: false }),
      supabase.from('quotations').select('id, folio, status, total_amount, created_at').eq('lead_id', id).order('created_at', { ascending: false }),
    ])
    setLead(l)
    setActividades(acts ?? [])
    setCotizaciones(cotz ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function updateStage(stage: string) {
    await supabase.from('leads').update({ pipeline_stage: stage }).eq('id', id)
    setLead((prev: any) => ({ ...prev, pipeline_stage: stage }))
  }

  async function guardarActividad(e: React.FormEvent) {
    e.preventDefault()
    if (!formAct.tipo) return
    setSavingAct(true)
    const tipoLabel = ACTIVITY_TYPES.find(t => t.key === formAct.tipo)?.label ?? formAct.tipo
    const { data } = await supabase.from('lead_actividades').insert({
      lead_id: id,
      tipo: formAct.tipo,
      titulo: formAct.titulo || tipoLabel,
      notas: formAct.notas || null,
      fecha: new Date(formAct.fecha + 'T12:00:00').toISOString(),
      estatus: 'completado',
    }).select().single()
    if (data) {
      setActividades(prev => [data, ...prev])
      await supabase.from('leads').update({ ultimo_contacto: data.fecha }).eq('id', id)
      setLead((prev: any) => ({ ...prev, ultimo_contacto: data.fecha }))
    }
    setSavingAct(false)
    setShowActForm(false)
    setFormAct({ tipo: 'llamada', titulo: '', notas: '', fecha: new Date().toISOString().split('T')[0], proximo: '' })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
    </div>
  )
  if (!lead) return (
    <div className="text-center py-20 text-gray-400">Lead no encontrado</div>
  )

  const currentStage = STAGES.find(s => s.key === lead.pipeline_stage)
  const currentStageIdx = STAGES.findIndex(s => s.key === lead.pipeline_stage)
  const diasSinContacto = daysSince(lead.ultimo_contacto)
  const semContacto = diasSinContacto === null
    ? { color: '#DC2626', bg: '#FEE2E2', label: 'Sin contacto' }
    : diasSinContacto < 3
      ? { color: '#16A34A', bg: '#DCFCE7', label: `Hace ${diasSinContacto}d` }
      : diasSinContacto < 7
        ? { color: '#EA580C', bg: '#FFEDD5', label: `Hace ${diasSinContacto}d` }
        : { color: '#DC2626', bg: '#FEE2E2', label: `Hace ${diasSinContacto}d` }

  return (
    <div className="max-w-5xl space-y-5">

      {/* Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/comercial/crm"
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {lead.first_name} {lead.last_name ?? ''}
            </h1>
            {lead.company && (
              <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />{lead.company}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {lead.phone && (
            <a href={`tel:${lead.phone}`}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 text-sm text-green-700 hover:bg-green-50 transition-colors">
              <Phone className="w-3.5 h-3.5" />{lead.phone}
            </a>
          )}
          {lead.phone && (
            <a href={`https://wa.me/52${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
              className="h-9 px-3 rounded-lg border border-gray-200 flex items-center gap-1.5 text-sm text-green-700 hover:bg-green-50 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" />WhatsApp
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`}
              className="h-9 px-3 rounded-lg border border-gray-200 flex items-center gap-1.5 text-sm text-blue-700 hover:bg-blue-50 transition-colors">
              <Mail className="w-3.5 h-3.5" />Email
            </a>
          )}
          <Link href={`/comercial/cotizacion?lead=${id}`}
            className="h-9 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5"
            style={{ background: '#1D4ED8' }}>
            <Plus className="w-4 h-4" />Nueva cotización
          </Link>
        </div>
      </div>

      {/* Pipeline stepper ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.filter(s => s.key !== 'lost').map((stage, idx) => {
            const isActive = lead.pipeline_stage === stage.key
            const isPast = currentStageIdx > idx && lead.pipeline_stage !== 'lost'
            return (
              <div key={stage.key} className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => updateStage(stage.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: isActive ? stage.color : isPast ? stage.color + '33' : '#F9FAFB',
                    color: isActive ? '#fff' : isPast ? stage.color : '#9CA3AF',
                  }}>
                  {isPast && <CheckCircle2 className="w-3 h-3" />}
                  {stage.label}
                </button>
                {idx < STAGES.filter(s => s.key !== 'lost').length - 1 && (
                  <div className="w-5 h-px" style={{ background: isPast ? '#D1D5DB' : '#F3F4F6' }} />
                )}
              </div>
            )
          })}
          <button onClick={() => updateStage('lost')}
            className="ml-2 flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: lead.pipeline_stage === 'lost' ? '#DC2626' : '#FEF2F2',
              color: lead.pipeline_stage === 'lost' ? '#fff' : '#EF4444',
            }}>
            Perdido
          </button>
        </div>
      </div>

      {/* Body grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Columna izquierda — Info + KPIs */}
        <div className="space-y-4">

          {/* Semáforo contacto */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">ÚLTIMO CONTACTO</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold px-2.5 py-1 rounded-full"
                style={{ background: semContacto.bg, color: semContacto.color }}>
                {semContacto.label}
              </span>
              {lead.ultimo_contacto && (
                <span className="text-xs text-gray-400">{fmtFecha(lead.ultimo_contacto)}</span>
              )}
            </div>
            {diasSinContacto !== null && diasSinContacto >= 7 && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Retomar contacto pronto</span>
              </div>
            )}
          </div>

          {/* Valor estimado */}
          {lead.valor_estimado && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-1">VALOR ESTIMADO</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtMXN(lead.valor_estimado)}</p>
            </div>
          )}

          {/* Datos de contacto */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500">INFORMACIÓN</p>
            {[
              { label: 'Servicio', value: lead.service_type ? SERVICE_LABELS[lead.service_type] ?? lead.service_type : null, icon: Tag },
              { label: 'Canal', value: lead.source ? SOURCE_LABELS[lead.source] ?? lead.source : null, icon: Activity },
              { label: 'Ciudad', value: lead.ciudad, icon: MapPin },
              { label: 'Alta', value: lead.created_at ? fmtFecha(lead.created_at) : null, icon: Calendar },
            ].map(({ label, value, icon: Icon }) => value && (
              <div key={label}>
                <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">{label}</p>
                <p className="text-sm text-gray-800 mt-0.5 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{value}
                </p>
              </div>
            ))}
            {lead.notes && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Notas</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed bg-gray-50 rounded-lg p-2">{lead.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha — Actividades + Cotizaciones */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 flex flex-col">

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-4">
            {([
              { key: 'actividades', label: 'Actividades', icon: Activity, count: actividades.length },
              { key: 'cotizaciones', label: 'Cotizaciones', icon: FileText, count: cotizaciones.length },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px"
                style={{
                  borderColor: tab === t.key ? '#1D4ED8' : 'transparent',
                  color: tab === t.key ? '#1D4ED8' : '#9CA3AF',
                }}>
                <t.icon className="w-4 h-4" />{t.label}
                {t.count > 0 && (
                  <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: tab === t.key ? '#DBEAFE' : '#F3F4F6', color: tab === t.key ? '#1D4ED8' : '#9CA3AF' }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">

            {/* ── ACTIVIDADES ─────────────────────────────── */}
            {tab === 'actividades' && (
              <div className="space-y-3">
                {/* Form nueva actividad */}
                {!showActForm ? (
                  <button onClick={() => setShowActForm(true)}
                    className="w-full h-10 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Registrar actividad
                  </button>
                ) : (
                  <form onSubmit={guardarActividad}
                    className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-blue-800">Nueva actividad</p>

                    {/* Tipo selector */}
                    <div className="flex gap-2 flex-wrap">
                      {ACTIVITY_TYPES.map(t => (
                        <button key={t.key} type="button"
                          onClick={() => setFormAct(p => ({ ...p, tipo: t.key }))}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: formAct.tipo === t.key ? t.bg : '#fff',
                            color: formAct.tipo === t.key ? t.color : '#9CA3AF',
                            border: `1.5px solid ${formAct.tipo === t.key ? t.color + '60' : '#E5E7EB'}`,
                          }}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Título (opcional)</label>
                        <input
                          className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          placeholder="Resumen breve..."
                          value={formAct.titulo}
                          onChange={e => setFormAct(p => ({ ...p, titulo: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                        <input type="date"
                          className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          value={formAct.fecha}
                          onChange={e => setFormAct(p => ({ ...p, fecha: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notas / resultado</label>
                      <textarea
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        rows={3} placeholder="¿Qué pasó? ¿Cuál fue el resultado?"
                        value={formAct.notas}
                        onChange={e => setFormAct(p => ({ ...p, notas: e.target.value }))}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowActForm(false)}
                        className="flex-1 h-9 rounded-lg border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50">
                        Cancelar
                      </button>
                      <button type="submit" disabled={savingAct}
                        className="flex-1 h-9 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                        style={{ background: '#1D4ED8' }}>
                        {savingAct ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Guardar
                      </button>
                    </div>
                  </form>
                )}

                {/* Timeline */}
                {actividades.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Sin actividades registradas</p>
                    <p className="text-xs text-gray-300 mt-0.5">Registra llamadas, citas o notas de seguimiento</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {actividades.map(act => {
                      const tipoConfig = ACTIVITY_TYPES.find(t => t.key === act.tipo)
                      return (
                        <div key={act.id} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                            style={{ background: tipoConfig?.bg ?? '#F1F5F9' }}>
                            {tipoConfig?.icon ?? '📌'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-800">{act.titulo}</p>
                              <p className="text-xs text-gray-400 flex-shrink-0">{fmtFecha(act.fecha)}</p>
                            </div>
                            {act.notas && (
                              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{act.notas}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── COTIZACIONES ────────────────────────────── */}
            {tab === 'cotizaciones' && (
              <div className="space-y-3">
                <Link href={`/comercial/cotizacion?lead=${id}`}
                  className="w-full h-10 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Nueva cotización para este lead
                </Link>

                {cotizaciones.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Sin cotizaciones</p>
                    <p className="text-xs text-gray-300 mt-0.5">Las cotizaciones de este lead aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cotizaciones.map(q => (
                      <Link key={q.id} href={`/comercial/cotizacion/${q.id}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-colors group">
                        <div>
                          <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">
                            {q.folio ?? `COT-${q.id.slice(0, 6).toUpperCase()}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmtFecha(q.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {q.total_amount && (
                            <span className="text-sm font-bold text-gray-700 tabular-nums">
                              {fmtMXN(q.total_amount)}
                            </span>
                          )}
                          {q.status && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{
                                background: q.status === 'approved' ? '#DCFCE7' : q.status === 'sent' ? '#DBEAFE' : '#F1F5F9',
                                color: q.status === 'approved' ? '#15803D' : q.status === 'sent' ? '#1D4ED8' : '#6B7280',
                              }}>
                              {q.status === 'draft' ? 'Borrador' : q.status === 'sent' ? 'Enviada' : q.status === 'approved' ? 'Aprobada' : q.status}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
