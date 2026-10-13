'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Wallet, LineChart, BookOpen, PieChart, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react'

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [pendingCXCCount, setPendingCXCCount] = useState(0)
  const [overdueCXCCount, setOverdueCXCCount] = useState(0)
  const [totalCXC, setTotalCXC] = useState(0)
  const [pendingCXPCount, setPendingCXPCount] = useState(0)
  const [overdueCXPCount, setOverdueCXPCount] = useState(0)
  const [totalCXP, setTotalCXP] = useState(0)
  const [totalBankBalance, setTotalBankBalance] = useState(0)
  const [cajasOpen, setCajasOpen] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [cxcRes, cxpRes, cajaRes, tesoreriaRes] = await Promise.all([
      supabase.from('accounts_receivable').select('id, status, amount, paid_amount'),
      supabase.from('accounts_payable').select('id, status, amount, due_date'),
      supabase.from('petty_cash').select('id, balance, max_balance').eq('status', 'open'),
      supabase.from('bank_accounts').select('id, balance').eq('active', true),
    ])

    const cxc = (cxcRes.data ?? []) as unknown as { id: string; status: string; amount: number | null; paid_amount: number | null }[]
    const cxp = (cxpRes.data ?? []) as unknown as { id: string; status: string; amount: number | null; due_date: string | null }[]
    const cajas = (cajaRes.data ?? []) as unknown as { id: string; balance: number | null; max_balance: number | null }[]
    const bankAccounts = (tesoreriaRes.data ?? []) as unknown as { id: string; balance: number | null }[]

    const pendingCXC = cxc.filter(r => r.status === 'pending' || r.status === 'partial')
    const overdueCXC = cxc.filter(r => r.status === 'overdue')
    const pendingCXP = cxp.filter(r => r.status === 'pending' || r.status === 'partial')
    const overdueCXP = cxp.filter(r => r.status === 'overdue')

    setPendingCXCCount(pendingCXC.length)
    setOverdueCXCCount(overdueCXC.length)
    setTotalCXC(pendingCXC.reduce((s, r) => s + ((r.amount ?? 0) - (r.paid_amount ?? 0)), 0))
    setPendingCXPCount(pendingCXP.length)
    setOverdueCXPCount(overdueCXP.length)
    setTotalCXP(pendingCXP.reduce((s, r) => s + (r.amount ?? 0), 0))
    setTotalBankBalance(bankAccounts.reduce((s, a) => s + (a.balance ?? 0), 0))
    setCajasOpen(cajas.length)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

  const modules = [
    {
      name: 'Cuentas por Cobrar',
      desc: 'Facturas y cobros pendientes. Semáforo de vencimiento y abonos.',
      href: '/finanzas/cxc',
      icon: TrendingUp,
      color: '#0F766E',
      bg: '#CCFBF1',
      stats: [`${pendingCXCCount} pendientes`, fmt(totalCXC) + ' por cobrar', overdueCXCCount > 0 ? `${overdueCXCCount} vencidas` : ''],
      alert: overdueCXCCount > 0,
    },
    {
      name: 'Cuentas por Pagar',
      desc: 'Obligaciones con proveedores. Fechas límite y programación.',
      href: '/finanzas/cxp',
      icon: TrendingDown,
      color: '#DC2626',
      bg: '#FFF1F2',
      stats: [`${pendingCXPCount} pendientes`, fmt(totalCXP) + ' por pagar', overdueCXPCount > 0 ? `${overdueCXPCount} vencidas` : ''],
      alert: overdueCXPCount > 0,
    },
    {
      name: 'Caja Chica',
      desc: 'Registro de gastos menores. Apertura y corte de caja diario.',
      href: '/finanzas/caja',
      icon: Wallet,
      color: '#D97706',
      bg: '#FFFBEB',
      stats: [cajasOpen > 0 ? `${cajasOpen} caja(s) abiertas` : 'Sin cajas abiertas'],
      alert: false,
    },
    {
      name: 'Tesorería',
      desc: 'Posición de efectivo por cuenta. Flujo del día y proyección.',
      href: '/finanzas/tesoreria',
      icon: LineChart,
      color: '#1D4ED8',
      bg: '#DBEAFE',
      stats: [fmt(totalBankBalance) + ' total bancario'],
      alert: false,
    },
    {
      name: 'Contabilidad',
      desc: 'Libro diario, mayor y estados financieros.',
      href: '/finanzas/contabilidad',
      icon: BookOpen,
      color: '#7C3AED',
      bg: '#EDE9FE',
      stats: ['Pólizas y catálogo SAT'],
      alert: false,
    },
    {
      name: 'Presupuestos',
      desc: 'Presupuesto mensual vs real. Desviaciones y alertas.',
      href: '/finanzas/presupuestos',
      icon: PieChart,
      color: '#BE123C',
      bg: '#FFE4E6',
      stats: ['Comparativo vs presupuesto'],
      alert: false,
    },
  ]

  if (loading) return <div className="p-8 text-slate-500 text-sm">Cargando...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Finanzas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Control financiero: cobros, pagos, caja y análisis de rentabilidad</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Por cobrar',   value: fmt(totalCXC),             color: '#0F766E', bg: '#CCFBF1', icon: TrendingUp },
          { label: 'Por pagar',    value: fmt(totalCXP),             color: '#DC2626', bg: '#FFF1F2', icon: TrendingDown },
          { label: 'CXC vencidas', value: String(overdueCXCCount),   color: overdueCXCCount > 0 ? '#DC2626' : '#16A34A', bg: overdueCXCCount > 0 ? '#FFF1F2' : '#F0FDF4', icon: AlertTriangle },
          { label: 'Saldo bancario', value: fmt(totalBankBalance),   color: '#1D4ED8', bg: '#DBEAFE', icon: LineChart },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-slate-500">{k.label}</p>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.bg }}>
                <k.icon size={14} style={{ color: k.color }} />
              </span>
            </div>
            <p className="text-lg font-bold leading-tight" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map(m => (
          <Link key={m.name} href={m.href}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: m.bg }}>
              <m.icon size={18} style={{ color: m.color }} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-800">{m.name}</h3>
                {m.alert && <AlertTriangle size={12} className="text-amber-500" />}
              </div>
              <p className="text-xs text-slate-500 mb-2">{m.desc}</p>
              <div className="flex flex-wrap gap-2">
                {m.stats.filter(Boolean).map(s => (
                  <span key={s} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{s}</span>
                ))}
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  )
}
