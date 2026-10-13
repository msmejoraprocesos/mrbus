'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Plus, Phone, MessageCircle, Calendar, Mail, StickyNote, CheckCircle2, Trash2, X, Clock } from 'lucide-react'

const AZUL = '#1D4ED8'

interface Actividad {
  id: string
  tipo: string
  titulo: string
  notas: string | null
  fecha: string
  estatus: string
  lead_id: string | null
  leads?: { first_name: string; last_name: string; company: string | null } | null
  org_id: string | null
}

interface Lead { id: string; first_name: string; last_name: string; company: string | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TIPO_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; Icon: any }> = {
  llamada:  { color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', label: 'Llamada',   Icon: Phone },
  cita:     { color: '#9a3412', bg: '#ffedd5', border: '#fdba74', label: 'Cita',      Icon: Calendar },
  email:    { color: '#6d28d9', bg: '#ede9fe', border: '#c4b5fd', label: 'Email',     Icon: Mail },
  whatsapp: { color: '#166534', bg: '#dcfce7', border: '#86efac', label: 'WhatsApp', Icon: MessageCircle },
  nota:     { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', label: 'Nota',     Icon: StickyNote },
}

const TIPO_ICONS: Record<string, string> = { llamada: '📞', cita: '📅', email: '✉️', whatsapp: '💬', nota: '📝' }
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const HORAS = Array.from({ length: 24 }, (_, i) => i)

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}
function startOfWeek(d: Date) {
  const nd = new Date(d)
  nd.setDate(nd.getDate() - nd.getDay())
  return nd
}
function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

export default function SeguimientoPage() {
  const supabase = createClient()
  const [vista, setVista] = useState<'mes' | 'semana' | 'dia'>('semana')
  const [fecha, setFecha] = useState(new Date())
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [cargando, setCargando] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [fechaSel, setFechaSel] = useState('')
  const [horaSel, setHoraSel] = useState('09:00')
  const [form, setForm] = useState({ tipo: 'llamada', titulo: '', lead_id: '', notas: '' })
  const [guardando, setGuardando] = useState(false)
  const [detalle, setDetalle] = useState<Actividad | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('organization_id').eq('id', user.id).single().then(({ data }) => {
        const oid = data?.organization_id ?? null
        setOrgId(oid)
        loadData(oid)
      })
    })
  }, [])

  useEffect(() => {
    if (scrollRef.current && (vista === 'semana' || vista === 'dia')) {
      scrollRef.current.scrollTop = 7 * 56
    }
  }, [vista])

  async function loadData(oid: string | null) {
    setCargando(true)
    const q = supabase.from('lead_actividades')
      .select('*, leads(first_name, last_name, company)')
      .order('fecha', { ascending: true })
    if (oid) q.eq('org_id', oid)

    const [rActs, rLeads] = await Promise.all([
      q,
      supabase.from('leads').select('id, first_name, last_name, company').order('first_name'),
    ])
    setActividades((rActs.data as Actividad[]) ?? [])
    setLeads((rLeads.data as Lead[]) ?? [])
    setCargando(false)
  }

  async function guardar() {
    if (!form.titulo.trim()) return
    setGuardando(true)
    let fechaCompleta = new Date().toISOString()
    if (fechaSel && horaSel) {
      const [yr, mo, dy] = fechaSel.split('-').map(Number)
      const [hh, mm] = horaSel.split(':').map(Number)
      fechaCompleta = new Date(yr, mo - 1, dy, hh, mm, 0).toISOString()
    }
    const payload: Record<string, unknown> = {
      titulo: form.titulo,
      tipo: form.tipo,
      fecha: fechaCompleta,
      notas: form.notas || null,
      lead_id: form.lead_id || null,
      estatus: 'pendiente',
      org_id: orgId,
    }
    const { data, error } = await supabase
      .from('lead_actividades')
      .insert(payload)
      .select('*, leads(first_name, last_name, company)')
      .single()
    if (error || !data) { setGuardando(false); return }
    setActividades(prev => [...prev, data as Actividad])
    setShowModal(false)
    setForm({ tipo: 'llamada', titulo: '', lead_id: '', notas: '' })
    setGuardando(false)
  }

  async function completar(act: Actividad) {
    const nuevoEstatus = act.estatus === 'pendiente' ? 'completado' : 'pendiente'
    const { error } = await supabase.from('lead_actividades').update({ estatus: nuevoEstatus }).eq('id', act.id)
    if (error) return
    setActividades(prev => prev.map(a => a.id === act.id ? { ...a, estatus: nuevoEstatus } : a))
    setDetalle(d => d?.id === act.id ? { ...d, estatus: nuevoEstatus } : d)
  }

  async function eliminar(id: string) {
    const act = actividades.find(a => a.id === id)
    if (!window.confirm(`¿Eliminar "${act?.titulo ?? 'esta actividad'}"?`)) return
    const { error } = await supabase.from('lead_actividades').delete().eq('id', id)
    if (error) return
    setActividades(prev => prev.filter(a => a.id !== id))
    setDetalle(null)
  }

  function openModal(f: string, h = '09:00') {
    setFechaSel(f); setHoraSel(h)
    setForm({ tipo: 'llamada', titulo: '', lead_id: '', notas: '' })
    setShowModal(true)
  }

  function navegar(dir: number) {
    const d = new Date(fecha)
    if (vista === 'mes') d.setMonth(d.getMonth() + dir)
    else if (vista === 'semana') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setFecha(d)
  }

  function actsDelDia(day: Date) {
    return actividades.filter(a => a.fecha && isSameDay(new Date(a.fecha), day))
  }

  function tituloNav() {
    if (vista === 'mes') return `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`
    if (vista === 'semana') {
      const ini = startOfWeek(fecha)
      const fin = new Date(ini); fin.setDate(ini.getDate() + 6)
      return `${ini.getDate()} ${MESES[ini.getMonth()].slice(0,3)} — ${fin.getDate()} ${MESES[fin.getMonth()].slice(0,3)} ${fin.getFullYear()}`
    }
    return fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function nombreLead(act: Actividad) {
    if (!act.leads) return null
    const { first_name, last_name, company } = act.leads
    return company ? `${first_name} ${last_name} · ${company}` : `${first_name} ${last_name}`
  }

  // ── RENDER MES ─────────────────────────────────────────────────
  function renderMes() {
    const ini = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
    const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)
    const startPad = ini.getDay()
    const days: (Date | null)[] = Array(startPad).fill(null)
    for (let i = 1; i <= fin.getDate(); i++) days.push(new Date(fecha.getFullYear(), fecha.getMonth(), i))
    while (days.length % 7 !== 0) days.push(null)
    const hoy = new Date()

    return (
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #E1E7F0' }}>
          {DIAS.map(d => (
            <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>{d}</div>
          ))}
        </div>
        {Array.from({ length: days.length / 7 }, (_, w) => (
          <div key={w} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f1f5f9' }}>
            {days.slice(w * 7, w * 7 + 7).map((day, i) => {
              const acts = day ? actsDelDia(day) : []
              const esHoy = day ? isSameDay(day, hoy) : false
              const esSel = day ? isSameDay(day, fecha) : false
              return (
                <div key={i} onClick={() => day && setFecha(day)}
                  style={{ minHeight: '100px', padding: '6px', borderRight: i < 6 ? '1px solid #f1f5f9' : 'none', background: esSel ? '#EEF2FF' : 'white', cursor: day ? 'pointer' : 'default' }}>
                  {day && (
                    <>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: esHoy ? AZUL : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: esHoy ? '700' : '400', color: esHoy ? 'white' : '#374151', marginBottom: '4px' }}>
                        {day.getDate()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {acts.slice(0, 3).map(a => {
                          const cfg = TIPO_CONFIG[a.tipo] ?? TIPO_CONFIG.nota
                          return (
                            <div key={a.id} onClick={e => { e.stopPropagation(); setDetalle(a) }}
                              style={{ fontSize: '11px', padding: '2px 5px', borderRadius: '4px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: a.estatus === 'completado' ? 'line-through' : 'none' }}>
                              {TIPO_ICONS[a.tipo]} {a.titulo} {new Date(a.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )
                        })}
                        {acts.length > 3 && <div style={{ fontSize: '11px', color: '#94a3b8', padding: '1px 4px' }}>+{acts.length - 3} más</div>}
                      </div>
                      <button onClick={e => { e.stopPropagation(); openModal(toDateStr(day)) }}
                        style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>+ agregar</button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  // ── RENDER SEMANA / DÍA ────────────────────────────────────────
  function renderSemanaODia() {
    const HORA_H = 56
    const dias = vista === 'semana'
      ? Array.from({ length: 7 }, (_, i) => { const d = startOfWeek(fecha); d.setDate(d.getDate() + i); return d })
      : [fecha]
    const hoy = new Date()

    return (
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Cabecera días */}
        <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${dias.length}, 1fr)`, borderBottom: '1px solid #E1E7F0', background: 'white', flexShrink: 0 }}>
          <div />
          {dias.map((d, i) => {
            const esHoy = isSameDay(d, hoy)
            const esSel = isSameDay(d, fecha)
            return (
              <div key={i} onClick={() => { setFecha(new Date(d)); if (vista === 'semana') setVista('dia') }}
                style={{ padding: '8px 4px', textAlign: 'center', cursor: 'pointer', borderLeft: '1px solid #f1f5f9', background: esSel && vista === 'semana' ? '#EEF2FF' : 'white' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{DIAS[d.getDay()]}</div>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: esHoy ? AZUL : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: esHoy ? '700' : '500', color: esHoy ? 'white' : '#374151', margin: '2px auto 0' }}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>
        {/* Grid horas */}
        <div ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${dias.length}, 1fr)`, position: 'relative' }}>
            <div>
              {HORAS.map((h, hi) => (
                <div key={h} style={{ height: HORA_H, borderBottom: '1px solid #f1f5f9', background: hi % 2 === 0 ? '#FAFBFC' : 'white', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: '8px', paddingTop: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>{h.toString().padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>
            {dias.map((dia, di) => (
              <div key={di} style={{ borderLeft: '1px solid #f1f5f9', position: 'relative' }}>
                {HORAS.map((h, hi) => (
                  <div key={h}
                    onClick={() => openModal(toDateStr(dia), `${h.toString().padStart(2, '0')}:00`)}
                    style={{ height: HORA_H, borderBottom: '1px solid #f1f5f9', background: hi % 2 === 0 ? '#FAFBFC' : 'white', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = hi % 2 === 0 ? '#FAFBFC' : 'white')}
                  />
                ))}
                {actsDelDia(dia).map((a, ai) => {
                  if (!a.fecha) return null
                  const d = new Date(a.fecha)
                  const top = (d.getHours() + d.getMinutes() / 60) * HORA_H
                  const cfg = TIPO_CONFIG[a.tipo] ?? TIPO_CONFIG.nota
                  const sameHour = actsDelDia(dia).filter(b => b.fecha && Math.abs(new Date(b.fecha).getHours() - d.getHours()) < 1)
                  const totalCols = sameHour.length
                  const col = sameHour.indexOf(a)
                  const widthPct = Math.floor(96 / totalCols)
                  const leftPct = col * widthPct + 2
                  return (
                    <div key={a.id} onClick={e => { e.stopPropagation(); setDetalle(a) }}
                      style={{ position: 'absolute', top, left: `${leftPct}%`, width: `${widthPct}%`, height: '40px', borderRadius: '8px', padding: '3px 6px', background: cfg.bg, border: `1px solid ${cfg.border}`, cursor: 'pointer', zIndex: 10 + col, opacity: a.estatus === 'completado' ? 0.6 : 1, boxSizing: 'border-box', overflow: 'hidden' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: cfg.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: a.estatus === 'completado' ? 'line-through' : 'none' }}>
                        {TIPO_ICONS[a.tipo]} {d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} {a.titulo}
                      </div>
                      {nombreLead(a) && <div style={{ fontSize: '10px', color: cfg.color, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreLead(a)}</div>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── RESUMEN DEL DÍA (vista diaria: lista de pendientes) ────────
  function renderPendientes() {
    const hoy = new Date()
    const pendientes = actividades.filter(a => a.fecha && isSameDay(new Date(a.fecha), hoy) && a.estatus === 'pendiente')
    if (pendientes.length === 0) return null
    return (
      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', flexShrink: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400E', marginBottom: '8px' }}>
          <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
          {pendientes.length} {pendientes.length === 1 ? 'actividad pendiente' : 'actividades pendientes'} hoy
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {pendientes.map(a => {
            const cfg = TIPO_CONFIG[a.tipo] ?? TIPO_CONFIG.nota
            return (
              <div key={a.id} onClick={() => setDetalle(a)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', background: 'white', border: `1px solid ${cfg.border}` }}>
                <span style={{ fontSize: '13px' }}>{TIPO_ICONS[a.tipo]}</span>
                <span style={{ flex: 1, fontSize: '12px', fontWeight: '600', color: cfg.color }}>{a.titulo}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(a.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (cargando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8', fontSize: '14px' }}>
        Cargando agenda…
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F8FAFC', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B' }}>Seguimiento</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Agenda de actividades comerciales</div>
          </div>
          <div style={{ flex: 1 }} />

          {/* Controles vista */}
          <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
            {(['mes', 'semana', 'dia'] as const).map(v => (
              <button key={v} onClick={() => setVista(v)}
                style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', background: vista === v ? 'white' : 'transparent', color: vista === v ? AZUL : '#64748B', boxShadow: vista === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Navegación */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => navegar(-1)}
              style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ minWidth: '240px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#374151' }}>{tituloNav()}</span>
            <button onClick={() => navegar(1)}
              style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={15} />
            </button>
            <button onClick={() => setFecha(new Date())}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
              Hoy
            </button>
          </div>

          <button onClick={() => openModal(toDateStr(new Date()))}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: AZUL, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            <Plus size={15} /> Nueva actividad
          </button>
        </div>
      </div>

      {/* Pendientes hoy banner */}
      <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
        {renderPendientes()}
      </div>

      {/* Calendario */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px 24px' }}>
        <div style={{ flex: 1, background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {vista === 'mes' ? renderMes() : renderSemanaODia()}
        </div>
      </div>

      {/* Modal nueva actividad */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '480px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B' }}>Nueva actividad</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>

            {/* Tipo */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Tipo</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Object.entries(TIPO_CONFIG).map(([k, cfg]) => (
                  <button key={k} onClick={() => setForm(f => ({ ...f, tipo: k }))}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '20px', border: `1.5px solid ${form.tipo === k ? cfg.color : '#E2E8F0'}`, background: form.tipo === k ? cfg.bg : 'white', color: form.tipo === k ? cfg.color : '#64748B', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                    <cfg.Icon size={13} /> {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Título */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Título *</label>
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="ej. Llamada de seguimiento"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Fecha y hora */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Fecha</label>
                <input type="date" value={fechaSel} onChange={e => setFechaSel(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Hora</label>
                <input type="time" value={horaSel} onChange={e => setHoraSel(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Lead (opcional) */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Lead / Prospecto (opcional)</label>
              <select value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontSize: '13px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                <option value="">— Sin lead —</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.first_name} {l.last_name}{l.company ? ` · ${l.company}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Notas */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Notas</label>
              <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                rows={2} placeholder="Detalles adicionales…"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1.5px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando || !form.titulo.trim()}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: !form.titulo.trim() ? '#94a3b8' : AZUL, color: 'white', cursor: form.titulo.trim() ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: '600' }}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel detalle actividad */}
      {detalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ width: '36px', height: '4px', background: '#E2E8F0', borderRadius: '2px', margin: '0 auto 20px' }} />
            {(() => {
              const cfg = TIPO_CONFIG[detalle.tipo] ?? TIPO_CONFIG.nota
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ padding: '10px', borderRadius: '10px', background: cfg.bg, border: `1px solid ${cfg.border}`, flexShrink: 0 }}>
                      <cfg.Icon size={20} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', textDecoration: detalle.estatus === 'completado' ? 'line-through' : 'none' }}>{detalle.titulo}</div>
                      <div style={{ fontSize: '12px', color: cfg.color, fontWeight: '600', marginTop: '2px' }}>{cfg.label}</div>
                    </div>
                    <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#475569', fontSize: '13px' }}>
                      <Clock size={14} />
                      {new Date(detalle.fecha).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {nombreLead(detalle) && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#475569', fontSize: '13px' }}>
                        <span>👤</span> {nombreLead(detalle)}
                      </div>
                    )}
                    {detalle.notas && (
                      <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#374151' }}>
                        {detalle.notas}
                      </div>
                    )}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: detalle.estatus === 'completado' ? '#DCFCE7' : '#FEF3C7', color: detalle.estatus === 'completado' ? '#16A34A' : '#92400E', fontSize: '12px', fontWeight: '700' }}>
                      {detalle.estatus === 'completado' ? '✓ Completado' : '⏳ Pendiente'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => completar(detalle)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', border: '1.5px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                      <CheckCircle2 size={15} color={detalle.estatus === 'completado' ? '#94a3b8' : '#16A34A'} />
                      {detalle.estatus === 'completado' ? 'Reabrir' : 'Completar'}
                    </button>
                    <button onClick={() => eliminar(detalle.id)}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #FEE2E2', background: 'white', cursor: 'pointer', color: '#DC2626' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
