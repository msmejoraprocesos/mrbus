'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Calculator, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

const SERVICE_TYPES = [
  { key: 'tourism_b2b',      label: '🌴 Turismo / Excursión B2B' },
  { key: 'agency_b2c',       label: '🎫 Agencia B2C — venta por asiento' },
  { key: 'personnel',        label: '🏭 Transporte de personal' },
  { key: 'rental',           label: '🚌 Renta con operador' },
  { key: 'executive',        label: '✈️ Traslado ejecutivo' },
  { key: 'parcel_in_trip',   label: '📦 Paquetería en viaje existente' },
  { key: 'parcel_dedicated', label: '📦 Paquetería viaje dedicado' },
]

const QUESTIONS: Record<string, { key: string; label: string; type: string; options?: string[] }[]> = {
  tourism_b2b: [
    { key: 'passengers', label: 'Número de pasajeros', type: 'number' },
    { key: 'days', label: 'Días de servicio', type: 'number' },
    { key: 'round_trip', label: '¿Ida y vuelta?', type: 'select', options: ['Sí', 'No'] },
    { key: 'includes_guide', label: '¿Incluye guía?', type: 'select', options: ['Sí', 'No'] },
    { key: 'has_parcel', label: '¿Hay paquetería?', type: 'select', options: ['Sí', 'No'] },
  ],
  agency_b2c: [
    { key: 'total_seats', label: 'Total de asientos a vender', type: 'number' },
    { key: 'price_per_seat', label: 'Precio por asiento ($)', type: 'number' },
    { key: 'min_seats', label: 'Mínimo para confirmar', type: 'number' },
    { key: 'includes', label: '¿Qué incluye?', type: 'text' },
  ],
  personnel: [
    { key: 'employees', label: 'Empleados por ruta', type: 'number' },
    { key: 'routes', label: 'Número de rutas', type: 'number' },
    { key: 'operation_days', label: 'Días de operación', type: 'select', options: ['L-V (5 días)', 'L-S (6 días)', '7 días'] },
    { key: 'shifts', label: 'Turnos', type: 'select', options: ['Matutino', 'Vespertino', 'Nocturno', 'Múltiples'] },
    { key: 'billing_scheme', label: 'Esquema de cobro', type: 'select', options: ['Ruta fija mensual', 'Por asiento ocupado', 'Mixto'] },
  ],
  rental: [
    { key: 'rental_type', label: 'Tipo de renta', type: 'select', options: ['Por horas', 'Por días'] },
    { key: 'duration', label: 'Horas / Días', type: 'number' },
    { key: 'zone', label: 'Zona de operación', type: 'select', options: ['Local', 'Foráneo', 'Nacional'] },
    { key: 'fuel_included', label: '¿Combustible incluido?', type: 'select', options: ['Sí', 'No'] },
    { key: 'tolls_included', label: '¿Casetas incluidas?', type: 'select', options: ['Sí', 'No'] },
  ],
  executive: [
    { key: 'passenger_name', label: 'Nombre del pasajero VIP', type: 'text' },
    { key: 'vehicle_type', label: 'Tipo de vehículo', type: 'select', options: ['Sedán', 'SUV', 'Van ejecutiva'] },
    { key: 'is_airport', label: '¿Es aeropuerto?', type: 'select', options: ['Sí', 'No'] },
    { key: 'wait_hours', label: 'Horas de espera en destino', type: 'number' },
  ],
  parcel_in_trip: [
    { key: 'weight_kg', label: 'Peso (kg)', type: 'number' },
    { key: 'cargo_type', label: 'Tipo de carga', type: 'select', options: ['Normal', 'Frágil', 'Resguardado', 'Valores/Joyas'] },
    { key: 'declared_value', label: 'Valor declarado ($)', type: 'number' },
    { key: 'sender', label: 'Remitente', type: 'text' },
    { key: 'recipient', label: 'Destinatario', type: 'text' },
  ],
  parcel_dedicated: [
    { key: 'weight_kg', label: 'Peso total (kg)', type: 'number' },
    { key: 'cargo_type', label: 'Tipo de carga', type: 'select', options: ['Normal', 'Frágil', 'Resguardado', 'Valores/Joyas'] },
    { key: 'declared_value', label: 'Valor declarado ($)', type: 'number' },
  ],
}

function CotizadorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const leadId = searchParams.get('lead')

  const [step, setStep] = useState(1) // 1=servicio+ruta, 2=variables, 3=costos+precio
  const [saving, setSaving] = useState(false)
  const [lead, setLead] = useState<any>(null)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [fuelPrice, setFuelPrice] = useState<number>(23.5)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const [form, setForm] = useState({
    service_type: 'tourism_b2b',
    origin: '', destination: '',
    distance_km: 0, toll_cost: 0, round_trip: true,
    vehicle_id: '', days: 1,
    tentative_date: '', notes: '',
    questionnaire: {} as Record<string, any>,
    margin_pct: 30,
    advance_pct: 50,
  })

  const [vehicle, setVehicle] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const [{ data: v }, { data: f }] = await Promise.all([
        supabase.from('vehicles').select('*, cost_profile:vehicle_cost_profiles(*)').eq('status', 'active'),
        supabase.from('fuel_prices').select('price_per_liter').eq('is_active', true).order('effective_date', { ascending: false }).limit(1),
      ])
      setVehicles(v ?? [])
      if (f?.[0]) setFuelPrice(f[0].price_per_liter)
      if (leadId) {
        const { data: l } = await supabase.from('leads').select('*').eq('id', leadId).single()
        setLead(l)
        if (l?.service_type) setForm(p => ({ ...p, service_type: l.service_type }))
      }
    }
    load()
  }, [])

  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }
  function setQ(k: string, v: any) { setForm(p => ({ ...p, questionnaire: { ...p.questionnaire, [k]: v } })) }

  function onVehicleChange(id: string) {
    const v = vehicles.find(x => x.id === id)
    setVehicle(v ?? null)
    setProfile(v?.cost_profile?.[0] ?? null)
    set('vehicle_id', id)
  }

  // Motor de cálculo de costos
  const costs = (() => {
    if (!vehicle || !form.distance_km) return null
    const km = form.distance_km * (form.round_trip ? 2 : 1)
    const days = form.days || 1
    const p = profile || {}

    // Tipo 1 — Variables directos
    const fuel = (km / (vehicle.fuel_efficiency_km_per_liter || 4)) * fuelPrice
    const tolls = form.toll_cost * (form.round_trip ? 2 : 1)
    const driver_daily = (p.daily_rate || 600) + (p.per_diem_out_city || 300)
    const driver = driver_daily * days

    // Tipo 2 — Fijos por km
    const maint = km * ((p.preventive_maint_cost || 15000) / (p.preventive_maint_interval_km || 10000))
    const tires = km * ((p.tires_cost || 60000) / (p.tires_life_km || 80000))
    const oil   = km * ((p.oil_change_cost || 800) / (p.oil_change_interval_km || 5000))

    // Tipo 3 — Fijos periódicos
    const insurance = ((p.insurance_annual || 48000) / 365) * days
    const sct = ((p.sct_permit_annual || 12000) / 365) * days
    const registration = ((p.registration_annual || 8000) / 365) * days
    const gps = ((p.gps_monthly || 400) / 30) * days

    const subtotal = fuel + tolls + driver + maint + tires + oil + insurance + sct + registration + gps
    const overhead = subtotal * 0.10
    const total_cost = subtotal + overhead
    const client_price = total_cost / (1 - form.margin_pct / 100)
    const profit = client_price - total_cost

    return { fuel, tolls, driver, maint, tires, oil, insurance, sct, registration, gps, subtotal, overhead, total_cost, client_price, profit, km }
  })()

  async function handleSave() {
    if (!costs) { toast.error('Completa la ruta y selecciona una unidad'); return }
    setSaving(true)
    const res = await fetch('/api/quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId ?? null,
        service_type: form.service_type,
        tentative_date: form.tentative_date || null,
        cost_breakdown: {
          fuel: costs.fuel, tolls: costs.tolls, driver: costs.driver,
          maintenance: costs.maint, tires: costs.tires, oil: costs.oil,
          insurance: costs.insurance, sct: costs.sct, registration: costs.registration,
          gps: costs.gps, overhead: costs.overhead,
          total_cost: costs.total_cost, km: costs.km, days: form.days,
          questionnaire: form.questionnaire,
        },
        client_price: Math.round(costs.client_price),
        margin_pct: form.margin_pct,
        payment_terms: { advance_pct: form.advance_pct },
        notes: form.notes || null,
        route: {
          origin_name: form.origin,
          destination_name: form.destination,
          distance_km: form.distance_km,
          toll_cost: form.toll_cost,
          round_trip: form.round_trip,
        },
      }),
    })
    const result = await res.json()
    setSaving(false)
    if (!result.success) { toast.error(result.error ?? 'Error'); return }
    toast.success('Cotización guardada')
    router.push(`/comercial/cotizacion/${result.data.id}`)
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={leadId ? `/comercial/crm/${leadId}` : '/comercial'} className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nueva cotización</h1>
          {lead && <p className="text-sm text-gray-400">Para: {lead.first_name} {lead.last_name} {lead.company ? `· ${lead.company}` : ''}</p>}
        </div>
      </div>

      {/* Paso 1 — Servicio y ruta */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">1</span>Tipo de servicio y ruta</h2>

        <div>
          <label className="label">Tipo de servicio *</label>
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_TYPES.map(s => (
              <button key={s.key} type="button" onClick={() => set('service_type', s.key)}
                className={`text-left text-xs px-3 py-2.5 rounded-xl border transition-all ${form.service_type === s.key ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Origen *</label>
            <input className="input" placeholder="Ej: Ciudad de México" value={form.origin} onChange={e => set('origin', e.target.value)} />
          </div>
          <div>
            <label className="label">Destino *</label>
            <input className="input" placeholder="Ej: Acapulco, Guerrero" value={form.destination} onChange={e => set('destination', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Distancia km (ida)</label>
            <input type="number" className="input" placeholder="280" value={form.distance_km || ''}
              onChange={e => set('distance_km', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Costo casetas (ida)</label>
            <input type="number" className="input" placeholder="510" value={form.toll_cost || ''}
              onChange={e => set('toll_cost', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Días de servicio</label>
            <input type="number" className="input" min="1" value={form.days}
              onChange={e => set('days', parseInt(e.target.value) || 1)} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.round_trip} onChange={e => set('round_trip', e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-gray-700">Incluye regreso (ida y vuelta)</span>
          </label>
          <div>
            <label className="label">Fecha tentativa</label>
          </div>
          <input type="date" className="input" value={form.tentative_date}
            onChange={e => set('tentative_date', e.target.value)} />
        </div>
      </div>

      {/* Paso 2 — Variables del servicio */}
      {QUESTIONS[form.service_type] && (
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">2</span>
            Variables del servicio
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {QUESTIONS[form.service_type].map(q => (
              <div key={q.key}>
                <label className="label">{q.label}</label>
                {q.type === 'select' ? (
                  <select className="input" value={form.questionnaire[q.key] ?? ''}
                    onChange={e => setQ(q.key, e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {q.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={q.type} className="input" value={form.questionnaire[q.key] ?? ''}
                    onChange={e => setQ(q.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paso 3 — Unidad y costos */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">3</span>
          Unidad y motor de costos
        </h2>

        <div>
          <label className="label">Seleccionar unidad *</label>
          <select className="input" value={form.vehicle_id} onChange={e => onVehicleChange(e.target.value)}>
            <option value="">— Selecciona una unidad —</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.plate} · {v.brand} {v.model} ({v.capacity} pax)</option>
            ))}
          </select>
          {vehicles.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">⚠️ No hay unidades registradas. <Link href="/flota" className="underline">Agregar en Flota</Link></p>
          )}
        </div>

        {costs && (
          <div className="space-y-3">
            {/* Resumen principal */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                <p className="text-xs text-red-500 font-medium">Costo total real</p>
                <p className="text-xl font-bold text-red-600 mt-1">{fmt(costs.total_cost)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                <p className="text-xs text-gray-500 font-medium">Margen</p>
                <input type="range" min="10" max="60" step="5" value={form.margin_pct}
                  onChange={e => set('margin_pct', parseInt(e.target.value))}
                  className="w-full mt-1 accent-blue-600" />
                <p className="text-lg font-bold text-gray-700">{form.margin_pct}%</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                <p className="text-xs text-green-600 font-medium">Precio al cliente</p>
                <p className="text-xl font-bold text-green-700 mt-1">{fmt(costs.client_price)}</p>
                <p className="text-[10px] text-green-500">Utilidad: {fmt(costs.profit)}</p>
              </div>
            </div>

            {/* Desglose detallado */}
            <button onClick={() => setShowBreakdown(!showBreakdown)}
              className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-600 py-1">
              <span>Ver desglose de costos</span>
              {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showBreakdown && (
              <div className="bg-gray-50 rounded-xl p-4 text-xs space-y-1.5 border border-gray-100">
                <p className="font-semibold text-gray-500 uppercase text-[10px] mb-2">Tipo 1 — Variables directos</p>
                {[
                  ['Combustible', costs.fuel],
                  ['Casetas', costs.tolls],
                  ['Operador', costs.driver],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between">
                    <span className="text-gray-500">{l as string}</span>
                    <span className="font-medium text-gray-800">{fmt(v as number)}</span>
                  </div>
                ))}
                <p className="font-semibold text-gray-500 uppercase text-[10px] mt-3 mb-2">Tipo 2 — Fijos por km ({costs.km} km)</p>
                {[
                  ['Mantenimiento preventivo', costs.maint],
                  ['Llantas', costs.tires],
                  ['Aceite', costs.oil],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between">
                    <span className="text-gray-500">{l as string}</span>
                    <span className="font-medium text-gray-800">{fmt(v as number)}</span>
                  </div>
                ))}
                <p className="font-semibold text-gray-500 uppercase text-[10px] mt-3 mb-2">Tipo 3 — Fijos periódicos ({form.days} días)</p>
                {[
                  ['Seguro vehicular', costs.insurance],
                  ['Permiso SCT', costs.sct],
                  ['Tenencia / registro', costs.registration],
                  ['GPS / rastreo', costs.gps],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between">
                    <span className="text-gray-500">{l as string}</span>
                    <span className="font-medium text-gray-800">{fmt(v as number)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal operativo</span><span className="font-medium">{fmt(costs.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Overhead (10%)</span><span className="font-medium">{fmt(costs.overhead)}</span></div>
                  <div className="flex justify-between font-bold text-gray-800 pt-1 border-t border-gray-200"><span>Costo total real</span><span>{fmt(costs.total_cost)}</span></div>
                </div>
              </div>
            )}

            {/* Condiciones de pago */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">% de anticipo</label>
                <select className="input" value={form.advance_pct} onChange={e => set('advance_pct', parseInt(e.target.value))}>
                  {[30, 40, 50, 60, 70, 100].map(p => <option key={p} value={p}>{p}% — {fmt(costs.client_price * p / 100)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notas para el cliente</label>
                <input className="input" placeholder="Condiciones especiales..." value={form.notes}
                  onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <Link href={leadId ? `/comercial/crm/${leadId}` : '/comercial'} className="btn-secondary flex-1 justify-center">
          Cancelar
        </Link>
        <button onClick={handleSave} disabled={saving || !form.origin || !form.destination}
          className="btn-primary flex-1">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : <><Calculator className="w-4 h-4" />Guardar cotización</>}
        </button>
      </div>
    </div>
  )
}

export default function CotizacionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>}>
      <CotizadorContent />
    </Suspense>
  )
}
