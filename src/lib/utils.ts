import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BillingStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export function formatPeso(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '₱0.00';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function calculateAge(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const today = new Date();
  const birth = new Date(birthday);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// FIX: first_name and last_name are nullable DB columns — typed as string | null
// to match PatientJoin. Fallback gracefully when either field is missing.
export function getPatientName(
  patient: { first_name: string | null; last_name: string | null } | null | undefined,
): string {
  if (!patient) return 'Unknown Patient';
  const first = patient.first_name?.trim() ?? '';
  const last  = patient.last_name?.trim()  ?? '';
  if (!first && !last) return 'Unknown Patient';
  return `${first} ${last}`.trim();
}

export function getBillingStatus(charged: number, paid: number): BillingStatus {
  if (paid <= 0) return 'Unpaid';
  if (paid >= charged) return 'Paid';
  return 'Partial';
}

// FIX: use en-CA locale (YYYY-MM-DD) in local timezone instead of
// toISOString().split('T')[0] which returns the UTC date and shifts
// back one day after 4 PM in PH time (UTC+8).
export function getTodayString(): string {
  return new Date().toLocaleDateString('en-CA');
}

// FIX: same timezone-safe fix for week range
export function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toLocaleDateString('en-CA'),
    end:   sunday.toLocaleDateString('en-CA'),
  };
}

export function getRelativeTime(timestamp: string): string {
  const now  = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const STATUS_COLORS: Record<string, string> = {
  Scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  Confirmed:  'bg-teal-100 text-teal-700 border-teal-200',
  Done:       'bg-green-100 text-green-700 border-green-200',
  'No-show':  'bg-red-100 text-red-700 border-red-200',
  Cancelled:  'bg-gray-100 text-gray-600 border-gray-200',
  Paid:       'bg-green-100 text-green-700 border-green-200',
  Partial:    'bg-amber-100 text-amber-700 border-amber-200',
  Unpaid:     'bg-red-100 text-red-700 border-red-200',
};

export const TREATMENT_TYPES = [
  'Dental Cleaning',
  'Tooth Filling',
  'Tooth Extraction',
  'Root Canal',
  'Braces Installation',
  'Braces Adjustment',
  'Braces Consultation',
  'Retainer Check',
  'Wisdom Tooth Surgery',
  'Dental X-ray',
  'Teeth Whitening',
  'Denture Fitting',
  'Oral Surgery Consult',
  'Crown Installation',
  'Bridge Installation',
  'Fluoride Treatment',
  'Sealant Application',
  'Oral Prophylaxis',
];

export const INVENTORY_CATEGORIES = [
  'PPE',
  'Restorative',
  'Anesthesia',
  'Consumable',
  'Surgical',
  'Imaging',
  'Instruments',
  'Hygiene',
  'Antiseptic',
  'Orthodontics',
];