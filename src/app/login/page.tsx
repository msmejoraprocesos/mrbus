'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Users, Briefcase, BarChart3, Shield, Package } from 'lucide-react'
import Image from 'next/image'

const features = [
  { icon: Users,     title: 'Transporte de personal',       desc: 'Rutas fijas, empleados y asistencia digital' },
  { icon: Briefcase, title: 'Turismo y excursiones',        desc: 'Pasajeros, pagos y control de abordaje' },
  { icon: BarChart3, title: 'Gestión inteligente',          desc: 'Dashboard en tiempo real con KPIs operativos' },
  { icon: Shield,    title: 'Control total de tu operación',desc: 'Trazabilidad, compliance y auditoría' },
  { icon: Package,   title: 'Paquetería y encomiendas',     desc: 'Registro, seguimiento y entrega de paquetes' },
]

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

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
    <div className="min-h-screen flex">

      {/* IZQUIERDA — Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">

        {/* Hero image de fondo */}
        <div className="absolute inset-0 z-0">
          <Image src="/hero.jpg" alt="" fill className="object-cover object-center" priority />
          {/* Overlay gradiente para legibilidad */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, rgba(10,28,60,0.93) 0%, rgba(10,28,60,0.88) 50%, rgba(15,65,130,0.85) 100%)' }} />
        </div>

        {/* Patrón punteado */}
        <div className="absolute inset-0 z-10 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        {/* Círculos decorativos */}
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 z-10" style={{ background: '#00A86B' }} />
        <div className="absolute top-0 -left-20 w-64 h-64 rounded-full opacity-10 z-10" style={{ background: '#1976D2' }} />

        {/* Logo — mix-blend-mode elimina el fondo blanco */}
        <div className="relative z-20">
          <div className="inline-block rounded-2xl overflow-hidden"
            style={{ mixBlendMode: 'screen' }}>
            <Image src="/logo-mrbus.png" alt="MrBus" width={320} height={220}
              className="object-contain"
              style={{ filter: 'drop-shadow(0 4px 24px rgba(0,168,107,0.5)) brightness(1.1) contrast(1.05)' }}
              priority />
          </div>
        </div>

        {/* Features */}
        <div className="relative z-20 space-y-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-6">
            Todo lo que necesitas para operar
          </p>
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,168,107,0.15)', border: '1px solid rgba(0,168,107,0.3)' }}>
                  <Icon className="w-5 h-5" style={{ color: '#00A86B' }} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">{f.title}</p>
                  <p className="text-white/45 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="relative z-20">
          <p className="text-white/30 text-xs">© 2024 MrBus · Versión 1.0</p>
        </div>
      </div>

      {/* DERECHA — Formulario */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12" style={{ background: '#F2F5F7' }}>

        {/* Logo mobile */}
        <div className="lg:hidden mb-8">
          <Image src="/logo-mrbus.png" alt="MrBus" width={220} height={155} className="object-contain mx-auto" />
        </div>

        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">

            <div className="mb-7">
              <h2 className="text-2xl font-bold" style={{ color: '#0F2D52' }}>Bienvenido de nuevo</h2>
              <p className="text-gray-400 text-sm mt-1">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Correo electrónico
                </label>
                <input type="email"
                  className="w-full px-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400
                             focus:outline-none focus:ring-2 transition-all"
                  style={{ background: '#F2F5F7', border: '1.5px solid transparent' }}
                  onFocus={e => e.target.style.borderColor = '#1976D2'}
                  onBlur={e => e.target.style.borderColor = 'transparent'}
                  placeholder="tu@empresa.com"
                  value={email} onChange={e => setEmail(e.target.value)} autoFocus disabled={loading} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'}
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-gray-900 placeholder-gray-400
                               focus:outline-none focus:ring-2 transition-all"
                    style={{ background: '#F2F5F7', border: '1.5px solid transparent' }}
                    onFocus={e => e.target.style.borderColor = '#1976D2'}
                    onBlur={e => e.target.style.borderColor = 'transparent'}
                    placeholder="Mín. 8 caracteres"
                    value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
                  <button type="button" tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <a href="#" className="text-xs font-semibold" style={{ color: '#1976D2' }}>
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm
                           flex items-center justify-center gap-2 transition-all
                           hover:opacity-90 active:scale-[0.98] shadow-lg"
                style={{ background: 'linear-gradient(135deg, #0F2D52 0%, #1976D2 100%)' }}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Ingresando...</>
                  : 'Iniciar sesión'
                }
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 mt-5">
              <Shield className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs text-gray-400">Conexión segura · Datos cifrados con SSL</span>
            </div>
          </div>

          <p className="text-center text-gray-400 text-xs mt-5">
            MrBus v1.0 · Uso exclusivo de personal autorizado
          </p>
        </div>
      </div>
    </div>
  )
}
