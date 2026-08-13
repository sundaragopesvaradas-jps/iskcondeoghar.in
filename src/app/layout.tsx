import type { Metadata, Viewport } from 'next';
import AppInsightsInit from '@/components/AppInsightsInit';
import './globals.css';

export const metadata: Metadata = {
  title: 'ISKCON Deoghar',
  description: 'Welcome to ISKCON Deoghar',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo192.png',
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
