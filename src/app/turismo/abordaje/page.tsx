'use client'
import { useState } from 'react'
import { Users, Bus, QrCode, CheckCircle2, Clock, MapPin, Search, RefreshCw, UserCheck, XCircle } from 'lucide-react'

interface Viaje {
  id: string
  folio: string
  destino: string
  hora_salida: string
  unidad: string
  operador: string
  total_boletos: number
  abordados: number
  estado: 'pendiente' | 'abordando' | 'completo' | 'retrasado'
}

interface Pasajero {
  id: string
  boleto: string
  nombre: string
  asiento: number
  abordado: boolean
  hora_abordaje?: string
  tipo: 'adulto' | 'menor' | 'pensionado'
}

const VIAJES: Viaje[] = [
  { id: '1', folio: 'T-2026-1021', destino: 'Cancún, Q.Roo', hora_salida: '06:00', unidad: 'VOL-003 · Volvo B11R', operador: 'Roberto Herrera', total_boletos: 48, abordados: 31, estado: 'abordando' },
  { id: '2', folio: 'T-2026-1022', destino: 'Puerto Vallarta, Jal.', hora_salida: '07:30', unidad: 'SCA-001 · Scania K360', operador: 'Carlos Ruiz', total_boletos: 50, abordados: 50, estado: 'completo' },
  { id: '3', folio: 'T-2026-1023', destino: 'Veracruz, Ver.', hora_salida: '08:00', unidad: 'MER-002 · Mercedes O500', operador: 'Luis Torres', total_boletos: 44, abordados: 0, estado: 'pendiente' },
  { id: '4', folio: 'T-2026-1024', destino: 'Guadalajara, Jal.', hora_salida: '05:45', unidad: 'VOL-001 · Volvo B11R', operador: 'Héctor Vega', total_boletos: 48, abordados: 28, estado: 'retrasado' },
]

const PASAJEROS: Record<string, Pasajero[]> = {
  '1': [
    { id: 'p1',  boleto: '1021-001', nombre: 'García Martínez, Ana', asiento: 1,  abordado: true,  hora_abordaje: '05:42', tipo: 'adulto' },
    { id: 'p2',  boleto: '1021-002', nombre: 'López Hernández, Juan', asiento: 2, abordado: true,  hora_abordaje: '05:45', tipo: 'adulto' },
    { id: 'p3',  boleto: '1021-003', nombre: 'Rodríguez Silva, María', asiento: 3, abordado: true, hora_abordaje: '05:48', tipo: 'adulto' },
    { id: 'p4',  boleto: '1021-004', nombre: 'Martínez Cruz, Pedro', asiento: 4, abordado: false, tipo: 'adulto' },
    { id: 'p5',  boleto: '1021-005', nombre: 'Sánchez Flores, Laura', asiento: 5, abordado: true, hora_abordaje: '05:50', tipo: 'adulto' },
    { id: 'p6',  boleto: '1021-006', nombre: 'González Pérez, Carlos', asiento: 6, abordado: false, tipo: 'adulto' },
    { id: 'p7',  boleto: '1021-007', nombre: 'Torres Vargas, Rosa', asiento: 7, abordado: true, hora_abordaje: '05:52', tipo: 'pensionado' },
    { id: 'p8',  boleto: '1021-008', nombre: 'Ramírez Juárez, Luis', asiento: 8, abordado: false, tipo: 'adulto' },
    { id: 'p9',  boleto: '1021-009', nombre: 'Flores Reyes, Sofía', asiento: 9, abordado: true, hora_abordaje: '05:53', tipo: 'menor' },
    { id: 'p10', boleto: '1021-010', nombre: 'Jiménez López, Marco', asiento: 10, abordado: false, tipo: 'adulto' },
  ]
}

