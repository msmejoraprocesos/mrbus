'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Phone, Mail, MessageCircle, ChevronRight, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const STAGES = [
  { key: 'lead',          label: 'Lead',          color: '#6B7280', bg: '#F3F4F6' },
  { key: 'contacted',     label: 'Contactado',    color: '#0369A1', bg: '#E0F2FE' },
  { key: 'quoted',        label: 'Cotizado',      color: '#C2410C', bg: '#FFEDD5' },
  { key: 'negotiating',   label: 'Negociando',    color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'confirmed',     label: 'Confirmado',    color: '#15803D', bg: '#DCFCE7' },
  { key: 'lost',          label: 'Perdido',       color: '#B91C1C', bg: '#FEE2E2' },
]

const SERVICE_LABELS: Record<string, string> = {
  tourism_b2b: 'Turismo B2B', agency_b2c: 'Agencia B2C',
  personnel: 'Personal', rental: 'Renta',
  executive: 'Ejecutivo', parcel_in_trip: 'Paquetería',
  parcel_dedicated: 'Paquetería dedicada',
}

const SOURCE_LABELS: Record<string, string> = {
  phone: '📞 Teléfono', social: '📱 Redes', referral: '🤝 Referido',
  web: '🌐 Web', walk_in: '🚶 Visita', whatsapp: '💬 WhatsApp', other: '📌 Otro',
}

export default function CRMPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', company: '', phone: '', email: '',
    source: 'phone', service_type: 'tourism_b2b', notes: ''
  })

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('leads')
      .select('*').order('created_at', { ascending: false })
    setLeads(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name) return
    setSaving(true)
    await supabase.from('leads').insert({
      ...form, pipeline_stage: 'lead',
      questionnaire: {}
    })
    setSaving(false)
    setShowNew(false)
    setForm({ first_name: '', last_name: '', company: '', phone: '', email: '', source: 'phone', service_type: 'tourism_b2b', notes: '' })
    load()
  }

  async function moveStage(id: string, stage: string) {
    await supabase.from('leads').update({ pipeline_stage: stage }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, pipeline_stage: stage } : l))
  }

  const filtered = leads.filter(l =>
    !search || `${l.first_name} ${l.last_name} ${l.company ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  const byStage = (stage: string) => filtered.filter(l => l.pipeline_stage === stage)

  return (
    <div className="h-full flex flex-col space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM — Pipeline de ventas</h1>
          <p className="text-gray-400 text-sm mt-0.5">{leads.length} leads · {leads.filter(l => l.pipeline_stage === 'confirmed').length} confirmados</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9 w-52" placeholder="Buscar lead..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus className="w-4 h-4" />Nuevo lead
          </button>
        </div>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {STAGES.map(stage => {
            const items = byStage(stage.key)
            return (
              <div key={stage.key} className="flex-shrink-0 w-64 flex flex-col">
                {/* Stage header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-semibold text-gray-700">{stage.label}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: stage.bg, color: stage.color }}>
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 flex-1 bg-gray-50 rounded-xl p-2 min-h-[200px]">
                  {items.map(lead => (
                    <div key={lead.id}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm text-gray-900 leading-tight">
                            {lead.first_name} {lead.last_name}
                          </p>
                          {lead.company && <p className="text-xs text-gray-400 mt-0.5">{lead.company}</p>}
                        </div>
                        <Link href={`/comercial/crm/${lead.id}`}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-500 transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>

                      {lead.service_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                          style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>
                          {SERVICE_LABELS[lead.service_type] ?? lead.service_type}
                        </span>
                      )}

                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`}
                            className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center hover:bg-green-50 hover:text-green-600 text-gray-400 transition-colors">
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`}
                            className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 text-gray-400 transition-colors">
                            <Mail className="w-3 h-3" />
                          </a>
                        )}
                        {lead.phone && (
                          <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer"
                            className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center hover:bg-green-50 hover:text-green-600 text-gray-400 transition-colors">
                            <MessageCircle className="w-3 h-3" />
                          </a>
                        )}
                        <div className="ml-auto">
                          <select className="text-[10px] border-0 bg-transparent text-gray-400 cursor-pointer focus:outline-none"
                            value={lead.pipeline_stage}
                            onChange={e => moveStage(lead.id, e.target.value)}>
                            {STAGES.map(s => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {lead.source && (
                        <p className="text-[10px] text-gray-300 mt-1">
                          {SOURCE_LABELS[lead.source] ?? lead.source}
                        </p>
                      )}
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-gray-300 text-xs">
                      Sin leads
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuevo lead */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Registrar nuevo lead</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombre *</label>
                  <input className="input" placeholder="Juan" value={form.first_name}
                    onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Apellido</label>
                  <input className="input" placeholder="García" value={form.last_name}
                    onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Empresa</label>
                <input className="input" placeholder="Nombre de la empresa" value={form.company}
                  onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input" placeholder="998 123 4567" value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="correo@empresa.com" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Canal de origen</label>
                  <select className="input" value={form.source}
                    onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tipo de servicio</label>
                  <select className="input" value={form.service_type}
                    onChange={e => setForm(p => ({ ...p, service_type: e.target.value }))}>
                    {Object.entries(SERVICE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notas iniciales</label>
                <textarea className="input resize-none" rows={2} placeholder="¿Qué necesita el cliente?"
                  value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !form.first_name} className="btn-primary flex-1">
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
