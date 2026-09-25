// src/components/settings/BookingQrCard.tsx
//
// UPDATE: bookingUrl is now computed in state, set inside a useEffect
// (client-only, runs after mount) instead of directly during render.
// Reading window.location.origin during render meant the server-rendered
// HTML used the `/book/{clinicId}` fallback (no window on the server),
// then the client re-rendered with the real origin right after — a
// same-content mismatch between server and client output, which React
// flags as a hydration warning. Computing it post-mount avoids that: the
// server and the initial client render now agree (both show the
// fallback), and the real URL fills in on the next tick.
//
// Requires the `qrcode` package: npm install qrcode @types/qrcode

'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Copy, Check, Download } from 'lucide-react';

interface BookingQrCardProps {
  clinicId: string;
  clinicName: string;
}

export function BookingQrCard({ clinicId, clinicName }: BookingQrCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  // Server render + first client render both show this fallback (no
  // mismatch); the real origin is filled in by the effect below.
  const [bookingUrl, setBookingUrl] = useState(`/book/${clinicId}`);

  useEffect(() => {
    setBookingUrl(`${window.location.origin}/book/${clinicId}`);
  }, [clinicId]);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, bookingUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }, // matches ink-900 on white
    }).catch(err => console.error('[BookingQrCard] failed to render QR:', err));
  }, [bookingUrl]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the link is still shown as text.
    }
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${clinicName.replace(/\s+/g, '-').toLowerCase()}-booking-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold md:text-[15px]">Patient Booking QR</h3>
      </CardHeader>
      <CardBody>
        <p className="text-sm text-gray-500 md:text-[13px]">
          Print this and display it at the front desk or on a table tent. Patients scan it to
          request an appointment — new requests show up under Appointments → Requests for you to
          approve.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="flex-shrink-0 rounded-xl border border-porcelain-200 p-3 bg-white">
            <canvas ref={canvasRef} className="block" />
          </div>

          <div className="flex-1 min-w-0 w-full space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Booking link</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 truncate text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-gray-600">
                  {bookingUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                  aria-label="Copy booking link"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <Button size="sm" variant="secondary" onClick={handleDownload} className="w-full sm:w-auto">
              <Download className="w-3.5 h-3.5" />
              Download PNG
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}