import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import './globals.css'

import { WalletProvider } from '@/lib/wallet-context'

export const metadata: Metadata = {
  title: 'PromptHub // Dapps on 0G',
  description: 'Buy, sell, and trade AI prompts on 0G. Marketplace powered by the 0G network.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Fix for Wallet Extensions conflict with setImmediate polyfills */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && !window.setImmediate) {
                window.setImmediate = function(fn) {
                  var args = Array.prototype.slice.call(arguments, 1);
                  return setTimeout(function() {
                    fn.apply(null, args);
                  }, 0);
                };
                window.clearImmediate = clearTimeout;
              }
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased overflow-x-hidden" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange={false}>
          <WalletProvider>
            {children}
          </WalletProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
