import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTopbar from '@/components/admin/AdminTopbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('*, role:roles(name, permissions)').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const roleRaw = profile.role as { name: string }[] | { name: string } | null
  const roleName = (Array.isArray(roleRaw) ? roleRaw[0]?.name : roleRaw?.name) ?? 'admin'
  if (roleName === 'driver') redirect('/driver/home')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar userRole={roleName} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar user={profile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