const ESTADO_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  pendiente:  { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', label: 'Pendiente' },
  abordando:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Abordando' },
  completo:   { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', label: 'Completo' },
  retrasado:  { color: '#DC2626', bg: '#FFF1F2', border: '#FECDD3', label: 'Retrasado' },
}

export default function AbordajePage() {
  const [viajeId, setViajeId] = useState<string>('1')
  const [buscar, setBuscar] = useState('')
  const [pasajeros, setPasajeros] = useState<Record<string, Pasajero[]>>(PASAJEROS)

  const viaje = VIAJES.find(v => v.id === viajeId)!
  const lista = (pasajeros[viajeId] || []).filter(p =>
    !buscar || p.nombre.toLowerCase().includes(buscar.toLowerCase()) || p.boleto.includes(buscar)
  )

  const toggleAbordaje = (pId: string) => {
    setPasajeros(prev => ({
      ...prev,
      [viajeId]: (prev[viajeId] || []).map(p =>
        p.id === pId
          ? { ...p, abordado: !p.abordado, hora_abordaje: !p.abordado ? new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : undefined }
          : p
      )
    }))
  }

  const abordados = (pasajeros[viajeId] || []).filter(p => p.abordado).length
  const total     = (pasajeros[viajeId] || []).length || viaje.total_boletos
  const pct       = total > 0 ? (abordados / total) * 100 : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Abordaje</h1>
          <p className="text-sm text-slate-500">Control de acceso y validación de boletos</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Selector de viaje */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {VIAJES.map(v => {
          const ec = ESTADO_CONFIG[v.estado]
          const p  = v.total_boletos > 0 ? (v.abordados / v.total_boletos) * 100 : 0
          return (
            <button
              key={v.id}
              onClick={() => setViajeId(v.id)}
              className="text-left rounded-xl border p-3 transition-all"
              style={viajeId === v.id ? { borderColor: '#1D4ED8', background: '#EFF6FF' } : { borderColor: '#E2E8F0', background: '#fff' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400">{v.folio}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium" style={{ background: ec.bg, color: ec.color, borderColor: ec.border }}>
                  {ec.label}
                </span>
              </div>
              <p className="font-semibold text-slate-800 text-sm flex items-center gap-1">
                <MapPin size={11} className="text-slate-400" /> {v.destino}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Salida: {v.hora_salida} · {v.unidad.split(' · ')[0]}</p>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Abordados</span>
                  <span className="font-semibold text-slate-700">{v.abordados}/{v.total_boletos}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: p === 100 ? '#16A34A' : '#1D4ED8' }} />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Panel principal del viaje activo */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Info viaje */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bus size={16} className="text-slate-600" />
                <h2 className="font-bold text-slate-800">{viaje.destino}</h2>
                <span className="font-mono text-xs text-slate-400">· {viaje.folio}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock size={11} /> Salida: {viaje.hora_salida}</span>
                <span>{viaje.unidad}</span>
                <span>Op: {viaje.operador}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-800">{abordados}<span className="text-lg text-slate-400">/{total || viaje.total_boletos}</span></p>
              <p className="text-xs text-slate-500">pasajeros abordados</p>
              <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden mt-1 ml-auto">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#16A34A' : '#1D4ED8' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Búsqueda y acciones */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-50">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              placeholder="Buscar pasajero o número de boleto…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <QrCode size={14} /> Escanear QR
          </button>
        </div>

        {/* Lista de pasajeros */}
        {lista.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-2.5 text-left">Pasajero</th>
                <th className="px-5 py-2.5 text-left">Boleto</th>
                <th className="px-5 py-2.5 text-center">Asiento</th>
                <th className="px-5 py-2.5 text-left">Tipo</th>
                <th className="px-5 py-2.5 text-left">Hora abordaje</th>
                <th className="px-5 py-2.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(p => (
                <tr key={p.id} className={`border-t border-slate-50 ${p.abordado ? 'bg-green-50/30' : 'hover:bg-slate-50/50'}`}>
                  <td className="px-5 py-2.5 font-medium text-slate-700">{p.nombre}</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{p.boleto}</td>
                  <td className="px-5 py-2.5 text-center">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center justify-center">{p.asiento}</span>
                  </td>
                  <td className="px-5 py-2.5 text-xs text-slate-500 capitalize">{p.tipo}</td>
                  <td className="px-5 py-2.5 text-xs text-slate-500">
                    {p.hora_abordaje
                      ? <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={12} /> {p.hora_abordaje}</span>
                      : <span className="text-slate-300">—</span>
                    }
                  </td>
                  <td className="px-5 py-2.5 text-center">
                    <button
                      onClick={() => toggleAbordaje(p.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                      style={p.abordado
                        ? { background: '#DCFCE7', color: '#16A34A' }
                        : { background: '#EFF6FF', color: '#2563EB' }
                      }
                    >
                      {p.abordado
                        ? <><UserCheck size={12} /> Abordado</>
                        : <><CheckCircle2 size={12} /> Confirmar</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">
            {pasajeros[viajeId]
              ? 'No se encontraron pasajeros con ese criterio.'
              : 'Selecciona un viaje con lista de pasajeros cargada.'
            }
          </div>
        )}
      </div>

      {/* Estadísticas rápidas */}
      {pasajeros[viajeId] && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Abordados', value: abordados, color: '#16A34A', bg: '#F0FDF4', Icon: CheckCircle2 },
            { label: 'Pendientes', value: total - abordados, color: '#D97706', bg: '#FFFBEB', Icon: Clock },
            { label: 'No presentados', value: total - abordados, color: '#DC2626', bg: '#FFF1F2', Icon: XCircle },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
                <k.Icon size={18} style={{ color: k.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs text-slate-500">{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
