'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Phone, Mail, MessageCircle, Plus, Loader2, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const STAGES = [
  { key: 'lead',        label: 'Lead',       color: '#6B7280' },
  { key: 'contacted',   label: 'Contactado', color: '#0369A1' },
  { key: 'quoted',      label: 'Cotizado',   color: '#C2410C' },
  { key: 'negotiating', label: 'Negociando', color: '#7C3AED' },
  { key: 'confirmed',   label: 'Confirmado', color: '#15803D' },
  { key: 'lost',        label: 'Perdido',    color: '#B91C1C' },
]

const ACTIVITY_TYPES: Record<string, { label: string; icon: string }> = {
  call:      { label: 'Llamada',  icon: '📞' },
  email:     { label: 'Email',    icon: '📧' },
  meeting:   { label: 'Reunión',  icon: '🤝' },
  whatsapp:  { label: 'WhatsApp', icon: '💬' },
  note:      { label: 'Nota',     icon: '📝' },
  followup:  { label: 'Seguimiento', icon: '⏰' },
}

const SERVICE_LABELS: Record<string, string> = {
  tourism_b2b: 'Turismo B2B', agency_b2c: 'Agencia B2C',
  personnel: 'Transporte de Personal', rental: 'Renta',
  executive: 'Traslado Ejecutivo', parcel_in_trip: 'Paquetería en viaje',
  parcel_dedicated: 'Paquetería dedicada',
}

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const router = useRouter()
  const [lead, setLead] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [savingAct, setSavingAct] = useState(false)
  const [actForm, setActForm] = useState({ activity_type: 'call', notes: '', result: '', next_followup: '' })
  const [showActForm, setShowActForm] = useState(false)

  async function load() {
    const [{ data: l }, { data: a }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', params.id).single(),
      supabase.from('lead_activities').select('*').eq('lead_id', params.id).order('date', { ascending: false })
    ])
    setLead(l)
    setActivities(a ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateStage(stage: string) {
    await supabase.from('leads').update({ pipeline_stage: stage }).eq('id', params.id)
    setLead((prev: any) => ({ ...prev, pipeline_stage: stage }))
  }

  async function saveActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!actForm.notes) return
    setSavingAct(true)
    await supabase.from('lead_activities').insert({
      lead_id: params.id,
      activity_type: actForm.activity_type,
      date: new Date().toISOString(),
      notes: actForm.notes,
      result: actForm.result || null,
      next_followup: actForm.next_followup || null,
    })
    setActForm({ activity_type: 'call', notes: '', result: '', next_followup: '' })
    setShowActForm(false)
    setSavingAct(false)
    load()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
  if (!lead) return <div className="text-center py-20 text-gray-400">Lead no encontrado</div>

  const currentStageIdx = STAGES.findIndex(s => s.key === lead.pipeline_stage)

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/comercial/crm" className="btn-secondary p-2"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{lead.first_name} {lead.last_name}</h1>
          {lead.company && <p className="text-gray-400 text-sm">{lead.company}</p>}
        </div>
        <div className="flex gap-2">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="btn-secondary p-2 text-green-600"><Phone className="w-4 h-4" /></a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="btn-secondary p-2 text-blue-600"><Mail className="w-4 h-4" /></a>
          )}
          {lead.phone && (
            <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer" className="btn-secondary p-2 text-green-600">
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
          <Link href={`/comercial/cotizacion?lead=${params.id}`} className="btn-primary">
            <Plus className="w-4 h-4" />Nueva cotización
          </Link>
        </div>
      </div>

      {/* Pipeline stepper */}
      <div className="card p-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.filter(s => s.key !== 'lost').map((stage, idx) => {
            const isActive = lead.pipeline_stage === stage.key
            const isPast = currentStageIdx > idx && lead.pipeline_stage !== 'lost'
            return (
              <div key={stage.key} className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => updateStage(stage.key)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', isActive ? 'text-white shadow-sm' : isPast ? 'text-white' : 'text-gray-400 bg-gray-50 hover:bg-gray-100')}
                  style={isActive ? { backgroundColor: stage.color } : isPast ? { backgroundColor: stage.color, opacity: 0.6 } : {}}>
                  {isPast && <CheckCircle className="w-3 h-3" />}
                  {stage.label}
                </button>
                {idx < STAGES.filter(s => s.key !== 'lost').length - 1 && (
                  <div className={cn('w-4 h-0.5', isPast ? 'bg-gray-300' : 'bg-gray-100')} />
                )}
              </div>
            )
          })}
          <button onClick={() => updateStage('lost')}
            className={cn('ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0', lead.pipeline_stage === 'lost' ? 'bg-red-600 text-white' : 'text-red-400 bg-red-50 hover:bg-red-100')}>
            Perdido
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Info */}
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Información</h3>
          {[
            ['Teléfono', lead.phone],
            ['Email', lead.email],
            ['Servicio', SERVICE_LABELS[lead.service_type] ?? lead.service_type],
            ['Canal', lead.source],
          ].map(([label, value]) => value && (
            <div key={label}>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">{label}</p>
              <p className="text-sm text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
          {lead.notes && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Notas</p>
              <p className="text-xs text-gray-600 mt-0.5">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Actividades */}
        <div className="col-span-2 card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Actividades</h3>
            <button onClick={() => setShowActForm(!showActForm)} className="btn-secondary text-xs py-1 px-2">
              <Plus className="w-3 h-3" />Registrar
            </button>
          </div>

          {showActForm && (
            <form onSubmit={saveActivity} className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">Tipo</label>
                  <select className="input text-sm" value={actForm.activity_type}
                    onChange={e => setActForm(p => ({ ...p, activity_type: e.target.value }))}>
                    {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Próximo seguimiento</label>
                  <input type="datetime-local" className="input text-sm" value={actForm.next_followup}
                    onChange={e => setActForm(p => ({ ...p, next_followup: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label text-xs">Notas *</label>
                <textarea className="input resize-none text-sm" rows={2}
                  placeholder="¿Qué pasó en esta actividad?"
                  value={actForm.notes} onChange={e => setActForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">Resultado</label>
                <input className="input text-sm" placeholder="¿Cuál fue el resultado?" value={actForm.result}
                  onChange={e => setActForm(p => ({ ...p, result: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowActForm(false)} className="btn-secondary text-xs py-1 flex-1">Cancelar</button>
                <button type="submit" disabled={savingAct} className="btn-primary text-xs py-1 flex-1">
                  {savingAct ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          )}

          {/* Timeline */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activities.length === 0 && (
              <div className="text-center py-8 text-gray-300 text-sm">Sin actividades registradas</div>
            )}
            {activities.map(act => {
              const t = ACTIVITY_TYPES[act.activity_type]
              return (
                <div key={act.id} className="flex gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm flex-shrink-0">
                    {t?.icon ?? '📌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-700">{t?.label}</p>
                      <p className="text-[10px] text-gray-400 flex-shrink-0">
                        {new Date(act.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{act.notes}</p>
                    {act.result && <p className="text-[10px] text-green-600 mt-0.5">✓ {act.result}</p>}
                    {act.next_followup && (
                      <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />Seguimiento: {new Date(act.next_followup).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
