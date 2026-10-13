'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, Search, Phone, Mail, MessageCircle, ChevronRight, X,
  Loader2, User, Building2, Tag, Calendar, MapPin, CheckCircle2,
  Clock, AlertCircle, ArrowRight, FileText, Banknote, Activity,
  MoreHorizontal, Lock,
} from 'lucide-react'
import Link from 'next/link'

// ── Pipeline stages ──────────────────────────────────────────────
const STAGES = [
  { key: 'lead',        label: 'Lead',        color: '#64748B', bg: '#F1F5F9', desc: 'Primer contacto. Aún sin necesidad calificada.' },
  { key: 'contacted',   label: 'Contactado',  color: '#0369A1', bg: '#E0F2FE', desc: 'Se realizó contacto. Se agenda presentación o cotización.' },
  { key: 'quoted',      label: 'Cotizado',    color: '#C2410C', bg: '#FFEDD5', desc: 'Se envió cotización formal. Esperando respuesta.' },
  { key: 'negotiating', label: 'Negociando',  color: '#7C3AED', bg: '#EDE9FE', desc: 'Propuesta en revisión. Ajustes y contrapropuestas.' },
  { key: 'confirmed',   label: 'Confirmado',  color: '#15803D', bg: '#DCFCE7', desc: 'Servicio aceptado. Contrato o convenio en proceso.' },
  { key: 'lost',        label: 'Perdido',     color: '#B91C1C', bg: '#FEE2E2', desc: 'No se concretó. Se conserva el historial.' },
]

const SERVICE_LABELS: Record<string, string> = {
  tourism_b2b: 'Turismo B2B',
  agency_b2c: 'Agencia B2C',
  personnel: 'Transporte Personal',
  rental: 'Renta de Unidad',
  executive: 'Ejecutivo',
  parcel_in_trip: 'Paquetería en ruta',
  parcel_dedicated: 'Paquetería dedicada',
}

const SOURCE_LABELS: Record<string, string> = {
  phone: 'Teléfono',
  social: 'Redes sociales',
  referral: 'Referido',
  web: 'Sitio web',
  walk_in: 'Visita directa',
  whatsapp: 'WhatsApp',
  other: 'Otro',
}

const ACTIVITY_TYPES = [
  { key: 'llamada',   label: 'Llamada',   color: '#1D4ED8', bg: '#DBEAFE' },
  { key: 'whatsapp',  label: 'WhatsApp',  color: '#15803D', bg: '#DCFCE7' },
  { key: 'cita',      label: 'Cita',      color: '#9A3412', bg: '#FFEDD5' },
  { key: 'email',     label: 'Email',     color: '#6D28D9', bg: '#EDE9FE' },
  { key: 'nota',      label: 'Nota',      color: '#475569', bg: '#F1F5F9' },
]

const ACT_ICON: Record<string, string> = {
  llamada: '📞', whatsapp: '💬', cita: '📅', email: '✉️', nota: '📝',
}

function fmtMXN(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}
function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

// Semáforo de contacto: verde <3 días, amarillo <7, rojo >=7
function semaforoContacto(ultimo_contacto: string | null) {
  if (!ultimo_contacto) return { color: '#DC2626', bg: '#FEE2E2', label: 'Sin contacto' }
  const dias = daysSince(ultimo_contacto)
  if (dias < 3) return { color: '#16A34A', bg: '#DCFCE7', label: `Hace ${dias}d` }
  if (dias < 7) return { color: '#EA580C', bg: '#FFEDD5', label: `Hace ${dias}d` }
  return { color: '#DC2626', bg: '#FEE2E2', label: `Hace ${dias}d` }
}

interface Lead {
  id: string
  first_name: string
  last_name: string | null
  company: string | null
  phone: string | null
  email: string | null
  source: string | null
  service_type: string | null
  pipeline_stage: string
  notas: string | null
  created_at: string
  ultimo_contacto: string | null
  valor_estimado: number | null
  ciudad: string | null
  org_id: string | null
}

interface Actividad {
  id: string
  lead_id: string
  tipo: string
  titulo: string
  notas: string | null
  fecha: string
  estatus: string
}

type Tab = 'info' | 'actividades'

