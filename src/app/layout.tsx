import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: { default: 'TransportOS', template: '%s | TransportOS' },
  description: 'El sistema operativo de tu empresa de movilidad',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'TransportOS' },
}

export const viewport: Viewport = {
  themeColor: '#0F3460',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Evita zoom accidental en mobile
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ duration: 4000 }}
        />
      </body>
    </html>
  )
}
