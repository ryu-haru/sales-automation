import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '催事営業 自動送信ツール',
  description: '通信系催事営業会社への営業自動化ツール',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
