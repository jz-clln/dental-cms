// src/app/layout.tsx
//
// UPDATE: added <CookieBanner /> — renders once, at the root, so it
// covers every route (public pages and the dashboard) rather than being
// duplicated per layout. See src/components/legal/CookieBanner.tsx for
// why this is a notice, not a full consent manager.
//
// UPDATE: statusBarStyle 'default' -> 'black-translucent' + viewportFit
// 'cover'. This is what lets content draw *under* the iOS status bar
// instead of iOS painting a plain white bar on top of you — the actual
// color behind the clock/wifi/battery icons now comes from the
// safe-area-inset-top block in global.css, not from this file alone.
// themeColor here covers non-iOS browser chrome (e.g. Android Chrome's
// address bar in non-installed mode).
import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './global.css';
import { Toaster } from 'sonner';
import { CookieBanner } from '@/components/legal/CookieBanner';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Bitey',
  description: 'Clinic management system for dental practices',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Bitey - Dental Clinic Management System',
  },
};

export const viewport: Viewport = {
  themeColor: '#004730',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
        {children}
        <Toaster position="top-right" richColors />
        <CookieBanner />
      </body>
    </html>
  );
}