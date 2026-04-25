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
  tipLabel?: string;
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
      "Let's walk through the key features so you can get your clinic up and running. This tour covers everything from patients to reports and takes about 2 minutes.",
    icon: Stethoscope,
  },
  {
    id: 'patients',
    title: 'Managing Patients',
    description:
      'Each patient has their own profile with personal details, dental history, appointments, billing records, and a full treatment timeline. Start by adding your first patient.',
    icon: Users,
    tip: 'You can add patients one by one or fill in their details as they come in for their first visit.',
    action: { label: 'Add your first patient', href: '/patients/new' },
  },
  {
    id: 'appointments',
    title: 'Booking Appointments',
    description:
      'The appointments page shows a weekly calendar for all your dentists. You can filter by status and move an appointment from Scheduled to Done with a single tap.',
    icon: Calendar,
    tipLabel: 'Color guide',
    tip: 'Blue: Scheduled · Teal: Confirmed · Green: Done · Red: No-show · Gray: Cancelled',
    action: { label: 'Book an appointment', href: '/appointments/new' },
  },
  {
    id: 'tooth-chart',
    title: 'Digital Tooth Chart',
    description:
      'Open any patient profile and go to the Tooth Chart tab. You will see a full 32-tooth diagram. Tap a tooth to record a treatment like a filling, extraction, or crown.',
    icon: Stethoscope,
    tip: 'Each treatment type is color coded so you can see a patient\'s full dental history at a glance.',
  },
  {
    id: 'billing',
    title: 'Tracking Billing',
    description:
      'After each treatment, add the charges directly from the patient profile. You can record payments in cash, GCash, Maya, or card. Each patient will show their balance status clearly.',
    icon: Receipt,
    tip: "Today's total revenue is always shown at the top of the Billing page.",
    action: { label: 'Go to Billing', href: '/billing' },
  },
  {
    id: 'inventory',
    title: 'Managing Supplies',
    description:
      'Keep track of all your dental supplies and their stock levels. When an item drops below your reorder point, it gets flagged automatically so you never run out.',
    icon: Package,
    tip: 'You will also get a notification bell alert when any item runs low.',
    action: { label: 'Set up inventory', href: '/inventory' },
  },
  {
    id: 'reports',
    title: 'Viewing Reports',
    description:
      'The Reports page gives you a clear picture of how your clinic is performing. You can see daily revenue, appointment breakdowns, your most common treatments, and no-show rates.',
    icon: BarChart3,
    tip: 'Reports update automatically as you add appointments and record payments.',
    action: { label: 'View Reports', href: '/reports' },
  },
  {
    id: 'settings',
    title: 'Setting Up Your Clinic',
    description:
      'In Settings, you can upload your clinic logo, update your clinic details, add dentists with their working schedules, and manage staff access.',
    icon: Settings,
    tip: 'We recommend adding your dentists first. It makes assigning appointments much easier.',
    action: { label: 'Open Settings', href: '/settings' },
  },
  {
    id: 'done',
    title: "You're ready to go",
    description:
      "That's everything you need to get started. Your data is saved and backed up automatically. If you ever need a refresher, you can replay this tour from the Settings page.",
    icon: CheckCircle,
    tip: 'Press the "/" key anywhere in the app to open global search.',
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

        <div className="flex">
          {/* Left teal accent strip */}
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

              {/* Step counter */}
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

              {/* Tip box */}
              {step.tip && (
                <div className="mt-4 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2.5">
                  {step.tipLabel && (
                    <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-widest mb-1">
                      {step.tipLabel}
                    </p>
                  )}
                  <p className="text-xs text-teal-700 leading-relaxed">{step.tip}</p>
                </div>
              )}

              {/* Action link */}
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