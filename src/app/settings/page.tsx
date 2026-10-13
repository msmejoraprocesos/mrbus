'use client'
import { useState } from 'react'
import { Settings, Building2, Users, Bell, Shield, Palette, MapPin, Phone, Mail, Globe, Save, Eye, EyeOff } from 'lucide-react'

export default function SettingsPage() {
  const [tab, setTab] = useState<'empresa' | 'usuarios' | 'notificaciones' | 'seguridad' | 'apariencia'>('empresa')
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const [empresa, setEmpresa] = useState({
    razon_social: 'MrBus Transportes S.A. de C.V.',
    rfc: 'MBT240115XY3',
    nombre_comercial: 'MrBus',
    telefono: '+52 55 4321 8765',
    email: 'operaciones@mrbus.mx',
    sitio_web: 'www.mrbus.mx',
    calle: 'Av. Insurgentes Sur 1234',
    ciudad: 'Ciudad de México',
    estado: 'CDMX',
    cp: '06600',
    pais: 'México',
    moneda: 'MXN',
    zona_horaria: 'America/Mexico_City',
  })

  const [notifs, setNotifs] = useState({
    leads_sin_contacto: true,
    mantenimiento_vencido: true,
    documentos_por_vencer: true,
    caja_bajo_minimo: true,
    viajes_hoy: true,
    email_resumen_diario: false,
    whatsapp_alertas: false,
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const TABS = [
    { key: 'empresa',         label: 'Empresa',           Icon: Building2 },
    { key: 'usuarios',        label: 'Usuarios',           Icon: Users     },
    { key: 'notificaciones',  label: 'Notificaciones',     Icon: Bell      },
    { key: 'seguridad',       label: 'Seguridad',          Icon: Shield    },
    { key: 'apariencia',      label: 'Apariencia',         Icon: Palette   },
  ] as const

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Configuración</h1>
          <p className="text-sm text-slate-500">Parámetros generales del sistema y la organización</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ background: saved ? '#16A34A' : '#0F172A', color: '#fff' }}
        >
          <Save size={14} />
          {saved ? 'Guardado ✓' : 'Guardar cambios'}
        </button>
      </div>

      <div className="flex gap-5">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
                style={tab === t.key
                  ? { background: '#EFF6FF', color: '#1D4ED8' }
                  : { color: '#64748B' }
                }
              >
                <t.Icon size={15} />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Empresa */}
          {tab === 'empresa' && (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="font-semibold text-slate-800 mb-4 text-sm flex items-center gap-2"><Building2 size={15} /> Datos de la empresa</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Razón social', key: 'razon_social', full: true },
                    { label: 'RFC', key: 'rfc' },
                    { label: 'Nombre comercial', key: 'nombre_comercial' },
                    { label: 'Teléfono', key: 'telefono', Icon: Phone },
                    { label: 'Correo electrónico', key: 'email', Icon: Mail },
                    { label: 'Sitio web', key: 'sitio_web', Icon: Globe },
                  ].map((f: any) => (
                    <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
                      <input
                        value={(empresa as any)[f.key]}
                        onChange={e => setEmpresa(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-slate-100" />

              <div>
                <h2 className="font-semibold text-slate-800 mb-4 text-sm flex items-center gap-2"><MapPin size={15} /> Dirección fiscal</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Calle y número</label>
                    <input value={empresa.calle} onChange={e => setEmpresa(p => ({ ...p, calle: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ciudad</label>
                    <input value={empresa.ciudad} onChange={e => setEmpresa(p => ({ ...p, ciudad: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
                    <input value={empresa.estado} onChange={e => setEmpresa(p => ({ ...p, estado: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">C.P.</label>
                    <input value={empresa.cp} onChange={e => setEmpresa(p => ({ ...p, cp: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              <div>
                <h2 className="font-semibold text-slate-800 mb-4 text-sm flex items-center gap-2"><Settings size={15} /> Preferencias del sistema</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Moneda</label>
                    <select value={empresa.moneda} onChange={e => setEmpresa(p => ({ ...p, moneda: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white">
                      <option>MXN</option><option>USD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Zona horaria</label>
                    <select value={empresa.zona_horaria} onChange={e => setEmpresa(p => ({ ...p, zona_horaria: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white">
                      <option value="America/Mexico_City">America/Mexico_City (CST)</option>
                      <option value="America/Cancun">America/Cancun (EST)</option>
                      <option value="America/Hermosillo">America/Hermosillo (MST)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Usuarios */}
          {tab === 'usuarios' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 text-sm">Usuarios del sistema</h2>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                  <Users size={13} /> Invitar usuario
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left">Nombre</th>
                    <th className="px-4 py-2.5 text-left">Correo</th>
                    <th className="px-4 py-2.5 text-left">Rol</th>
                    <th className="px-4 py-2.5 text-left">Estado</th>
                    <th className="px-4 py-2.5 text-left">Último acceso</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { nombre: 'Marco Sánchez', email: 'msmejoraprocesos@gmail.com', rol: 'Administrador', activo: true, ultimo: 'Hoy 09:14' },
                    { nombre: 'Carlos Mendoza', email: 'carlos@mrbus.mx', rol: 'Operaciones', activo: true, ultimo: 'Hoy 08:32' },
                    { nombre: 'Ana Torres', email: 'ana@mrbus.mx', rol: 'Comercial', activo: true, ultimo: 'Ayer 17:05' },
                    { nombre: 'Luis Herrera', email: 'luis@mrbus.mx', rol: 'Finanzas', activo: false, ultimo: 'Hace 5 días' },
                  ].map(u => (
                    <tr key={u.email} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                            {u.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="font-medium text-slate-700">{u.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">{u.rol}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${u.activo ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{u.ultimo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notificaciones */}
          {tab === 'notificaciones' && (
            <div className="p-6 space-y-6">
              <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2"><Bell size={15} /> Alertas del sistema</h2>
              <div className="space-y-3">
                {[
                  { key: 'leads_sin_contacto',    label: 'Leads sin contacto (7+ días)',      desc: 'Aparece en dashboard y CRM' },
                  { key: 'mantenimiento_vencido',  label: 'Mantenimientos vencidos',            desc: 'Alerta cuando una orden está pendiente' },
                  { key: 'documentos_por_vencer',  label: 'Documentos por vencer (30 días)',    desc: 'Placas, seguros, permisos de unidades' },
                  { key: 'caja_bajo_minimo',       label: 'Caja chica bajo mínimo',             desc: 'Cuando el saldo cae debajo del umbral' },
                  { key: 'viajes_hoy',             label: 'Resumen de viajes del día',          desc: 'Al inicio de jornada, conteo de viajes activos' },
                  { key: 'email_resumen_diario',   label: 'Resumen diario por correo',          desc: 'Email con KPIs del día anterior' },
                  { key: 'whatsapp_alertas',       label: 'Alertas por WhatsApp',               desc: 'Notificaciones críticas vía WhatsApp Business' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between py-3 border-b border-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{n.label}</p>
                      <p className="text-xs text-slate-400">{n.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifs(p => ({ ...p, [n.key]: !(p as any)[n.key] }))}
                      className="relative w-10 h-6 rounded-full transition-colors"
                      style={{ background: (notifs as any)[n.key] ? '#1D4ED8' : '#E2E8F0' }}
                    >
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                        style={{ left: (notifs as any)[n.key] ? '18px' : '2px' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seguridad */}
          {tab === 'seguridad' && (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="font-semibold text-slate-800 mb-4 text-sm flex items-center gap-2"><Shield size={15} /> API y acceso externo</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">API Key de producción</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value="mrbus_live_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
                          readOnly
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none font-mono bg-slate-50"
                        />
                      </div>
                      <button onClick={() => setShowKey(!showKey)} className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500">
                        {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Nunca compartas esta clave. Úsala solo en entornos seguros.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Sesiones activas</p>
                    {[
                      { ip: '187.203.14.52', ciudad: 'Ciudad de México', navegador: 'Chrome 130', cuando: 'Ahora' },
                      { ip: '201.175.23.8', ciudad: 'Monterrey', navegador: 'Safari 18', cuando: 'Hace 2 horas' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-600">{s.ip} · {s.ciudad} · {s.navegador}</span>
                        <span className="text-slate-400">{s.cuando}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <hr className="border-slate-100" />
              <div>
                <h2 className="font-semibold text-slate-800 mb-4 text-sm">Cambiar contraseña</h2>
                <div className="space-y-3 max-w-sm">
                  {['Contraseña actual', 'Nueva contraseña', 'Confirmar nueva contraseña'].map(l => (
                    <div key={l}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">{l}</label>
                      <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
                    </div>
                  ))}
                  <button className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700">Actualizar contraseña</button>
                </div>
              </div>
            </div>
          )}

          {/* Apariencia */}
          {tab === 'apariencia' && (
            <div className="p-6 space-y-6">
              <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2"><Palette size={15} /> Tema e idioma</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-3">Tema del sistema</label>
                <div className="flex gap-3">
                  {[
                    { key: 'light', label: 'Claro', preview: 'bg-white border-2 border-blue-500' },
                    { key: 'dark',  label: 'Oscuro', preview: 'bg-slate-800' },
                    { key: 'auto',  label: 'Automático', preview: 'bg-gradient-to-r from-white to-slate-800' },
                  ].map(t => (
                    <button key={t.key} className="flex flex-col items-center gap-2">
                      <div className={`w-20 h-12 rounded-lg ${t.preview} shadow-sm`} />
                      <span className="text-xs text-slate-600 font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Idioma</label>
                <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white">
                  <option>Español (México)</option>
                  <option>English (US)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Formato de fecha</label>
                <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
