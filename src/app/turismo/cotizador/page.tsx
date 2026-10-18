'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmt } from '@/lib/utils/index'
import {
  MapPin, Bus, Users, UserCheck, DollarSign,
  ChevronRight, ChevronLeft, Check, Star,
  Upload, X, AlertTriangle, RefreshCw
} from 'lucide-react'

/* ── types ── */
type Vehicle = {
  id: string; plate: string; economic_number: string; brand: string | null
  model: string | null; year: number | null; capacity: number | null
  type: string | null; status: string
}
type Driver = {
  id: string; first_name: string; last_name: string
  license_number: string | null; license_type: string | null
  license_expiry: string | null; status: string
}
type SeatAssignment = { id: string; pax: string }

/* ── seat config per vehicle type ── */
const SEAT_LAYOUTS: Record<string, { rows: number; cols: string[]; vipRows: number[] }> = {
  van:  { rows: 4,  cols: ['A','B','C'], vipRows: [1] },
  mini: { rows: 7,  cols: ['A','B','C','D'], vipRows: [1,2] },
  std:  { rows: 12, cols: ['A','B','C','D'], vipRows: [1,2] },
  exec: { rows: 11, cols: ['A','B','C','D'], vipRows: [1,2] },
}

const VEHICLE_CLASS: Record<string, string> = {
  'Van': 'Ejecutiva', 'Minibús': 'Turismo', 'Autobús': 'Premier+',
  'Camioneta': 'Premium',
}

const STEPS = [
  { n: 1, label: 'Ruta',     Icon: MapPin    },
  { n: 2, label: 'Unidad',   Icon: Bus       },
  { n: 3, label: 'Asientos', Icon: Users     },
  { n: 4, label: 'Operador', Icon: UserCheck },
  { n: 5, label: 'Costo',    Icon: DollarSign},
]

