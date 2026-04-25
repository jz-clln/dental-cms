'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, ChevronRight, ChevronLeft, Users, Calendar,
  Package, Receipt, BarChart3, Settings, Stethoscope,
  CheckCircle, Zap, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tutorial Steps ───────────────────────────────────────────

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  tip?: string;
  action?: {
    label: string;
    href: string;
  };
  highlight?: string; // CSS selector of element to highlight
  position: 'center' | 'bottom-left' | 'bottom-right' | 'top-left';
}

const STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Dental CMS! 🦷',
    description: "You're all set. This quick tour will show you the 6 key things you need to know to run your clinic from day one. It takes about 2 minutes.",
    icon: Stethoscope,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-700',
    position: 'center',
  },
  {
    id: 'patients',
    title: 'Start with your Patients',
    description: 'Every patient gets their own profile with personal info, dental history, upcoming appointments, billing summary, and a full treatment timeline. Add your first patient to get started.',
    icon: Users,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-700',
    tip: 'You can import patients manually or add them one by one. Your free plan includes up to 50 patients.',
    action: { label: 'Add your first patient', href: '/patients/new' },
    position: 'center',
  },
  {
    id: 'appointments',
    title: 'Book Appointments',
    description: 'The Appointments page shows a weekly calendar view. You can see every dentist\'s schedule, filter by status, and update appointment status in one tap — from Scheduled to Done.',
    icon: Calendar,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    tip: 'Color coding: Blue = Scheduled, Teal = Confirmed, Green = Done, Red = No-show, Gray = Cancelled.',
    action: { label: 'Book an appointment', href: '/appointments/new' },
    position: 'center',
  },
  {
    id: 'tooth-chart',
    title: 'Digital Tooth Chart',
    description: "On each patient's profile, tap the Tooth Chart tab to access an interactive 32-tooth diagram. Tap any tooth to log a treatment — fillings, extractions, crowns, and more. Color coded by type.",
    icon: Stethoscope,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-700',
    tip: 'This is a premium feature normally only found in expensive dental software. You have it included.',
    position: 'center',
  },
  {
    id: 'billing',
    title: 'Track Billing & Payments',
    description: 'Add charges after each treatment and record payments in cash, GCash, Maya, or card. Every patient shows their balance status: Paid, Partial, or Unpaid. Revenue is tracked automatically.',
    icon: Receipt,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-700',
    tip: "Today's revenue is always visible at the top of the Billing page.",
    action: { label: 'Go to Billing', href: '/billing' },
    position: 'center',
  },
  {
    id: 'inventory',
    title: 'Manage Your Supplies',
    description: 'Track all dental supplies with current stock levels. Items below your reorder level are highlighted in red with an alert. Restock with one tap.',
    icon: Package,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    tip: 'The notifications bell will alert you automatically when stock runs low.',
    action: { label: 'Set up inventory', href: '/inventory' },
    position: 'center',
  },
  {
    id: 'reports',
    title: 'View Your Reports',
    description: 'The Reports page shows revenue by day, appointments by status, top treatments, and your no-show rate — all from real data. Check it at the end of every month.',
    icon: BarChart3,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-700',
    tip: 'Reports update in real time as you add appointments and payments.',
    action: { label: 'View Reports', href: '/reports' },
    position: 'center',
  },
  {
    id: 'settings',
    title: 'Customize Your Clinic',
    description: 'In Settings, add your clinic logo, update your clinic info, add dentists with their schedules, and manage staff accounts. Upload your logo so it appears everywhere in the app.',
    icon: Settings,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-700',
    tip: 'Adding dentists first makes scheduling much smoother — you can assign them to appointments.',
    action: { label: 'Open Settings', href: '/settings' },
    position: 'center',
  },
  {
    id: 'done',
    title: "You're ready to go! 🎉",
    description: "That's everything. Your clinic is set up and your data is safe and backed up. If you ever need help, check the Settings page or contact our support team.",
    icon: CheckCircle,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    tip: 'Tip: The "/" key opens global search from anywhere in the app.',
    position: 'center',
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
    // Fade in on mount
    const t = setTimeout(() => setEntering(false), 50);
    return () => clearTimeout(t);
  }, []);

  function goNext() {
    if (isLast) {
      handleComplete();
      return;
    }
    setCurrentStep(s => s + 1);
  }

  function goPrev() {
    if (isFirst) return;
    setCurrentStep(s => s - 1);
  }

  function handleComplete() {
    setExiting(true);
    setTimeout(() => onComplete(), 400);
  }

  function handleSkip() {
    setExiting(true);
    setTimeout(() => onSkip(), 400);
  }

  function handleAction() {
    if (step.action) {
      handleComplete();
      router.push(step.action.href);
    }
  }

  const Icon = step.icon;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center p-4',
        'transition-opacity duration-400',
        exiting ? 'opacity-0' : entering ? 'opacity-0' : 'opacity-100'
      )}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div
        className={cn(
          'relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden',
          'transition-all duration-400',
          exiting
            ? 'opacity-0 scale-95 translate-y-4'
            : entering
              ? 'opacity-0 scale-95 translate-y-4'
              : 'opacity-100 scale-100 translate-y-0'
        )}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-teal-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button */}
        {!isLast && (
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-300
              hover:text-gray-500 hover:bg-gray-100 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Step content */}
        <div className="px-8 pt-8 pb-6">

          {/* Icon */}
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center mb-5',
            step.iconBg
          )}>
            <Icon className={cn('w-7 h-7', step.iconColor)} />
          </div>

          {/* Step counter */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Step {currentStep + 1} of {STEPS.length}
          </p>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-gray-600 text-sm leading-relaxed">
            {step.description}
          </p>

          {/* Tip box */}
          {step.tip && (
            <div className="mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">{step.tip}</p>
            </div>
          )}

          {/* Action button (optional) */}
          {step.action && !isLast && (
            <button
              onClick={handleAction}
              className="mt-4 flex items-center gap-2 text-sm text-teal-700 font-semibold
                hover:text-teal-800 hover:underline transition-colors"
            >
              {step.action.label} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                i === currentStep
                  ? 'w-6 h-2 bg-teal-700'
                  : i < currentStep
                    ? 'w-2 h-2 bg-teal-300'
                    : 'w-2 h-2 bg-gray-200'
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-gray-100">
          {/* Back */}
          <button
            onClick={goPrev}
            disabled={isFirst}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors',
              isFirst
                ? 'text-gray-200 cursor-default'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {/* Next / Finish */}
          <button
            onClick={goNext}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm',
              'transition-all shadow-sm',
              isLast
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-teal-700 hover:bg-teal-800 text-white'
            )}
          >
            {isLast ? (
              <>
                <CheckCircle className="w-4 h-4" /> Let's go!
              </>
            ) : (
              <>
                Next <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
