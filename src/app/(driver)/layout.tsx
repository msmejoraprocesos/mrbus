-e // @ts-nocheck
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DriverBottomNav from '@/components/driver/DriverBottomNav'

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*, role:roles(name)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Solo drivers y admins pueden ver esta sección
  // Admins redirigen al panel completo
  const roleObj2 = Array.isArray(profile.role) ? profile.role[0] : profile.role
  const roleName2 = (roleObj2 as { name?: string } | null)?.name ?? ''
  if (!['driver','admin','super_admin','supervisor'].includes(roleName2)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto relative">
      {/* Contenido */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom navigation fija */}
      <DriverBottomNav />
    </div>
  )
}
