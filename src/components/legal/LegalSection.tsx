// src/components/legal/LegalSection.tsx
'use client';

import { Card, CardHeader, CardBody } from '@/components/ui/Card';

export function LegalPageHeader({
  icon: Icon,
  title,
  description,
  lastUpdated,
}: {
  icon: React.ElementType;
  title: string;
  description: React.ReactNode;
  lastUpdated: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-5">
      <div className="flex items-center gap-3 mb-1">
        <Icon className="w-5 h-5 text-teal-700" />
        <h1 className="text-lg font-display font-semibold tracking-display text-ink-800">
          {title}
        </h1>
      </div>
      <p className="text-sm text-gray-500">{description}</p>
      <p className="text-xs text-gray-400 mt-2">Last updated: {lastUpdated}</p>
    </div>
  );
}

export function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-teal-700" />
          </div>
          <h2 className="font-semibold text-ink-800">{title}</h2>
        </div>
      </CardHeader>
      <CardBody className="text-sm text-gray-600 leading-relaxed space-y-2">
        {children}
      </CardBody>
    </Card>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mt-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Callout({
  variant = 'amber',
  children,
}: {
  variant?: 'amber' | 'teal';
  children: React.ReactNode;
}) {
  const styles =
    variant === 'amber'
      ? 'bg-amber-50 border-amber-200 text-amber-700'
      : 'bg-teal-50 border-teal-200 text-teal-700';
  return (
    <div className={`mt-3 p-3 border rounded-lg text-xs ${styles}`}>{children}</div>
  );
}

export function LabeledStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex-1">
        <p className="font-medium text-ink-600 text-xs uppercase tracking-wide">{label}</p>
        <p className="mt-0.5">{children}</p>
      </div>
    </div>
  );
}