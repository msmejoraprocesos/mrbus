// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { toast.error('Ingresa tu correo y contraseña'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { toast.error('Credenciales incorrectas.'); return }
    const { data: userData } = await supabase
      .from('users').select('role:roles(name)').eq('id', data.user.id).single()
    const roleRaw = userData?.role
    const role = Array.isArray(roleRaw) ? roleRaw[0]?.name : roleRaw?.name
    router.push(role === 'driver' ? '/driver/home' : '/dashboard')
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image src="/hero.jpg" alt="MrBus" fill className="object-cover object-center" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20 shadow-2xl">
            <Image src="/logo.png" alt="MrBus" width={260} height={110} className="object-contain drop-shadow-2xl" priority />
          </div>
          <p className="text-white/90 text-lg font-light max-w-sm leading-relaxed drop-shadow-lg">
            Sistema integral de gestión para{' '}
            <span className="text-green-400 font-semibold">transporte de personal</span> y{' '}
            <span className="text-green-400 font-semibold">turismo</span>
          </p>
          <div className="flex items-center gap-3 mt-6">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/60 text-sm">Operaciones en tiempo real</span>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Bienvenido</h2>
              <p className="text-gray-500 text-sm mt-1">Inicia sesión para continuar</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Correo electrónico</label>
                <input type="email" className="input" placeholder="tu@empresa.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" autoFocus disabled={loading} />
              </div>
              <div>
                <label className="label">Contraseña</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input pr-10"
                    placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password" disabled={loading} />
                  <button type="button" tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-[#0F3460] hover:bg-[#0a2548] active:scale-[0.98]
                           text-white font-semibold rounded-xl text-base transition-all
                           flex items-center justify-center gap-2 shadow-lg mt-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</> : 'Ingresar'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <a href="/forgot-password" className="text-sm text-[#0F3460] hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </div>
          <p className="text-center text-white/40 text-xs mt-4">
            MrBus v1.0 · Uso exclusivo de personal autorizado
          </p>
        </div>
      </div>
    </div>
  )
}
