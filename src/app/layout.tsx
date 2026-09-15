// src/app/layout.tsx
//
// UPDATE: added <CookieBanner /> — renders once, at the root, so it
// covers every route (public pages and the dashboard) rather than being
// duplicated per layout. See src/components/legal/CookieBanner.tsx for
// why this is a notice, not a full consent manager.
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
    statusBarStyle: 'default',
    title: 'Bitey - Dental Clinic Management System',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f766e',
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