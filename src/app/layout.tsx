import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: { default: 'MrBus', template: '%s | MrBus' },
  description: 'Sistema integral de gestión para transporte de personal y turismo',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0F3460',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