export default function CRMPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroStage, setFiltroStage] = useState('')
  const [vista, setVista] = useState<'kanban' | 'lista'>('kanban')

  // Expediente lateral
  const [selected, setSelected] = useState<Lead | null>(null)
  const [tab, setTab] = useState<Tab>('info')
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loadingActs, setLoadingActs] = useState(false)
  const [editando, setEditando] = useState(false)
  const [formEdit, setFormEdit] = useState({ first_name: '', last_name: '', company: '', phone: '', email: '', ciudad: '', notas: '', valor_estimado: '' })

  // Nuevo lead
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', company: '', phone: '', email: '',
    source: 'phone', service_type: 'tourism_b2b', ciudad: '', notas: '', valor_estimado: '',
  })

  // Nueva actividad
  const [showActForm, setShowActForm] = useState(false)
  const [savingAct, setSavingAct] = useState(false)
  const [formAct, setFormAct] = useState({
    tipo: 'llamada', titulo: '', notas: '', fecha: new Date().toISOString().split('T')[0],
  })

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    setLeads((data ?? []) as Lead[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function openExpediente(lead: Lead) {
    setSelected(lead)
    setTab('info')
    setEditando(false)
    setShowActForm(false)
    setLoadingActs(true)
    const { data } = await supabase
      .from('lead_actividades')
      .select('*')
      .eq('lead_id', lead.id)
      .order('fecha', { ascending: false })
    setActividades((data ?? []) as Actividad[])
    setLoadingActs(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim()) return
    setSaving(true)
    await supabase.from('leads').insert({
      first_name: form.first_name,
      last_name: form.last_name || null,
      company: form.company || null,
      phone: form.phone || null,
      email: form.email || null,
      source: form.source,
      service_type: form.service_type,
      ciudad: form.ciudad || null,
      notas: form.notas || null,
      valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
      pipeline_stage: 'lead',
    })
    setSaving(false)
    setShowNew(false)
    setForm({ first_name: '', last_name: '', company: '', phone: '', email: '', source: 'phone', service_type: 'tourism_b2b', ciudad: '', notas: '', valor_estimado: '' })
    load()
  }

  async function moveStage(id: string, stage: string) {
    await supabase.from('leads').update({ pipeline_stage: stage }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, pipeline_stage: stage } : l))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, pipeline_stage: stage } : null)
  }

  async function guardarEdicion() {
    if (!selected) return
    const updates = {
      first_name: formEdit.first_name,
      last_name: formEdit.last_name || null,
      company: formEdit.company || null,
      phone: formEdit.phone || null,
      email: formEdit.email || null,
      ciudad: formEdit.ciudad || null,
      notas: formEdit.notas || null,
      valor_estimado: formEdit.valor_estimado ? parseFloat(formEdit.valor_estimado) : null,
    }
    await supabase.from('leads').update(updates).eq('id', selected.id)
    const updated = { ...selected, ...updates }
    setLeads(prev => prev.map(l => l.id === selected.id ? updated as Lead : l))
    setSelected(updated as Lead)
    setEditando(false)
  }

  async function guardarActividad() {
    if (!selected || !formAct.tipo) return
    setSavingAct(true)
    const tipoLabel = ACTIVITY_TYPES.find(t => t.key === formAct.tipo)?.label ?? formAct.tipo
    const titulo = formAct.titulo || tipoLabel
    const { data } = await supabase.from('lead_actividades').insert({
      lead_id: selected.id,
      tipo: formAct.tipo,
      titulo,
      notas: formAct.notas || null,
      fecha: new Date(formAct.fecha + 'T12:00:00').toISOString(),
      estatus: 'completado',
    }).select().single()
    if (data) {
      setActividades(prev => [data as Actividad, ...prev])
      // Update ultimo_contacto on lead
      await supabase.from('leads').update({ ultimo_contacto: data.fecha }).eq('id', selected.id)
      setSelected(prev => prev ? { ...prev, ultimo_contacto: data.fecha } : null)
      setLeads(prev => prev.map(l => l.id === selected.id ? { ...l, ultimo_contacto: data.fecha } : l))
    }
    setSavingAct(false)
    setShowActForm(false)
    setFormAct({ tipo: 'llamada', titulo: '', notas: '', fecha: new Date().toISOString().split('T')[0] })
  }

  // ── Filtering ─────────────────────────────────────────────────
  const filtered = leads.filter(l => {
    const matchSearch = !search || `${l.first_name} ${l.last_name ?? ''} ${l.company ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchStage = !filtroStage || l.pipeline_stage === filtroStage
    return matchSearch && matchStage
  })
  const byStage = (stage: string) => filtered.filter(l => l.pipeline_stage === stage)

  const stageActual = STAGES.find(s => s.key === selected?.pipeline_stage)

  return (
    <div className="h-full flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">CRM — Pipeline comercial</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {leads.length} leads · {leads.filter(l => l.pipeline_stage === 'confirmed').length} confirmados
            {leads.some(l => l.valor_estimado) && ` · ${fmtMXN(leads.filter(l => l.pipeline_stage !== 'lost').reduce((s, l) => s + (l.valor_estimado ?? 0), 0))} en pipeline`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="pl-9 pr-3 h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48"
              placeholder="Buscar lead..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none"
            value={filtroStage} onChange={e => setFiltroStage(e.target.value)}
          >
            <option value="">Todas las etapas</option>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['kanban', 'lista'] as const).map(v => (
              <button key={v} onClick={() => setVista(v)}
                className="px-3 h-9 text-xs font-medium transition-colors"
                style={{ background: vista === v ? '#1D4ED8' : 'white', color: vista === v ? '#fff' : '#6B7280' }}>
                {v === 'kanban' ? 'Kanban' : 'Lista'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#1D4ED8' }}>
            <Plus className="w-4 h-4" /> Nuevo lead
          </button>
        </div>
      </div>

      {/* Main area — Kanban + Expediente lateral */}
      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* Kanban / Lista */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
            </div>
          ) : vista === 'kanban' ? (

            /* ── KANBAN ─────────────────────────────────────────── */
            <div className="flex gap-3 pb-4 min-h-full">
              {STAGES.map(stage => {
                const items = byStage(stage.key)
                return (
                  <div key={stage.key} className="flex-shrink-0 w-60 flex flex-col">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                        <span className="text-xs font-semibold text-gray-700">{stage.label}</span>
                      </div>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: stage.bg, color: stage.color }}>
                        {items.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 flex-1 bg-gray-50 rounded-xl p-2 min-h-[160px]">
                      {items.map(lead => {
                        const sem = semaforoContacto(lead.ultimo_contacto)
                        const isActive = selected?.id === lead.id
                        return (
                          <div key={lead.id}
                            onClick={() => openExpediente(lead)}
                            className="bg-white rounded-xl border shadow-sm p-3 cursor-pointer hover:shadow-md transition-all"
                            style={{ borderColor: isActive ? '#1D4ED8' : '#F1F5F9', borderWidth: isActive ? 2 : 1 }}>
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-gray-900 leading-tight truncate">
                                  {lead.first_name} {lead.last_name ?? ''}
                                </p>
                                {lead.company && (
                                  <p className="text-xs text-gray-400 truncate mt-0.5">{lead.company}</p>
                                )}
                              </div>
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0"
                                style={{ background: sem.bg, color: sem.color }}>
                                {sem.label}
                              </span>
                            </div>

                            {lead.service_type && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium mt-1 inline-block"
                                style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                                {SERVICE_LABELS[lead.service_type] ?? lead.service_type}
                              </span>
                            )}

                            {lead.valor_estimado && (
                              <p className="text-xs text-gray-500 font-medium mt-1.5 tabular-nums">
                                {fmtMXN(lead.valor_estimado)}
                              </p>
                            )}

                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50">
                              {lead.phone && (
                                <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                                  className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
                                  <Phone className="w-3 h-3" />
                                </a>
                              )}
                              {lead.phone && (
                                <a href={`https://wa.me/52${lead.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
                                  <MessageCircle className="w-3 h-3" />
                                </a>
                              )}
                              {lead.email && (
                                <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()}
                                  className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                                  <Mail className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {items.length === 0 && (
                        <div className="flex items-center justify-center h-16 text-gray-300 text-xs">
                          Sin leads
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

          ) : (

            /* ── LISTA ──────────────────────────────────────────── */
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Cliente', 'Empresa', 'Servicio', 'Etapa', 'Valor', 'Últ. contacto', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => {
                    const stage = STAGES.find(s => s.key === lead.pipeline_stage)
                    const sem = semaforoContacto(lead.ultimo_contacto)
                    return (
                      <tr key={lead.id} onClick={() => openExpediente(lead)}
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                        style={{ background: selected?.id === lead.id ? '#EFF6FF' : '' }}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {lead.first_name} {lead.last_name ?? ''}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{lead.company ?? '—'}</td>
                        <td className="px-4 py-3">
                          {lead.service_type ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                              {SERVICE_LABELS[lead.service_type] ?? lead.service_type}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {stage && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: stage.bg, color: stage.color }}>
                              {stage.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-gray-700">
                          {lead.valor_estimado ? fmtMXN(lead.valor_estimado) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: sem.bg, color: sem.color }}>
                            {sem.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/comercial/crm/${lead.id}`} onClick={e => e.stopPropagation()}
                            className="text-gray-300 hover:text-blue-500 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                      No hay leads con ese filtro
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── EXPEDIENTE LATERAL ──────────────────────────────────── */}
        {selected && (
          <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">

            {/* Header expediente */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 leading-tight truncate">
                    {selected.first_name} {selected.last_name ?? ''}
                  </h3>
                  {selected.company && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />{selected.company}
                    </p>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-600 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Etapa actual + mover */}
              {stageActual && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{ background: stageActual.bg, color: stageActual.color }}>
                    {stageActual.label}
                  </span>
                  <select
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={selected.pipeline_stage}
                    onChange={e => moveStage(selected.id, e.target.value)}>
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              )}

              {/* Semáforo contacto */}
              {(() => {
                const sem = semaforoContacto(selected.ultimo_contacto)
                return (
                  <p className="text-xs font-medium" style={{ color: sem.color }}>
                    {selected.ultimo_contacto ? `Último contacto: ${fmtFecha(selected.ultimo_contacto)} (${sem.label})` : '⚠️ Sin contacto registrado'}
                  </p>
                )
              })()}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {([
                { key: 'info', label: 'Info', icon: User },
                { key: 'actividades', label: 'Actividad', icon: Activity },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2"
                  style={{
                    borderColor: tab === t.key ? '#1D4ED8' : 'transparent',
                    color: tab === t.key ? '#1D4ED8' : '#9CA3AF',
                  }}>
                  <t.icon className="w-3.5 h-3.5" />{t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── INFO ── */}
              {tab === 'info' && (
                <div className="p-4 space-y-4">
                  {!editando ? (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                          { label: 'Teléfono', value: selected.phone, icon: Phone },
                          { label: 'Email', value: selected.email, icon: Mail },
                          { label: 'Ciudad', value: selected.ciudad, icon: MapPin },
                          { label: 'Fuente', value: selected.source ? SOURCE_LABELS[selected.source] : null, icon: Tag },
                        ].map(({ label, value, icon: Icon }) => (
                          <div key={label}>
                            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                            {value ? (
                              <p className="text-gray-700 font-medium flex items-center gap-1">
                                <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{value}</span>
                              </p>
                            ) : <p className="text-gray-300">—</p>}
                          </div>
                        ))}
                      </div>

                      {selected.service_type && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Servicio de interés</p>
                          <span className="text-xs px-2 py-1 rounded-full font-semibold"
                            style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                            {SERVICE_LABELS[selected.service_type] ?? selected.service_type}
                          </span>
                        </div>
                      )}

                      {selected.valor_estimado && (
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Valor estimado</p>
                          <p className="text-lg font-bold text-gray-900 tabular-nums">{fmtMXN(selected.valor_estimado)}</p>
                        </div>
                      )}

                      {selected.notas && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Notas</p>
                          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2.5 leading-relaxed">{selected.notas}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            setFormEdit({
                              first_name: selected.first_name,
                              last_name: selected.last_name ?? '',
                              company: selected.company ?? '',
                              phone: selected.phone ?? '',
                              email: selected.email ?? '',
                              ciudad: selected.ciudad ?? '',
                              notas: selected.notas ?? '',
                              valor_estimado: selected.valor_estimado?.toString() ?? '',
                            })
                            setEditando(true)
                          }}
                          className="flex-1 h-8 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                          Editar
                        </button>
                        <Link href={`/comercial/crm/${selected.id}`}
                          className="flex-1 h-8 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 text-white transition-colors"
                          style={{ background: '#1D4ED8' }}>
                          Ver completo <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </>
                  ) : (
                    /* Edición rápida */
                    <div className="space-y-2.5">
                      {[
                        { key: 'first_name', label: 'Nombre *' },
                        { key: 'last_name', label: 'Apellido' },
                        { key: 'company', label: 'Empresa' },
                        { key: 'phone', label: 'Teléfono' },
                        { key: 'email', label: 'Email' },
                        { key: 'ciudad', label: 'Ciudad' },
                        { key: 'valor_estimado', label: 'Valor estimado ($)' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-xs text-gray-500 font-medium block mb-0.5">{label}</label>
                          <input
                            className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={(formEdit as any)[key]}
                            onChange={e => setFormEdit(p => ({ ...p, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-0.5">Notas</label>
                        <textarea
                          className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          rows={2} value={formEdit.notas}
                          onChange={e => setFormEdit(p => ({ ...p, notas: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setEditando(false)}
                          className="flex-1 h-8 text-xs font-medium rounded-lg border border-gray-200 text-gray-600">
                          Cancelar
                        </button>
                        <button onClick={guardarEdicion}
                          className="flex-1 h-8 text-xs font-semibold rounded-lg text-white"
                          style={{ background: '#1D4ED8' }}>
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── ACTIVIDADES ── */}
              {tab === 'actividades' && (
                <div className="p-4">
                  {!showActForm ? (
                    <button
                      onClick={() => setShowActForm(true)}
                      className="w-full h-9 rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-1.5 mb-4">
                      <Plus className="w-3.5 h-3.5" /> Registrar actividad
                    </button>
                  ) : (
                    <div className="bg-blue-50 rounded-xl p-3 mb-4 space-y-2.5">
                      <p className="text-xs font-semibold text-blue-700">Nueva actividad</p>
                      <div className="flex gap-2">
                        {ACTIVITY_TYPES.map(t => (
                          <button key={t.key}
                            onClick={() => setFormAct(p => ({ ...p, tipo: t.key }))}
                            className="flex-1 h-7 text-[10px] font-semibold rounded-lg transition-colors"
                            style={{
                              background: formAct.tipo === t.key ? t.bg : '#fff',
                              color: formAct.tipo === t.key ? t.color : '#9CA3AF',
                              border: `1px solid ${formAct.tipo === t.key ? t.color + '40' : '#E5E7EB'}`,
                            }}>
                            {ACT_ICON[t.key]} {t.label}
                          </button>
                        ))}
                      </div>
                      <input
                        className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none"
                        placeholder="Título (opcional)"
                        value={formAct.titulo}
                        onChange={e => setFormAct(p => ({ ...p, titulo: e.target.value }))}
                      />
                      <textarea
                        className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs resize-none focus:outline-none"
                        rows={2} placeholder="Notas / resultado..."
                        value={formAct.notas}
                        onChange={e => setFormAct(p => ({ ...p, notas: e.target.value }))}
                      />
                      <input type="date"
                        className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none"
                        value={formAct.fecha}
                        onChange={e => setFormAct(p => ({ ...p, fecha: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowActForm(false)}
                          className="flex-1 h-8 text-xs font-medium rounded-lg border border-gray-200 text-gray-600">
                          Cancelar
                        </button>
                        <button onClick={guardarActividad} disabled={savingAct}
                          className="flex-1 h-8 text-xs font-semibold rounded-lg text-white flex items-center justify-center gap-1"
                          style={{ background: '#1D4ED8' }}>
                          {savingAct ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}

                  {loadingActs ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                    </div>
                  ) : actividades.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">Sin actividades registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {actividades.map(act => {
                        const tipoConfig = ACTIVITY_TYPES.find(t => t.key === act.tipo)
                        return (
                          <div key={act.id} className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-start gap-2">
                              <span className="text-base leading-none mt-0.5">{ACT_ICON[act.tipo] ?? '📌'}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-xs font-semibold text-gray-800 truncate">{act.titulo}</p>
                                  {tipoConfig && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                                      style={{ background: tipoConfig.bg, color: tipoConfig.color }}>
                                      {tipoConfig.label}
                                    </span>
                                  )}
                                </div>
                                {act.notas && (
                                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{act.notas}</p>
                                )}
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {fmtFecha(act.fecha)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL NUEVO LEAD ──────────────────────────────────────── */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Registrar nuevo lead</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                  <input className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Juan" value={form.first_name}
                    onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Apellido</label>
                  <input className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="García" value={form.last_name}
                    onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
                <input className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nombre de la empresa" value={form.company}
                  onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                  <input className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="998 123 4567" value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input type="email" className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="correo@empresa.com" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
                  <input className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Cancún" value={form.ciudad}
                    onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valor estimado ($)</label>
                  <input type="number" className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="50000" value={form.valor_estimado}
                    onChange={e => setForm(p => ({ ...p, valor_estimado: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Canal de origen</label>
                  <select className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none"
                    value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de servicio</label>
                  <select className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none"
                    value={form.service_type} onChange={e => setForm(p => ({ ...p, service_type: e.target.value }))}>
                    {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas iniciales</label>
                <textarea className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  rows={2} placeholder="¿Qué necesita el cliente? ¿Contexto del primer contacto?"
                  value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowNew(false)}
                  className="flex-1 h-9 rounded-lg border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !form.first_name}
                  className="flex-1 h-9 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ background: '#1D4ED8' }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Registrar lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
