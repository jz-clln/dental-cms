import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner'; // ← add

export const metadata: Metadata = {
  title: 'Dental CMS',
  description: 'Clinic management system for dental practices',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Dental CMS',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f766e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors /> {/* ← add */}
      </body>
    </html>
  );
}