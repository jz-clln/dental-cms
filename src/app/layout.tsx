// src/app/layout.tsx
//
// FONT SWITCH: Figtree → Poppins.
// - Poppins isn't a variable font on Google Fonts, so (unlike Figtree)
//   it needs an explicit `weight` array. Included 400/500/600/700 to
//   cover every Tailwind weight class actually used across your
//   components (font-medium, font-semibold, font-bold) — without this,
//   next/font silently substitutes the nearest weight it has, which is
//   how you end up with "every semibold looks identical to bold" bugs.
// - GeistMono kept untouched — still reserved for verification codes /
//   appointment refs, deliberately distinct from the body font.
import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './global.css';
import { Toaster } from 'sonner';

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
      </body>
    </html>
  );
}