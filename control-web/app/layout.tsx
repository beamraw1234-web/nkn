import './globals.css'

export const metadata = {
  title: 'Control Web',
  description: 'Control website on/off + API keys'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}

