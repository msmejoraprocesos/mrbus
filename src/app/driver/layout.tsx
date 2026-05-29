import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DriverBottomNav from '@/components/driver/DriverBottomNav'

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <DriverBottomNav />
    </div>
  )
}
