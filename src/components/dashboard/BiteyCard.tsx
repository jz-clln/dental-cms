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

// FIX: memo prevents re-render when parent refreshes unrelated state
export const BiteyCard = memo(function BiteyCard({ bitey, stats, appointments }: Props) {
  const lines = bitey.message.split('\n');
  const hasLowStock = stats.lowStockAlerts > 0;
  const noShowCount = appointments.filter(a => a.status === 'No-show').length;
  const total = appointments.length;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#1a3d2b] text-white">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative flex items-center justify-center md:justify-start gap-0">
        <div className="relative flex-shrink-0 w-[100px] h-[110px] md:w-[110px] md:h-[120px] self-end md:self-center">
          <Image
            src={`/bitey/${bitey.emotion}.png`}
            alt={`Bitey is ${bitey.emotion}`}
            fill
            className="object-contain object-bottom drop-shadow-lg"
            priority
          />
        </div>

        <div className="md:flex-1 py-3 pr-4">
          <span className="inline-block text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 bg-emerald-500/20 text-emerald-300">
            Clinic Assistant
          </span>

          {bitey.message && (
            <div className="space-y-0.5">
              {lines.map((line, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? 'text-[12px] md:text-[13px] font-bold text-white leading-snug tracking-tight'
                      : i === 1
                      ? 'text-[11px] md:text-[12px] text-emerald-200 leading-snug font-semibold'
                      : 'text-[10px] md:text-[11px] text-white/50 leading-relaxed italic'
                  }
                >
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {!bitey.isNewUser ? (
        <div className="relative border-t border-white/10 grid grid-cols-3 divide-x divide-white/10">
          {[
            { label: "Today's appts", value: total },
            { label: 'No-shows',      value: noShowCount, warn: noShowCount > 0 },
            { label: 'Low stock',     value: stats.lowStockAlerts, warn: hasLowStock },
          ].map(item => (
            <div key={item.label} className="py-2 px-2 text-center">
              <p className={`text-sm font-bold leading-none ${item.warn ? 'text-red-300' : 'text-white'}`}>
                {item.value}
              </p>
              <p className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative border-t border-white/10 px-4 py-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <p className="text-[10px] text-white/50">
            Use the quick actions above to get started with your clinic.
          </p>
        </div>
      )}
    </div>
  );
});