import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
export const dynamic = 'force-dynamic'

export default async function DriverProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('first_name, last_name, email, phone').eq('id', user.id).single()

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-8 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi perfil</h1>
      <div className="card p-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-white text-2xl font-bold mx-auto">
          {(profile?.first_name?.[0] ?? '') + (profile?.last_name?.[0] ?? '')}
        </div>
        <div className="text-center">
          <p className="font-bold text-lg">{profile?.first_name} {profile?.last_name}</p>
          <p className="text-gray-500 text-sm">{profile?.email}</p>
        </div>
        {profile?.phone && <p className="text-center text-gray-600 text-sm">{profile.phone}</p>}
      </div>
      <form action="/api/auth/signout" method="post" className="mt-6">
        <button type="submit" className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl flex items-center justify-center gap-2">
          <LogOut className="w-5 h-5" />Cerrar sesión
        </button>
      </form>
    </div>
  )
}
