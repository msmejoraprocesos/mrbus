'use client'
import { useState } from 'react'
import { MapPin, Users, Hotel, Ticket, Clock, Star, Plus, Search, Calendar, DollarSign, Package } from 'lucide-react'

interface Paquete {
  id: string
  nombre: string
  destino: string
  duracion_dias: number
  incluye: ('transporte' | 'hotel' | 'guia' | 'entradas' | 'alimentos')[]
  precio_adulto: number
  precio_menor: number
  capacidad: number
  salidas: string[]
  disponibles: number
  activo: boolean
  imagen_color: string
  descripcion: string
}

const PAQUETES: Paquete[] = [
  {
    id: '1',
    nombre: 'Cancún All-Inclusive',
    destino: 'Cancún, Q.Roo',
    duracion_dias: 5,
    incluye: ['transporte', 'hotel', 'guia', 'entradas', 'alimentos'],
    precio_adulto: 8_900,
    precio_menor: 5_400,
    capacidad: 48,
    salidas: ['2026-11-01', '2026-11-15', '2026-12-01', '2026-12-20'],
    disponibles: 12,
    activo: true,
    imagen_color: '#06B6D4',
    descripcion: '5 días y 4 noches en Cancún. Hotel 4 estrellas frente al mar. Incluye zona arqueológica Tulum y Xcaret.',
  },
  {
    id: '2',
    nombre: 'Puerto Vallarta Romántico',
    destino: 'Puerto Vallarta, Jal.',
    duracion_dias: 4,
    incluye: ['transporte', 'hotel', 'guia'],
    precio_adulto: 6_200,
    precio_menor: 3_800,
    capacidad: 44,
    salidas: ['2026-11-07', '2026-11-21', '2026-12-05'],
    disponibles: 28,
    activo: true,
    imagen_color: '#F97316',
    descripcion: '4 días y 3 noches. Hotel boutique en el malecón. Tour a Yelapa y paseo en barco al atardecer.',
  },
  {
    id: '3',
    nombre: 'Chichén Itzá & Valladolid',
    destino: 'Yucatán',
    duracion_dias: 3,
    incluye: ['transporte', 'guia', 'entradas'],
    precio_adulto: 3_400,
    precio_menor: 2_100,
    capacidad: 50,
    salidas: ['2026-10-24', '2026-11-07', '2026-11-21'],
    disponibles: 18,
    activo: true,
    imagen_color: '#D97706',
    descripcion: 'Viaje cultural de 3 días. Chichén Itzá, cenote Ik-Kil, Valladolid colonial y convento de San Bernardino.',
  },
  {
    id: '4',
    nombre: 'Ciudad de México Cultural',
    destino: 'CDMX',
    duracion_dias: 2,
    incluye: ['transporte', 'guia', 'entradas'],
    precio_adulto: 1_800,
    precio_menor: 1_100,
    capacidad: 50,
    salidas: ['2026-10-25', '2026-11-01', '2026-11-08', '2026-11-15'],
    disponibles: 35,
    activo: true,
    imagen_color: '#6366F1',
    descripcion: 'Tour histórico. Zócalo, Palacio Nacional, Bellas Artes, Xochimilco y Coyoacán con guía especializado.',
  },
  {
    id: '5',
    nombre: 'Navidad en Tepoztlán',
    destino: 'Tepoztlán, Mor.',
    duracion_dias: 3,
    incluye: ['transporte', 'hotel', 'alimentos'],
    precio_adulto: 4_500,
    precio_menor: 2_800,
    capacidad: 40,
    salidas: ['2026-12-22', '2026-12-26'],
    disponibles: 6,
    activo: true,
    imagen_color: '#10B981',
    descripcion: 'Posadas navideñas en Tepoztlán. Hotel con alberca, excursión a la pirámide, pozole y mercado artesanal.',
  },
]

const INCLUYE_CONFIG: Record<string, { label: string; color: string }> = {
  transporte: { label: 'Transporte', color: '#2563EB' },
  hotel:      { label: 'Hotel',      color: '#7C3AED' },
  guia:       { label: 'Guía',       color: '#D97706' },
  entradas:   { label: 'Entradas',   color: '#DC2626' },
  alimentos:  { label: 'Alimentos',  color: '#16A34A' },
}

