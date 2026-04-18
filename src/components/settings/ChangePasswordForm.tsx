'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';

interface ChangePasswordFormProps {
  toast: { success: (m: string) => void; error: (m: string) => void };
}

interface FormErrors {
  new_password?: string;
  confirm_password?: string;
}

export function ChangePasswordForm({ toast }: ChangePasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({
    new_password: '',
    confirm_password: '',
  });

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (form.new_password.length < 8) {
      e.new_password = 'Password must be at least 8 characters.';
    }
    if (form.new_password !== form.confirm_password) {
      e.confirm_password = 'Passwords do not match.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: form.new_password,
    });

    if (error) {
      toast.error('Failed to update password. Please try again.');
    } else {
      toast.success('Password updated successfully.');
      setForm({ new_password: '', confirm_password: '' });
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* New password */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">New Password</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={form.new_password}
            onChange={e => set('new_password', e.target.value)}
            placeholder="Min. 8 characters"
            className={`w-full px-3 py-2 pr-10 rounded-lg border text-sm
              focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors
              ${errors.new_password ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
          />
          <button
            type="button"
            onClick={() => setShowNew(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.new_password && <p className="text-xs text-red-600">{errors.new_password}</p>}
      </div>

      {/* Confirm password */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            value={form.confirm_password}
            onChange={e => set('confirm_password', e.target.value)}
            placeholder="Repeat new password"
            className={`w-full px-3 py-2 pr-10 rounded-lg border text-sm
              focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors
              ${errors.confirm_password ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirm_password && <p className="text-xs text-red-600">{errors.confirm_password}</p>}
      </div>

      <div className="pt-1">
        <Button type="submit" loading={loading}>Update Password</Button>
      </div>
    </form>
  );
}
