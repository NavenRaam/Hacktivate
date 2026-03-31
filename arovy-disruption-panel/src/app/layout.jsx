import './globals.css'

export const metadata = {
  title: 'Arovy — Disruption Panel',
  description: 'Parametric Income Protection · Disruption Control System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
