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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('Ingresa tu correo y contraseña'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { toast.error('Credenciales incorrectas'); return }
    const { data: u } = await supabase.from('users').select('role:roles(name)').eq('id', data.user.id).single()
    const roleRaw = u?.role as { name: string }[] | { name: string } | null
    const role = Array.isArray(roleRaw) ? roleRaw[0]?.name : roleRaw?.name
    router.push(role === 'driver' ? '/driver/home' : '/dashboard')
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Wallpaper */}
      <div className="absolute inset-0 z-0">
        <Image src="/hero.jpg" alt="" fill className="object-cover object-center" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-12">

        {/* Left — Branding */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20 shadow-2xl">
            <Image src="/logo.png" alt="MrBus" width={260} height={110} className="object-contain" priority />
          </div>
          <p className="text-white/90 text-lg font-light max-w-sm leading-relaxed">
            Sistema integral de gestión para{' '}
            <span className="text-green-400 font-semibold">transporte de personal</span>{' '}
            y <span className="text-green-400 font-semibold">turismo</span>
          </p>
          <div className="flex items-center gap-3 mt-6">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/60 text-sm">Operaciones en tiempo real</span>
          </div>
        </div>

        {/* Right — Form */}
        <div className="w-full max-w-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido</h2>
            <p className="text-gray-500 text-sm mb-6">Inicia sesión para continuar</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Correo electrónico</label>
                <input type="email" className="input" placeholder="tu@empresa.com"
                  value={email} onChange={e => setEmail(e.target.value)} autoFocus disabled={loading} />
              </div>
              <div>
                <label className="label">Contraseña</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input pr-10"
                    placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} disabled={loading} />
                  <button type="button" tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-brand-700 hover:bg-brand-600 text-white font-semibold
                           rounded-xl flex items-center justify-center gap-2 transition-colors mt-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Ingresando...</> : 'Ingresar'}
              </button>
            </form>
          </div>
          <p className="text-center text-white/40 text-xs mt-4">MrBus v1.0 · Uso exclusivo de personal autorizado</p>
        </div>
      </div>
    </div>
  )
}
