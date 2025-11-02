import './globals.css'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'Caderno de Controle Online - IUDP',
  description: 'Sistema de Gestão Financeira Ministerial - Igreja Unida Deus Proverá',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}