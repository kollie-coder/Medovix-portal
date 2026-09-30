import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Medovite Admin Portal',
  description: 'Hospital administration portal for Medovite',
  icons: { icon: '/favicon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#F9FAFB] text-[#0D1117] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
