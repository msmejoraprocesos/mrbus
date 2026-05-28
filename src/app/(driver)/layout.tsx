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
  if (!['driver','admin','super_admin','supervisor'].includes(profile.role?.name ?? '')) {
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
