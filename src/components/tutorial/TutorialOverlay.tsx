'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Users,
  Calendar,
  Package,
  Receipt,
  BarChart3,
  Settings,
  Stethoscope,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────

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

// ─── Steps ────────────────────────────────────────────────────

const STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Dental CMS',
    description:
      'A quick tour of the 6 things you need to know to run your clinic from day one. Takes about 2 minutes.',
    icon: Stethoscope,
  },
  {
    id: 'patients',
    title: 'Patients',
    description:
      'Every patient gets a profile with personal info, dental history, appointments, billing, and a full treatment timeline.',
    icon: Users,
    tip: 'Add patients manually or one by one.',
    action: { label: 'Add your first patient', href: '/patients/new' },
  },
  {
    id: 'appointments',
    title: 'Appointments',
    description:
      "A weekly calendar showing every dentist's schedule. Filter by status and update appointments in one tap — Scheduled through Done.",
    icon: Calendar,
    tip: 'Blue = Scheduled · Teal = Confirmed · Green = Done · Red = No-show',
    action: { label: 'Book an appointment', href: '/appointments/new' },
  },
  {
    id: 'tooth-chart',
    title: 'Tooth Chart',
    description:
      "An interactive 32-tooth diagram on each patient's profile. Tap any tooth to log a treatment — fillings, extractions, crowns, and more.",
    icon: Stethoscope,
  },
  {
    id: 'billing',
    title: 'Billing',
    description:
      'Add charges after treatments and record payments in cash, GCash, Maya, or card. Every patient shows Paid, Partial, or Unpaid at a glance.',
    icon: Receipt,
    action: { label: 'Go to Billing', href: '/billing' },
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description:
      'Track all dental supplies with current stock levels. Items below reorder level are flagged automatically.',
    icon: Package,
    tip: 'The notification bell alerts you when stock runs low.',
    action: { label: 'Set up inventory', href: '/inventory' },
  },
  {
    id: 'reports',
    title: 'Reports',
    description:
      'Revenue by day, appointments by status, top treatments, and no-show rate — all from real data, updated in real time.',
    icon: BarChart3,
    action: { label: 'View Reports', href: '/reports' },
  },
  {
    id: 'settings',
    title: 'Settings',
    description:
      'Add your clinic logo, update clinic info, add dentists with their schedules, and manage staff accounts.',
    icon: Settings,
    tip: 'Add dentists first — it makes scheduling smoother.',
    action: { label: 'Open Settings', href: '/settings' },
  },
  {
    id: 'done',
    title: "You're all set",
    description:
      'Your clinic is ready. Data is saved and backed up automatically. Press "/" anywhere in the app to open global search.',
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
    setTimeout(() => onComplete(), 300);
  }

  function handleSkip() {
    setExiting(true);
    setTimeout(() => onSkip(), 300);
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
        'transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Card */}
      <div
        className={cn(
          'relative w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden',
          'transition-all duration-300',
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-[0.98] translate-y-2'
        )}
      >
        {/* Top teal progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-teal-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Left teal accent strip + content */}
        <div className="flex">
          <div className="w-1 bg-teal-600 flex-shrink-0" />

          <div className="flex-1 min-w-0">

            {/* Skip button */}
            {!isLast && (
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 p-1.5 rounded-md text-gray-300
                  hover:text-gray-500 hover:bg-gray-50 transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Body */}
            <div className="px-6 pt-6 pb-4">

              {/* Icon chip */}
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center mb-5">
                <Icon
                  className="text-teal-600"
                  style={{ width: '18px', height: '18px' }}
                />
              </div>

              {/* Step counter — matches dashboard "TODAY'S APPOINTMENTS" label style */}
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Step {currentStep + 1} of {STEPS.length}
              </p>

              {/* Title */}
              <h2 className="text-[17px] font-semibold text-gray-800 leading-snug mb-2">
                {step.title}
              </h2>

              {/* Description */}
              <p className="text-sm text-gray-500 leading-relaxed">
                {step.description}
              </p>

              {/* Tip — teal-tinted */}
              {step.tip && (
                <div className="mt-4 flex items-start gap-2 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-teal-700 leading-relaxed">{step.tip}</p>
                </div>
              )}

              {/* Action link — matches "View all →" dashboard link style */}
              {step.action && !isLast && (
                <button
                  onClick={handleAction}
                  className="mt-4 flex items-center gap-1 text-xs font-medium text-teal-600
                    hover:text-teal-700 transition-colors"
                >
                  {step.action.label}
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 pb-1">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    i === currentStep
                      ? 'w-5 h-1.5 bg-teal-600'
                      : i < currentStep
                        ? 'w-1.5 h-1.5 bg-teal-300'
                        : 'w-1.5 h-1.5 bg-gray-200'
                  )}
                />
              ))}
            </div>

            {/* Footer nav */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 mt-1">
              <button
                onClick={goPrev}
                disabled={isFirst}
                className={cn(
                  'flex items-center gap-1 text-sm transition-colors',
                  isFirst
                    ? 'text-gray-200 cursor-default'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <button
                onClick={goNext}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium
                  bg-teal-600 hover:bg-teal-700 text-white transition-colors"
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
      </div>
    </div>
  );
}