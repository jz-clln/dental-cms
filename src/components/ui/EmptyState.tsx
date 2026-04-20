import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ToothIcon } from '@/components/ui/ToothLogo';
import {
  Calendar, Package, Receipt, BarChart3,
  UserPlus, CalendarPlus, Plus, LucideIcon,
} from 'lucide-react';

interface EmptyStateProps {
  type: 'patients' | 'appointments' | 'inventory' | 'billing' | 'reports' | 'generic';
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

const CONFIGS = {
  patients: {
    illustration: <ToothIllustration />,
    title: 'No patients yet',
    description: 'Add your first patient to start managing records, appointments, and billing.',
    actionLabel: 'Add your first patient',
    actionHref: '/patients/new',
    ActionIcon: UserPlus,
  },
  appointments: {
    illustration: <CalendarIllustration />,
    title: 'No appointments scheduled',
    description: 'Book your first appointment to start tracking your daily schedule.',
    actionLabel: 'Schedule an appointment',
    actionHref: '/appointments/new',
    ActionIcon: CalendarPlus,
  },
  inventory: {
    illustration: <InventoryIllustration />,
    title: 'Inventory is empty',
    description: 'Add your dental supplies to track stock levels and get low-stock alerts.',
    actionLabel: 'Add your first item',
    actionHref: null,
    ActionIcon: Plus,
  },
  billing: {
    illustration: <BillingIllustration />,
    title: 'No billing records yet',
    description: 'Add charges after treatments and record payments to track your revenue.',
    actionLabel: 'Add a charge',
    actionHref: null,
    ActionIcon: Plus,
  },
  reports: {
    illustration: <ReportsIllustration />,
    title: 'Not enough data yet',
    description: 'Reports will appear once you have appointments and payments recorded.',
    actionLabel: 'Go to Appointments',
    actionHref: '/appointments',
    ActionIcon: Calendar,
  },
  generic: {
    illustration: <GenericIllustration />,
    title: 'Nothing here yet',
    description: 'Get started by adding your first record.',
    actionLabel: 'Get started',
    actionHref: null,
    ActionIcon: Plus,
  },
};

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  const config = CONFIGS[type];
  const finalTitle = title ?? config.title;
  const finalDesc = description ?? config.description;
  const finalLabel = actionLabel ?? config.actionLabel;
  const finalHref = actionHref ?? config.actionHref;
  const ActionIcon = config.ActionIcon;

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {/* Illustration */}
      <div className="mb-6">
        {config.illustration}
      </div>

      {/* Text */}
      <h3 className="text-base font-semibold text-gray-800">{finalTitle}</h3>
      <p className="text-sm text-gray-400 mt-1.5 max-w-xs leading-relaxed">{finalDesc}</p>

      {/* CTA button */}
      {(finalHref || onAction) && (
        <div className="mt-6">
          {finalHref ? (
            <Link
              href={finalHref}
              className="inline-flex items-center gap-2 bg-teal-700 text-white text-sm font-medium
                px-5 py-2.5 rounded-xl hover:bg-teal-800 transition-colors shadow-sm"
            >
              <ActionIcon className="w-4 h-4" />
              {finalLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 bg-teal-700 text-white text-sm font-medium
                px-5 py-2.5 rounded-xl hover:bg-teal-800 transition-colors shadow-sm"
            >
              <ActionIcon className="w-4 h-4" />
              {finalLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── SVG Illustrations ─────────────────────────────────── */

function ToothIllustration() {
  return (
    <div className="relative">
      <div className="w-20 h-20 rounded-3xl bg-teal-50 border-2 border-teal-100 flex items-center justify-center">
        <ToothIcon size={44} className="text-teal-300" />
      </div>
      {/* Decorative dots */}
      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-teal-100" />
      <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-teal-50 border border-teal-100" />
    </div>
  );
}

function CalendarIllustration() {
  return (
    <div className="relative">
      <div className="w-20 h-20 rounded-3xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
        <Calendar className="w-9 h-9 text-blue-300" />
      </div>
      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-100" />
      <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-blue-50 border border-blue-100" />
    </div>
  );
}

function InventoryIllustration() {
  return (
    <div className="relative">
      <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-100 flex items-center justify-center">
        <Package className="w-9 h-9 text-amber-300" />
      </div>
      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-100" />
      <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-amber-50 border border-amber-100" />
    </div>
  );
}

function BillingIllustration() {
  return (
    <div className="relative">
      <div className="w-20 h-20 rounded-3xl bg-green-50 border-2 border-green-100 flex items-center justify-center">
        <Receipt className="w-9 h-9 text-green-300" />
      </div>
      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-100" />
      <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-green-50 border border-green-100" />
    </div>
  );
}

function ReportsIllustration() {
  return (
    <div className="relative">
      <div className="w-20 h-20 rounded-3xl bg-purple-50 border-2 border-purple-100 flex items-center justify-center">
        <BarChart3 className="w-9 h-9 text-purple-300" />
      </div>
      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-100" />
      <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-purple-50 border border-purple-100" />
    </div>
  );
}

function GenericIllustration() {
  return (
    <div className="w-20 h-20 rounded-3xl bg-gray-50 border-2 border-gray-100 flex items-center justify-center">
      <ToothIcon size={44} className="text-gray-200" />
    </div>
  );
}
