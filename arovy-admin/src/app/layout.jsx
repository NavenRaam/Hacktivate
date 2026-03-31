import './globals.css'
import Sidebar from '@/components/shared/Sidebar'

export const metadata = {
  title: 'Arovy Admin',
  description: 'Parametric Income Protection · Admin Dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#05070C]">
          {children}
        </main>
      </body>
    </html>
  )
}