export default function PaquetesPage() {
  const [buscar, setBuscar] = useState('')
  const [paqueteSel, setPaqueteSel] = useState<Paquete | null>(null)

  const filtrados = PAQUETES.filter(p =>
    !buscar || p.nombre.toLowerCase().includes(buscar.toLowerCase()) || p.destino.toLowerCase().includes(buscar.toLowerCase())
  )

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Paquetes Turísticos</h1>
          <p className="text-sm text-slate-500">Viajes todo incluido con hotel, guía, entradas y transportación</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
          <Plus size={14} /> Nuevo paquete
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Paquetes activos', value: String(PAQUETES.filter(p => p.activo).length), color: '#0891B2', bg: '#ECFEFF', Icon: Package },
          { label: 'Próximas salidas', value: String(PAQUETES.flatMap(p => p.salidas).filter(s => s >= '2026-10-12').length), color: '#2563EB', bg: '#EFF6FF', Icon: Calendar },
          { label: 'Lugares disponibles', value: String(PAQUETES.reduce((s, p) => s + p.disponibles, 0)), color: '#16A34A', bg: '#F0FDF4', Icon: Users },
          { label: 'Precio promedio', value: fmt(PAQUETES.reduce((s, p) => s + p.precio_adulto, 0) / PAQUETES.length), color: '#7C3AED', bg: '#F5F3FF', Icon: DollarSign },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-slate-500">{k.label}</p>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.bg }}>
                <k.Icon size={14} style={{ color: k.color }} />
              </span>
            </div>
            <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          placeholder="Buscar paquete o destino…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-cyan-400"
        />
      </div>

      {/* Grid de paquetes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map(p => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setPaqueteSel(p)}
          >
            {/* Banner de color */}
            <div className="h-2" style={{ background: p.imagen_color }} />

            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{p.nombre}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {p.destino}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">desde</p>
                  <p className="font-bold text-sm" style={{ color: p.imagen_color }}>{fmt(p.precio_adulto)}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 line-clamp-2 mb-3">{p.descripcion}</p>

              {/* Incluye chips */}
              <div className="flex flex-wrap gap-1 mb-3">
                {p.incluye.map(inc => (
                  <span key={inc} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: INCLUYE_CONFIG[inc].color + '18', color: INCLUYE_CONFIG[inc].color }}>
                    {INCLUYE_CONFIG[inc].label}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock size={10} /> {p.duracion_dias} días</span>
                <span className="flex items-center gap-1"><Users size={10} /> {p.disponibles}/{p.capacidad} disponibles</span>
                <span className="flex items-center gap-1"><Calendar size={10} /> {p.salidas.length} salidas</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer detalle */}
      {paqueteSel && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setPaqueteSel(null)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative bg-white w-96 h-full shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="h-3" style={{ background: paqueteSel.imagen_color }} />
            <div className="p-6">
              <button onClick={() => setPaqueteSel(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 text-lg">✕</button>
              <h2 className="font-bold text-slate-800 text-lg mb-1">{paqueteSel.nombre}</h2>
              <p className="text-sm text-slate-500 flex items-center gap-1 mb-4"><MapPin size={12} /> {paqueteSel.destino}</p>
              <p className="text-sm text-slate-600 mb-5">{paqueteSel.descripcion}</p>

              <div className="space-y-3 text-sm mb-5">
                {[
                  ['Duración', `${paqueteSel.duracion_dias} días`],
                  ['Precio adulto', fmt(paqueteSel.precio_adulto)],
                  ['Precio menor', fmt(paqueteSel.precio_menor)],
                  ['Capacidad', `${paqueteSel.capacidad} pasajeros`],
                  ['Disponibles', `${paqueteSel.disponibles} lugares`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-medium text-slate-800">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-600 mb-2">Próximas salidas</p>
                <div className="flex flex-wrap gap-2">
                  {paqueteSel.salidas.map(s => (
                    <span key={s} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">
                      {new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-600 mb-2">Incluye</p>
                <div className="flex flex-wrap gap-2">
                  {paqueteSel.incluye.map(inc => (
                    <span key={inc} className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: INCLUYE_CONFIG[inc].color + '18', color: INCLUYE_CONFIG[inc].color }}>
                      {INCLUYE_CONFIG[inc].label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <button className="w-full py-2.5 rounded-lg text-white text-sm font-medium" style={{ background: paqueteSel.imagen_color }}>
                  Nueva reservación
                </button>
                <button className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">
                  Editar paquete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
