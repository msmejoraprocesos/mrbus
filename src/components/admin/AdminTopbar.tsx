-e // @ts-nocheck
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { initials, fullName } from '@/lib/utils'
import { LogOut, Bell } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@/lib/types'

export default function AdminTopbar({ user }: { user: Partial<User> }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Sesión cerrada')
  }

  const name = fullName(user.first_name ?? null, user.last_name ?? null)
  const avatarInitials = initials(user.first_name ?? null, user.last_name ?? null)

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div /> {/* espacio para breadcrumbs futuro */}

      <div className="flex items-center gap-3">
        {/* Notificaciones (futuro) */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
          <Bell className="w-5 h-5" />
        </button>

        {/* Avatar + nombre */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-semibold">
            {avatarInitials}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{name}</span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
