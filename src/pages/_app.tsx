import type { AppProps } from 'next/app'
import { Geist, Geist_Mono } from 'next/font/google'
import '../styles/globals.css'
import '../styles/tic-tac-toe.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} contents`}>
      <Component {...pageProps} />
    </div>
  )
}
