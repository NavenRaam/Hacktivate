import './globals.css'

export const metadata = {
  title: 'Arovy - Disruption Control Panel',
  description: 'Parametric Income Protection for Q-Commerce Workers'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 antialiased">{children}</body>
    </html>
  )
}