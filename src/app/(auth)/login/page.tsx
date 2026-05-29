// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Bus, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Ingresa tu correo y contraseña')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      toast.error('Credenciales incorrectas. Verifica tu correo y contraseña.')
      return
    }

    // Redirigir según rol
    const { data: userData } = await supabase
      .from('users')
      .select('role:roles(name)')
      .eq('id', data.user.id)
      .single()

    const roleRaw = userData?.role
    const role = (Array.isArray(roleRaw) ? (roleRaw[0] as { name: string })?.name : (roleRaw as { name: string } | null)?.name)
    if (role === 'driver') {
      router.push('/driver/home')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Bus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">TransportOS</h1>
          <p className="text-blue-200 mt-1 text-sm">El sistema operativo de tu empresa de movilidad</p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                className="input"
                placeholder="tu@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                disabled={loading}
              />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-3 text-base"
              disabled={loading}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</> : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/forgot-password" className="text-sm text-brand-500 hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        <p className="text-center text-blue-200/60 text-xs mt-6">
          TransportOS v1.0 · Uso exclusivo de personal autorizado
        </p>
      </div>
    </div>
  )
}
