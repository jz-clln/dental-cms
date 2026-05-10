'use client';

import Image from 'next/image';
import { memo } from 'react';
import type { BiteyState, Stats } from '@/types/dashboard';
import type { Appointment } from '@/types';

interface Props {
  bitey: BiteyState;
  stats: Stats;
  appointments: Appointment[];
}

export const BiteyCard = memo(function BiteyCard({ bitey, stats, appointments }: Props) {
  const lines = bitey.message.split('\n');
  const hasLowStock = stats.lowStockAlerts > 0;
  const noShowCount = appointments.filter(a => a.status === 'No-show').length;
  const total = appointments.length;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#004730] border border-white/[0.15] font-[Raleway]">

      {/* Circle light effects */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/[0.05] pointer-events-none" />
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/[0.05] pointer-events-none" />
      <div className="absolute -top-1 -right-1 w-10 h-10 rounded-full bg-white/[0.06] pointer-events-none" />

      {/* Top — mascot 30% + message 70% */}
      <div className="relative flex items-end">

        {/* Mascot — always 30% width */}
        <div
          className="relative flex-shrink-0 self-end"
          style={{ width: 'clamp(80px, 30%, 110px)', aspectRatio: '1 / 1.15' }}
        >
          <Image
            src={`/bitey/${bitey.emotion}.png`}
            alt={`Bitey is ${bitey.emotion}`}
            fill
            className="object-contain object-bottom"
            priority
          />
        </div>

        {/* Message — 70% */}
        <div className="flex-1 min-w-0 py-3 pr-3 pl-1.5">

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 mb-2 text-[9px] font-medium tracking-[0.1em] uppercase text-white bg-white/15 border border-white/25 px-2 py-[2px] rounded-full leading-none">
            <span className="inline-block w-[4px] h-[4px] rounded-full bg-white flex-shrink-0 mt-[0.5px]" />
            Clinic assistant
          </div>

          {bitey.message && (
            <div className="space-y-1">
              {lines.map((line, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? 'text-[11px] md:text-[13px] font-semibold text-white leading-[1.3] tracking-[-0.01em]'
                      : i === 1
                      ? 'text-[10px] md:text-[11px] font-medium text-white/75 leading-[1.4]'
                      : 'text-[9px] md:text-[10px] text-white/45 leading-relaxed italic'
                  }
                >
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.15]" />

      {/* Stats row */}
      {!bitey.isNewUser ? (
        <div className="relative grid grid-cols-3 divide-x divide-white/[0.12] bg-black/[0.12]">
          {[
            { label: "Today's appts", value: total },
            { label: 'No-shows',      value: noShowCount, warn: noShowCount > 0 },
            { label: 'Low stock',     value: stats.lowStockAlerts, warn: hasLowStock },
          ].map(item => (
            <div key={item.label} className="py-2.5 px-2 text-center">
              <p className={`font-serif text-[18px] leading-none mb-[3px] ${item.warn ? 'text-red-300' : 'text-white'}`}>
                {item.value}
              </p>
              <p className="text-[9px] font-medium text-white/45 uppercase tracking-[0.08em]">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative px-4 py-2.5 flex items-center gap-2 bg-black/[0.12]">
          <span className="w-[4px] h-[4px] rounded-full bg-white/70 flex-shrink-0 animate-pulse" />
          <p className="text-[10px] text-white/45">
            Use the quick actions above to get started with your clinic.
          </p>
        </div>
      )}
    </div>
  );
});