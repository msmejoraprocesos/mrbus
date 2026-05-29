'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { initials, fullName } from '@/lib/utils'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminTopbar({ user }: { user: { first_name?: string; last_name?: string } }) {
  const router = useRouter()
  const supabase = createClient()
  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Sesión cerrada')
  }
  const name = fullName(user.first_name ?? null, user.last_name ?? null)
  const av = initials(user.first_name ?? null, user.last_name ?? null)
  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-end gap-3 flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-semibold">{av}</div>
        <span className="text-sm font-medium text-gray-700 hidden sm:block">{name}</span>
      </div>
      <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cerrar sesión">
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  )
}