/* ─────────────────────────────────────────────────── */
export default function CotizadorPage() {
  const router   = useRouter()
  const supabase = createClient()

  /* wizard state */
  const [step, setStep]       = useState(1)
  const [saving, setSaving]   = useState(false)
  const [loadingV, setLoadingV] = useState(true)
  const [loadingD, setLoadingD] = useState(true)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers,  setDrivers]  = useState<Driver[]>([])

  /* step 1 — Ruta */
  const [origin,      setOrigin]      = useState('')
  const [destination, setDestination] = useState('')
  const [depDate,     setDepDate]     = useState('')
  const [depTime,     setDepTime]     = useState('')
  const [retDate,     setRetDate]     = useState('')
  const [retTime,     setRetTime]     = useState('')
  const [roundTrip,   setRoundTrip]   = useState(false)
  const [svcType,     setSvcType]     = useState('Nacional')
  const [roadType,    setRoadType]    = useState('Cuota')
  const [distKm,      setDistKm]      = useState<number>(450)
  const [durationMin, setDurationMin] = useState<number>(280)

  /* step 2 — Unidad */
  const [selVehicle, setSelVehicle]   = useState<Vehicle | null>(null)
  const [vImgs,      setVImgs]        = useState<Record<string,string>>({})

  /* step 3 — Asientos */
  const [selSeats,   setSelSeats]     = useState<Set<string>>(new Set())
  const [paxNames,   setPaxNames]     = useState<Record<string,string>>({})
  const [pendingSeat,setPendingSeat]  = useState<string | null>(null)
  const [pendingName,setPendingName]  = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  /* step 4 — Operador */
  const [selDriver,  setSelDriver]    = useState<Driver | null>(null)
  const [opImgs,     setOpImgs]       = useState<Record<string,string>>({})

  /* step 5 — Costo */
  const [fuelCost,   setFuelCost]     = useState<number>(0)
  const [tollCost,   setTollCost]     = useState<number>(300)
  const [drvCost,    setDrvCost]      = useState<number>(800)
  const [otherCost,  setOtherCost]    = useState<number>(0)
  const [margin,     setMargin]       = useState<number>(22)

  /* load data */
  useEffect(() => {
    supabase.from('vehicles').select('*').eq('status','active').order('economic_number')
      .then(({ data }) => { setVehicles((data ?? []) as Vehicle[]); setLoadingV(false) })
    supabase.from('drivers').select('*').eq('status','active').order('first_name')
      .then(({ data }) => { setDrivers((data ?? []) as Driver[]); setLoadingD(false) })
    // auto-calc fuel from distance
    setFuelCost(Math.round(distKm * 0.35 * 25)) // 0.35 L/km * ~25 MXN/L
  }, [])

  useEffect(() => {
    setFuelCost(Math.round(distKm * (roundTrip ? 2 : 1) * 0.35 * 25))
  }, [distKm, roundTrip])

  /* ── derived cost ── */
  const subtotal     = fuelCost + tollCost + drvCost + otherCost
  const marginAmt    = Math.round(subtotal * margin / 100)
  const total        = subtotal + marginAmt
  const pricePerSeat = selSeats.size > 0 ? Math.ceil(total / selSeats.size) : 0

  /* ── seat layout ── */
  const getLayout = () => {
    if (!selVehicle) return { rows: 10, cols: ['A','B','C','D'], vipRows: [1,2] }
    const t = (selVehicle.type ?? '').toLowerCase()
    if (t.includes('van'))  return SEAT_LAYOUTS.van
    if (t.includes('mini')) return SEAT_LAYOUTS.mini
    return SEAT_LAYOUTS.std
  }

  const takenSeats = new Set(['1A','1B','2C','2D','3A','5B','5C','7D','8A','9B','10C','11A'])

  /* ── handlers ── */
  const goStep = (n: number) => {
    if (n <= step || n === step + 1) setStep(n)
  }

  const openSeatModal = (sid: string) => {
    if (takenSeats.has(sid)) return
    if (selSeats.has(sid)) {
      setSelSeats(prev => { const s = new Set(prev); s.delete(sid); return s })
      setPaxNames(prev => { const p = {...prev}; delete p[sid]; return p })
      return
    }
    setPendingSeat(sid)
    setPendingName('')
    setTimeout(() => nameInputRef.current?.focus(), 80)
  }

  const confirmSeat = () => {
    if (!pendingSeat || !pendingName.trim()) return
    setSelSeats(prev => new Set(prev).add(pendingSeat))
    setPaxNames(prev => ({ ...prev, [pendingSeat]: pendingName.trim() }))
    setPendingSeat(null)
    setPendingName('')
  }

  const handleVImg = (vid: string, file: File) => {
    const rd = new FileReader()
    rd.onload = e => setVImgs(p => ({ ...p, [vid]: e.target?.result as string }))
    rd.readAsDataURL(file)
  }

  const handleOpImg = (did: string, file: File) => {
    const rd = new FileReader()
    rd.onload = e => setOpImgs(p => ({ ...p, [did]: e.target?.result as string }))
    rd.readAsDataURL(file)
  }

  /* ── save quote ── */
  const saveQuote = async () => {
    setSaving(true)
    const seats: SeatAssignment[] = Array.from(selSeats).map(id => ({ id, pax: paxNames[id] ?? '' }))
    const { error } = await supabase.from('quotes').insert({
      folio:           `COT-${new Date().getFullYear()}-${Math.floor(Math.random()*9000)+1000}`,
      origin,          destination,
      departure_date:  depDate || null,
      departure_time:  depTime || null,
      return_date:     retDate || null,
      return_time:     retTime || null,
      distance_km:     distKm,
      duration_min:    durationMin,
      service_type:    svcType,
      road_type:       roadType,
      is_round_trip:   roundTrip,
      vehicle_id:      selVehicle?.id ?? null,
      vehicle_class:   VEHICLE_CLASS[selVehicle?.type ?? ''] ?? selVehicle?.type ?? null,
      seats_total:     selVehicle?.capacity ?? null,
      seats_selected:  seats,
      seats_count:     seats.length,
      driver_id:       selDriver?.id ?? null,
      fuel_cost:       fuelCost,
      toll_cost:       tollCost,
      driver_cost:     drvCost,
      other_cost:      otherCost,
      subtotal,
      margin_pct:      margin,
      margin_amount:   marginAmt,
      total,
      price_per_seat:  pricePerSeat,
      status:          'draft',
    })
    setSaving(false)
    if (!error) router.push('/turismo/cotizador/lista')
    else alert('Error al guardar: ' + error.message)
  }

  /* ─────────────────────  RENDER  ──────────────────── */
  const layout = getLayout()

  return (
    <div className="h-[calc(100vh-112px)] flex overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">

      {/* ── LEFT PANEL: wizard ── */}
      <div className="w-[420px] min-w-[420px] flex flex-col border-r border-slate-200 overflow-hidden bg-white">

        {/* header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-white">
          <div className="w-7 h-7 bg-[#1565C0] rounded-lg flex items-center justify-center">
            <Bus size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm text-slate-800">Nueva Cotización</span>
          <span className="ml-auto text-[11px] font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
            Turismo Premium
          </span>
        </div>

        {/* step indicator */}
        <div className="flex items-center px-4 pt-3 pb-0">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? '1' : 'none' }}>
              <button
                onClick={() => goStep(s.n)}
                className="flex flex-col items-center gap-1 group cursor-pointer"
              >
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                  border-2 transition-all relative z-10
                  ${step === s.n ? 'bg-[#1565C0] border-[#1565C0] text-white shadow-[0_0_0_4px_#e8f0fb]' :
                    step > s.n ? 'bg-[#1B7F4F] border-[#1B7F4F] text-white' :
                    'bg-slate-50 border-slate-300 text-slate-400 group-hover:border-[#1565C0] group-hover:text-[#1565C0]'}
                `}>
                  {step > s.n ? <Check size={10} /> : s.n}
                </div>
                <span className={`text-[9px] font-semibold ${step === s.n ? 'text-[#1565C0]' : step > s.n ? 'text-[#1B7F4F]' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 -mt-3 transition-colors ${step > s.n ? 'bg-[#1B7F4F]' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {/* ══ STEP 1: RUTA ══ */}
          {step === 1 && (
            <>
              <StepLabel>Tipo de servicio</StepLabel>
              <ChipGroup
                options={['Nacional','Local','Traslado Aeropuerto','Excursión','Eventos']}
                value={svcType} onChange={setSvcType}
              />
              <StepLabel>Tipo de carretera</StepLabel>
              <ChipGroup options={['Cuota','Libre','Mixta']} value={roadType} onChange={setRoadType} />

              <StepLabel>Origen y destino</StepLabel>
              <div className="space-y-2 pl-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#1B7F4F] border-2 border-white shadow-[0_0_0_2px_#1B7F4F] flex-shrink-0" />
                  <input
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1565C0] focus:bg-white focus:ring-2 focus:ring-blue-100"
                    placeholder="Ciudad de origen" value={origin}
                    onChange={e => setOrigin(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#C0392B] border-2 border-white shadow-[0_0_0_2px_#C0392B] flex-shrink-0" />
                  <input
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1565C0] focus:bg-white focus:ring-2 focus:ring-blue-100"
                    placeholder="Ciudad de destino" value={destination}
                    onChange={e => setDestination(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Distancia (km)</p>
                  <input type="number" min={0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1565C0]"
                    value={distKm} onChange={e => setDistKm(Number(e.target.value))} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Duración (min)</p>
                  <input type="number" min={0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1565C0]"
                    value={durationMin} onChange={e => setDurationMin(Number(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Fecha salida</p>
                  <input type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1565C0]"
                    value={depDate} onChange={e => setDepDate(e.target.value)} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Hora salida</p>
                  <input type="time"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1565C0]"
                    value={depTime} onChange={e => setDepTime(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-200">
                <label className="text-sm text-slate-700 font-medium flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[#1565C0]" checked={roundTrip}
                    onChange={e => setRoundTrip(e.target.checked)} />
                  Viaje redondo
                </label>
                {roundTrip && <span className="text-[11px] text-[#1565C0] font-semibold">+{fmt(distKm * 0.35 * 25)} combustible</span>}
              </div>

              {roundTrip && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Fecha regreso</p>
                    <input type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1565C0]"
                      value={retDate} onChange={e => setRetDate(e.target.value)} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Hora regreso</p>
                    <input type="time"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1565C0]"
                      value={retTime} onChange={e => setRetTime(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Route stats */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { v: `${distKm} km`, l: 'Distancia' },
                  { v: `${Math.floor(durationMin/60)}h ${durationMin%60}m`, l: 'Duración' },
                  { v: roundTrip ? 'Redondo' : 'Sencillo', l: 'Tipo' },
                ].map(s => (
                  <div key={s.l} className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                    <span className="block text-sm font-extrabold text-[#1565C0]">{s.v}</span>
                    <span className="block text-[9px] text-slate-500 mt-0.5">{s.l}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ══ STEP 2: UNIDAD ══ */}
          {step === 2 && (
            <>
              <StepLabel>Selecciona la unidad</StepLabel>
              {loadingV ? (
                <div className="py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" /> Cargando unidades...
                </div>
              ) : vehicles.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">No hay unidades activas</div>
              ) : (
                <div className="space-y-2">
                  {vehicles.map(v => {
                    const cls = VEHICLE_CLASS[v.type ?? ''] ?? v.type ?? 'Servicio'
                    const isSel = selVehicle?.id === v.id
                    return (
                      <div key={v.id}
                        onClick={() => setSelVehicle(v)}
                        className={`rounded-xl border-2 overflow-hidden cursor-pointer transition-all
                          ${isSel ? 'border-[#1565C0] bg-blue-50 shadow-[0_4px_20px_rgba(21,101,192,.18)]'
                                  : 'border-slate-200 hover:border-[#1565C0] hover:shadow-md'}`}
                      >
                        <div className="flex h-24">
                          {/* vehicle image / upload */}
                          <div className="relative w-28 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden border-r border-slate-200">
                            {vImgs[v.id]
                              ? <img src={vImgs[v.id]} alt={v.brand ?? ''} className="w-full h-full object-cover" />
                              : <VehicleSVG type={v.type ?? ''} />
                            }
                            <label className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 bg-[rgba(21,101,192,.7)] flex items-center justify-center transition-opacity">
                              <span className="text-white text-[9px] font-bold tracking-wider text-center px-2">CARGAR<br/>FOTO</span>
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={e => { if(e.target.files?.[0]) handleVImg(v.id, e.target.files[0]) }} />
                            </label>
                            {isSel && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#1B7F4F] rounded-full flex items-center justify-center border-2 border-white">
                                <Check size={9} className="text-white" />
                              </div>
                            )}
                          </div>

                          {/* vehicle info */}
                          <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-start gap-2">
                                <span className="font-bold text-sm text-slate-900 truncate">
                                  {v.brand} {v.model}
                                </span>
                                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full
                                  ${cls === 'Suite' ? 'bg-amber-100 text-amber-700' :
                                    cls === 'Premier+' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'}`}>
                                  {cls}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {v.economic_number} · {v.year} · {v.capacity} pax
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {['A/C','WiFi','USB-C'].map(f => (
                                <span key={f} className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500">
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ══ STEP 3: ASIENTOS ══ */}
          {step === 3 && (
            <>
              <div className="flex items-center justify-between">
                <StepLabel>Mapa de asientos</StepLabel>
                <span className="text-[11px] text-[#1565C0] font-semibold">
                  {selSeats.size} seleccionado{selSeats.size !== 1 ? 's' : ''}
                </span>
              </div>

              {/* legend */}
              <div className="flex gap-3 flex-wrap">
                {[
                  { cl: 'bg-[#4a90d9]', l: 'Disponible' },
                  { cl: 'bg-[#1565C0]', l: 'Seleccionado' },
                  { cl: 'bg-[#c59b24]', l: 'Primera Clase' },
                  { cl: 'bg-slate-300', l: 'Ocupado' },
                ].map(x => (
                  <div key={x.l} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <div className={`w-3 h-3 rounded-sm ${x.cl}`} />
                    {x.l}
                  </div>
                ))}
              </div>

              {/* seat grid */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex justify-center mb-3">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                    <div className="w-8 h-4 rounded-sm bg-slate-200" /> Frente del vehículo
                  </div>
                </div>
                <div className="space-y-1.5">
                  {Array.from({ length: layout.rows }, (_, ri) => {
                    const row = ri + 1
                    const isVip = layout.vipRows.includes(row)
                    return (
                      <div key={row} className="flex items-center gap-1.5">
                        <span className="text-[9px] w-4 text-slate-400 text-right">{row}</span>
                        {layout.cols.map((col, ci) => {
                          const sid = `${row}${col}`
                          const isTaken = takenSeats.has(sid)
                          const isSel   = selSeats.has(sid)
                          const cl = isTaken ? 'tk' : isSel ? 'sl' : isVip ? 'vp' : 'av'
                          return (
                            <button key={col}
                              disabled={isTaken}
                              onClick={() => openSeatModal(sid)}
                              title={isTaken ? 'Ocupado' : paxNames[sid] ?? sid}
                              className={`
                                relative w-9 h-10 rounded-lg flex items-center justify-center
                                text-[9px] font-bold transition-all border
                                ${isTaken
                                  ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                                  : isSel
                                    ? 'bg-[#1565C0] border-[#0d3a75] text-white shadow-md scale-105'
                                    : isVip
                                      ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200 hover:scale-105'
                                      : 'bg-blue-100 border-blue-200 text-blue-700 hover:bg-blue-200 hover:scale-105'
                                }
                              `}
                            >
                              <SeatIcon cl={cl} />
                              <span className="absolute bottom-0.5 left-0 right-0 text-center text-[8px] font-extrabold opacity-90">
                                {sid}
                              </span>
                            </button>
                          )
                        })}
                        {isVip && (
                          <span className="text-[9px] text-amber-500 font-bold ml-1">★ VIP</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* passenger list */}
              {selSeats.size > 0 && (
                <div className="space-y-1">
                  <StepLabel>Pasajeros asignados</StepLabel>
                  {Array.from(selSeats).sort().map(sid => (
                    <div key={sid} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                      <span className="text-[10px] font-extrabold text-[#1565C0] w-6">{sid}</span>
                      <span className="flex-1 text-sm text-slate-700">{paxNames[sid]}</span>
                      <button onClick={() => {
                        setSelSeats(p => { const s = new Set(p); s.delete(sid); return s })
                        setPaxNames(p => { const n = {...p}; delete n[sid]; return n })
                      }}>
                        <X size={13} className="text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* seat name modal */}
              {pendingSeat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                  onClick={e => { if (e.target === e.currentTarget) setPendingSeat(null) }}>
                  <div className="bg-white rounded-2xl shadow-2xl w-80 p-6 mx-4">
                    <h3 className="font-bold text-base text-slate-900 mb-1">
                      Asiento {pendingSeat}
                      {layout.vipRows.includes(Number(pendingSeat.slice(0,-1))) && (
                        <span className="ml-2 text-amber-500 text-sm">★ Primera Clase</span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">¿A nombre de quién va este asiento?</p>
                    <input
                      ref={nameInputRef}
                      type="text"
                      placeholder="Nombre completo del pasajero"
                      value={pendingName}
                      onChange={e => setPendingName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmSeat(); if (e.key === 'Escape') setPendingSeat(null) }}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-blue-100 mb-4"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setPendingSeat(null)}
                        className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                        Cancelar
                      </button>
                      <button onClick={confirmSeat} disabled={!pendingName.trim()}
                        className="flex-1 py-2 rounded-lg bg-[#1565C0] text-white text-sm font-semibold hover:bg-[#0F4C91] disabled:opacity-40">
                        Asignar asiento
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══ STEP 4: OPERADOR ══ */}
          {step === 4 && (
            <>
              <StepLabel>Selecciona el operador</StepLabel>
              {loadingD ? (
                <div className="py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" /> Cargando operadores...
                </div>
              ) : drivers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">No hay operadores activos</div>
              ) : (
                <div className="space-y-3">
                  {drivers.map(d => {
                    const isSel = selDriver?.id === d.id
                    const fullName = `${d.first_name} ${d.last_name}`
                    const expiry = d.license_expiry ? new Date(d.license_expiry) : null
                    const now    = new Date()
                    const daysLeft = expiry ? Math.floor((expiry.getTime() - now.getTime()) / 86400000) : null
                    const docStatus = daysLeft === null ? 'ok' : daysLeft < 0 ? 'ex' : daysLeft < 60 ? 'wn' : 'ok'

                    return (
                      <div key={d.id}
                        onClick={() => setSelDriver(d)}
                        className={`rounded-xl border-2 overflow-hidden cursor-pointer transition-all
                          ${isSel ? 'border-[#1565C0] bg-blue-50 shadow-[0_4px_20px_rgba(21,101,192,.18)]'
                                  : 'border-slate-200 hover:border-[#1565C0]'}`}
                      >
                        {/* operator header */}
                        <div className="flex items-start gap-3 p-3">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                            {opImgs[d.id]
                              ? <img src={opImgs[d.id]} className="w-full h-full object-cover" alt={fullName} />
                              : <OperatorSVG />
                            }
                            <label className="absolute inset-0 opacity-0 hover:opacity-100 bg-[rgba(21,101,192,.7)] flex items-center justify-center cursor-pointer transition-opacity">
                              <Upload size={14} className="text-white" />
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={e => { if(e.target.files?.[0]) handleOpImg(d.id, e.target.files[0]) }} />
                            </label>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-slate-900">{fullName}</p>
                            <p className="text-[11px] text-slate-500">Lic. {d.license_type ?? 'Federal'} · {d.license_number}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Star size={10} className="text-amber-500 fill-amber-500" />
                              <span className="text-[10px] text-slate-500 font-medium">Operador activo</span>
                            </div>
                          </div>
                          {isSel && (
                            <div className="w-5 h-5 bg-[#1B7F4F] rounded-full flex items-center justify-center flex-shrink-0">
                              <Check size={9} className="text-white" />
                            </div>
                          )}
                        </div>

                        {/* document cards */}
                        <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
                          {[
                            { icon: '🪪', label: 'Lic. Federal',  status: docStatus, date: d.license_expiry ? `${daysLeft}d` : '—' },
                            { icon: '🏥', label: 'IMSS',          status: 'ok', date: 'Vigente' },
                            { icon: '📋', label: 'Médico SCT',    status: docStatus, date: d.license_expiry ?? '—' },
                            { icon: '🚌', label: 'Permiso SICT',  status: 'ok', date: 'Vigente' },
                          ].map(doc => (
                            <div key={doc.label}
                              className={`rounded-lg p-2 border text-[10px] flex items-center gap-1.5
                                ${doc.status === 'ok' ? 'bg-green-50 border-green-100' :
                                  doc.status === 'wn' ? 'bg-amber-50 border-amber-100' :
                                  'bg-red-50 border-red-100'}`}
                            >
                              <span className="text-sm">{doc.icon}</span>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-700 truncate">{doc.label}</p>
                                <p className={`text-[9px] ${doc.status === 'ok' ? 'text-green-600' : doc.status === 'wn' ? 'text-amber-600' : 'text-red-600'}`}>
                                  {doc.status === 'ex' ? '⚠ Vencida' : doc.date}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ══ STEP 5: COSTO ══ */}
          {step === 5 && (
            <>
              <StepLabel>Desglose de costos</StepLabel>

              <div className="space-y-2">
                <CostRow label="⛽ Combustible" value={fuelCost} onChange={setFuelCost}
                  hint={`${distKm}km × ${roundTrip?'2 ':''}0.35L/km × $25`} />
                <CostRow label="🛣️ Casetas" value={tollCost} onChange={setTollCost} />
                <CostRow label="👨‍✈️ Operador" value={drvCost} onChange={setDrvCost} />
                <CostRow label="📦 Otros" value={otherCost} onChange={setOtherCost} />
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal costos</span>
                  <span className="font-semibold">{fmt(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Margen</span>
                    <input type="number" min={0} max={100}
                      className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm text-center font-bold text-[#1565C0] outline-none focus:border-[#1565C0]"
                      value={margin} onChange={e => setMargin(Number(e.target.value))} />
                    <span>%</span>
                  </div>
                  <span className="text-sm font-semibold text-[#1565C0]">+ {fmt(marginAmt)}</span>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between font-extrabold text-base">
                  <span className="text-slate-800">TOTAL</span>
                  <span className="text-[#1565C0]">{fmt(total)}</span>
                </div>
              </div>

              {selSeats.size > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-center">
                  <p className="text-[11px] text-blue-600 font-semibold mb-0.5">Precio por asiento</p>
                  <p className="text-2xl font-extrabold text-[#1565C0]">{fmt(pricePerSeat)}</p>
                  <p className="text-[10px] text-blue-500 mt-0.5">{selSeats.size} asientos · {fmt(total)} total</p>
                </div>
              )}

              {/* summary */}
              <StepLabel>Resumen de cotización</StepLabel>
              <div className="rounded-xl border border-slate-200 overflow-hidden text-sm">
                {[
                  { l: 'Ruta',     v: origin && destination ? `${origin} → ${destination}` : '—' },
                  { l: 'Distancia',v: `${distKm} km · ${Math.floor(durationMin/60)}h ${durationMin%60}m` },
                  { l: 'Unidad',   v: selVehicle ? `${selVehicle.brand} ${selVehicle.model}` : '—' },
                  { l: 'Asientos', v: selSeats.size > 0 ? `${selSeats.size} asientos` : '—' },
                  { l: 'Operador', v: selDriver ? `${selDriver.first_name} ${selDriver.last_name}` : '—' },
                ].map((row, i) => (
                  <div key={row.l}
                    className={`flex items-center justify-between px-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <span className="text-slate-500 font-medium">{row.l}</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[60%] truncate">{row.v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── nav buttons ── */}
        <div className="px-4 py-3 border-t border-slate-100 flex gap-2 bg-white">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
              <ChevronLeft size={15} /> Anterior
            </button>
          )}
          {step < 5 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1565C0] text-white text-sm font-bold hover:bg-[#0F4C91] transition-colors">
              Siguiente <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={saveQuote} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1B7F4F] text-white text-sm font-bold hover:bg-[#16633e] transition-colors disabled:opacity-50">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={15} />}
              {saving ? 'Guardando...' : 'Guardar cotización'}
            </button>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: map placeholder ── */}
      <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(21,101,192,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(21,101,192,.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="relative text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
            <MapPin size={28} className="text-[#1565C0]" />
          </div>
          <p className="text-slate-500 font-semibold text-sm mb-1">Mapa de ruta</p>
          {origin && destination ? (
            <p className="text-[#1565C0] font-bold">{origin} → {destination}</p>
          ) : (
            <p className="text-slate-400 text-xs">Define origen y destino para ver la ruta</p>
          )}
          {origin && destination && (
            <div className="mt-4 bg-white rounded-xl shadow p-4 text-sm space-y-1 text-left min-w-[220px]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#1B7F4F]" />
                <span className="font-medium text-slate-700">{origin}</span>
              </div>
              <div className="w-px h-4 bg-slate-300 ml-[5px]" />
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#C0392B]" />
                <span className="font-medium text-slate-700">{destination}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex gap-4 text-[11px] text-slate-500">
                <span className="font-bold text-[#1565C0]">{distKm} km</span>
                <span>{Math.floor(durationMin/60)}h {durationMin%60}m</span>
                <span className="text-amber-600">{roadType}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── small components ── */
function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
      {children}
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

function ChipGroup({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
            ${value === o
              ? 'border-[#1565C0] bg-blue-50 text-[#1565C0] shadow-[0_0_0_3px_#e8f0fb]'
              : 'border-slate-200 text-slate-500 hover:border-[#1565C0] hover:text-[#1565C0] hover:bg-blue-50'
            }`}>
          {o}
        </button>
      ))}
    </div>
  )
}

function CostRow({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-slate-200">
      <span className="text-sm flex-1 text-slate-700 font-medium">{label}</span>
      {hint && <span className="text-[10px] text-slate-400 hidden sm:block">{hint}</span>}
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-400">$</span>
        <input type="number" min={0}
          className="w-24 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800 outline-none focus:border-[#1565C0] focus:bg-white"
          value={value} onChange={e => onChange(Number(e.target.value))} />
      </div>
    </div>
  )
}

function SeatIcon({ cl }: { cl: string }) {
  const colors = {
    av: { back: '#4a90d9', head: '#5ba0e8', seat: '#3070b8', border: '#2060a8' },
    sl: { back: '#1565C0', head: '#1e7ae0', seat: '#0d3a75', border: '#0a2d5e' },
    tk: { back: '#b8bec8', head: '#c8cdd6', seat: '#9aa0ac', border: '#8890a0' },
    vp: { back: '#c59b24', head: '#d4af37', seat: '#a07a18', border: '#8a6510' },
  } as any
  const c = colors[cl] ?? colors.av
  return (
    <svg viewBox="0 0 34 38" width="20" height="22" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none">
      <rect x="3" y="2" width="28" height="20" rx="5" fill={c.back}/>
      <rect x="5" y="3" width="24" height="8" rx="3" fill={c.head} opacity=".6"/>
      <rect x="1" y="8" width="4" height="12" rx="2" fill={c.border}/>
      <rect x="29" y="8" width="4" height="12" rx="2" fill={c.border}/>
      <rect x="4" y="20" width="26" height="14" rx="4" fill={c.seat}/>
      <line x1="17" y1="21" x2="17" y2="33" stroke={c.border} strokeWidth=".8" opacity=".4"/>
    </svg>
  )
}

function VehicleSVG({ type }: { type: string }) {
  const t = type.toLowerCase()
  if (t.includes('van') || t.includes('camioneta')) return (
    <svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-2">
      <rect x="5" y="20" width="90" height="28" rx="6" fill="#4a7bc4"/>
      <rect x="20" y="12" width="55" height="22" rx="5" fill="#5a8ad4"/>
      <rect x="25" y="15" width="22" height="15" rx="3" fill="#b8d4f8"/>
      <rect x="50" y="15" width="20" height="15" rx="3" fill="#b8d4f8"/>
      <circle cx="25" cy="50" r="8" fill="#1a1a2e"/><circle cx="25" cy="50" r="4" fill="#888"/>
      <circle cx="78" cy="50" r="8" fill="#1a1a2e"/><circle cx="78" cy="50" r="4" fill="#888"/>
      <rect x="95" y="28" width="18" height="12" rx="3" fill="#d4a820"/>
    </svg>
  )
  if (t.includes('mini')) return (
    <svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-2">
      <rect x="3" y="18" width="108" height="30" rx="6" fill="#3d6cb5"/>
      <rect x="15" y="10" width="75" height="22" rx="5" fill="#4a7bc4"/>
      <rect x="18" y="13" width="28" height="14" rx="3" fill="#b8d4f8"/>
      <rect x="52" y="13" width="28" height="14" rx="3" fill="#b8d4f8"/>
      <circle cx="22" cy="51" r="8" fill="#1a1a2e"/><circle cx="22" cy="51" r="4" fill="#888"/>
      <circle cx="95" cy="51" r="8" fill="#1a1a2e"/><circle cx="95" cy="51" r="4" fill="#888"/>
    </svg>
  )
  return (
    <svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-2">
      <rect x="2" y="16" width="112" height="32" rx="7" fill="#2c5282"/>
      <rect x="10" y="8" width="85" height="24" rx="6" fill="#3d6cb5"/>
      <rect x="14" y="11" width="20" height="14" rx="3" fill="#b8d4f8"/>
      <rect x="40" y="11" width="20" height="14" rx="3" fill="#b8d4f8"/>
      <rect x="66" y="11" width="20" height="14" rx="3" fill="#b8d4f8"/>
      <circle cx="20" cy="51" r="8" fill="#1a1a2e"/><circle cx="20" cy="51" r="4" fill="#888"/>
      <circle cx="50" cy="51" r="8" fill="#1a1a2e"/><circle cx="50" cy="51" r="4" fill="#888"/>
      <circle cx="98" cy="51" r="8" fill="#1a1a2e"/><circle cx="98" cy="51" r="4" fill="#888"/>
    </svg>
  )
}

function OperatorSVG() {
  return (
    <svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="56" height="56" fill="#e8edf8"/>
      <circle cx="28" cy="20" r="10" fill="#1565C0"/>
      <rect x="8" y="34" width="40" height="22" rx="8" fill="#1565C0"/>
      <rect x="12" y="34" width="32" height="10" rx="4" fill="#0d3a75"/>
    </svg>
  )
}
