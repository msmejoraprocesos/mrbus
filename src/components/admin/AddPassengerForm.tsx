'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserPlus, Loader2, Upload } from 'lucide-react'

interface Props {
  tripId: string
  capacity: number
  currentCount: number
}

export default function AddPassengerForm({ tripId, capacity, currentCount }: Props) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '',
    payment_status: 'pending', payment_amount: '',
  })

  const remaining = capacity - currentCount

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name || !form.last_name) {
      toast.error('Nombre y apellido son obligatorios')
      return
    }
    if (remaining <= 0) {
      toast.error('El viaje ya alcanzó su capacidad máxima')
      return
    }

    setLoading(true)
    const res = await fetch(`/api/trips/${tripId}/passengers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        payment_amount: form.payment_amount ? parseFloat(form.payment_amount) : undefined,
      }),
    })
    const result = await res.json()
    setLoading(false)

    if (!result.success) { toast.error(result.error ?? 'Error'); return }

    toast.success(`${form.first_name} ${form.last_name} agregado`)
    setForm({ first_name: '', last_name: '', phone: '', payment_status: 'pending', payment_amount: '' })
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">{remaining}</span> lugares disponibles de {capacity}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setOpen(!open)} className="btn-secondary text-xs py-1.5 px-3">
            <UserPlus className="w-3.5 h-3.5" />
            Agregar pasajero
          </button>
        </div>
      </div>

      {open && (
        <form onSubmit={handleAdd} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Nombre *</label>
              <input className="input text-sm" placeholder="Juan" value={form.first_name}
                onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Apellido *</label>
              <input className="input text-sm" placeholder="García" value={form.last_name}
                onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Teléfono</label>
              <input className="input text-sm" placeholder="998 123 4567" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Estado de pago</label>
              <select className="input text-sm" value={form.payment_status}
                onChange={e => setForm(p => ({ ...p, payment_status: e.target.value }))}>
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="partial">Parcial</option>
                <option value="complimentary">Cortesía</option>
              </select>
            </div>
          </div>
          {form.payment_status !== 'pending' && form.payment_status !== 'complimentary' && (
            <div>
              <label className="label text-xs">Monto pagado (MXN)</label>
              <input type="number" className="input text-sm" placeholder="0.00" min="0" step="0.01"
                value={form.payment_amount}
                onChange={e => setForm(p => ({ ...p, payment_amount: e.target.value }))} />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-xs py-1.5">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary text-xs py-1.5">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
              Agregar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
