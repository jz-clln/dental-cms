import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BillingStatus } from '@/types';

// Tailwind class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to readable string
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00'); // avoid timezone shift
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

// Format time from "HH:MM:SS" to "9:00 AM"
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// Format Philippine peso
export function formatPeso(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '₱0.00';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Calculate age from birthday
export function calculateAge(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const today = new Date();
  const birth = new Date(birthday);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Get full patient name
export function getPatientName(patient: { first_name: string; last_name: string } | null | undefined): string {
  if (!patient) return 'Unknown Patient';
  return `${patient.first_name} ${patient.last_name}`;
}

// Billing status from amounts
export function getBillingStatus(charged: number, paid: number): BillingStatus {
  if (paid <= 0) return 'Unpaid';
  if (paid >= charged) return 'Paid';
  return 'Partial';
}

// Get today's date as YYYY-MM-DD
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Get start/end of current week (Monday–Sunday)
export function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

// Get relative timestamp label (e.g. "2 hours ago")
export function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Status color maps
export const STATUS_COLORS: Record<string, string> = {
  Scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  Confirmed: 'bg-teal-100 text-teal-700 border-teal-200',
  Done: 'bg-green-100 text-green-700 border-green-200',
  'No-show': 'bg-red-100 text-red-700 border-red-200',
  Cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  Paid: 'bg-green-100 text-green-700 border-green-200',
  Partial: 'bg-amber-100 text-amber-700 border-amber-200',
  Unpaid: 'bg-red-100 text-red-700 border-red-200',
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
