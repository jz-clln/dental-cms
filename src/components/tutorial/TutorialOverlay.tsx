'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, ChevronRight, ChevronLeft, Users, Calendar,
  Package, Receipt, BarChart3, Settings, Stethoscope,
  CheckCircle, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tutorial Steps ───────────────────────────────────────────

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tip?: string;
  action?: {
    label: string;
    href: string;
  };
}

const STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Dental CMS',
    description: 'A quick tour of the 6 things you need to know to run your clinic from day one. Takes about 2 minutes.',
    icon: Stethoscope,
  },
  {
    id: 'patients',
    title: 'Patients',
    description: 'Every patient gets a profile with personal info, dental history, appointments, billing, and a full treatment timeline.',
    icon: Users,
    tip: 'Add patients manually or one by one.',
    action: { label: 'Add your first patient', href: '/patients/new' },
  },
  {
    id: 'appointments',
    title: 'Appointments',
    description: 'A weekly calendar showing every dentist\'s schedule. Filter by status and update appointments in one tap — Scheduled through Done.',
    icon: Calendar,
    tip: 'Blue = Scheduled · Teal = Confirmed · Green = Done · Red = No-show',
    action: { label: 'Book an appointment', href: '/appointments/new' },
  },
  {
    id: 'tooth-chart',
    title: 'Tooth Chart',
    description: "An interactive 32-tooth diagram on each patient's profile. Tap any tooth to log a treatment — fillings, extractions, crowns, and more.",
    icon: Stethoscope,
  },
  {
    id: 'billing',
    title: 'Billing',
    description: 'Add charges after treatments and record payments in cash, GCash, Maya, or card. Every patient shows Paid, Partial, or Unpaid at a glance.',
    icon: Receipt,
    action: { label: 'Go to Billing', href: '/billing' },
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description: 'Track all dental supplies with current stock levels. Items below reorder level are flagged automatically.',
    icon: Package,
    tip: 'The notification bell alerts you when stock runs low.',
    action: { label: 'Set up inventory', href: '/inventory' },
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Revenue by day, appointments by status, top treatments, and no-show rate — all from real data, updated in real time.',
    icon: BarChart3,
    action: { label: 'View Reports', href: '/reports' },
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Add your clinic logo, update clinic info, add dentists with their schedules, and manage staff accounts.',
    icon: Settings,
    tip: 'Add dentists first — it makes scheduling smoother.',
    action: { label: 'Open Settings', href: '/settings' },
  },
  {
    id: 'done',
    title: "You're all set",
    description: 'Your clinic is ready. Data is saved and backed up automatically. Press "/" anywhere in the app to open global search.',
    icon: CheckCircle,
  },
];

// ─── Props ────────────────────────────────────────────────────

interface TutorialOverlayProps {
  onComplete: () => void;
  onSkip: () => void;
}

// ─── Component ────────────────────────────────────────────────

export function TutorialOverlay({ onComplete, onSkip }: TutorialOverlayProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [entering, setEntering] = useState(true);

  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  useEffect(() => {
    const t = setTimeout(() => setEntering(false), 50);
    return () => clearTimeout(t);
  }, []);

  function goNext() {
    if (isLast) { handleComplete(); return; }
    setCurrentStep(s => s + 1);
  }

  function goPrev() {
    if (!isFirst) setCurrentStep(s => s - 1);
  }

  function handleComplete() {
    setExiting(true);
    setTimeout(() => onComplete(), 350);
  }

  function handleSkip() {
    setExiting(true);
    setTimeout(() => onSkip(), 350);
  }

  function handleAction() {
    if (step.action) {
      handleComplete();
      router.push(step.action.href);
    }
  }

  const Icon = step.icon;
  const visible = !exiting && !entering;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center p-4',
        'transition-opacity duration-350',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Card */}
      <div
        className={cn(
          'relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden',
          'transition-all duration-350',
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.97] translate-y-2'
        )}
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-gray-900 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-1 rounded-md text-gray-300
              hover:text-gray-500 hover:bg-gray-50 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Content */}
        <div className="px-7 pt-7 pb-5">
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center mb-5">
            <Icon className="w-4.5 h-4.5 text-gray-600" style={{ width: '18px', height: '18px' }} />
          </div>

          {/* Counter */}
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">
            {currentStep + 1} / {STEPS.length}
          </p>

          {/* Title */}
          <h2 className="text-lg font-semibold text-gray-900 leading-snug mb-2">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-gray-500 leading-relaxed">
            {step.description}
          </p>

          {/* Tip */}
          {step.tip && (
            <p className="mt-4 text-xs text-gray-400 leading-relaxed border-l-2 border-gray-200 pl-3">
              {step.tip}
            </p>
          )}

          {/* Action link */}
          {step.action && !isLast && (
            <button
              onClick={handleAction}
              className="mt-4 flex items-center gap-1.5 text-xs font-medium text-gray-700
                hover:text-gray-900 transition-colors"
            >
              {step.action.label}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5 pb-1">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                i === currentStep
                  ? 'w-5 h-1.5 bg-gray-900'
                  : i < currentStep
                    ? 'w-1.5 h-1.5 bg-gray-400'
                    : 'w-1.5 h-1.5 bg-gray-200'
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-gray-100">
          <button
            onClick={goPrev}
            disabled={isFirst}
            className={cn(
              'flex items-center gap-1.5 text-sm transition-colors',
              isFirst ? 'text-gray-200 cursor-default' : 'text-gray-400 hover:text-gray-700'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={goNext}
            className={cn(
              'flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all',
              isLast
                ? 'bg-gray-900 hover:bg-gray-700 text-white'
                : 'bg-gray-900 hover:bg-gray-700 text-white'
            )}
          >
            {isLast ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Done
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}