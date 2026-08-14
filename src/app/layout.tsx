import type { Metadata, Viewport } from 'next';
import AppInsightsInit from '@/components/AppInsightsInit';
import './globals.css';

export const metadata: Metadata = {
  title: 'ISKCON Deoghar',
  description: 'Welcome to ISKCON Deoghar',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon.png', sizes: '500x500', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;600;700&family=Noto+Serif+Devanagari:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <AppInsightsInit />
        {children}
      </body>
    </html>
  );
}
