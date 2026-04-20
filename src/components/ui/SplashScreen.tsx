'use client';

import { useEffect, useState } from 'react';
import { AppIcon } from '@/components/ui/ToothLogo';
import { createClient } from '@/lib/supabase/client';

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState('Dental CMS');

  useEffect(() => {
    async function init() {
      // Try to get clinic branding
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: staff } = await supabase
            .from('staff').select('clinic_id').eq('auth_user_id', user.id).single();
          if (staff) {
            const { data: clinic } = await supabase
              .from('clinics').select('name, logo_url').eq('id', staff.clinic_id).single();
            if (clinic) {
              setClinicName(clinic.name);
              setLogoUrl(clinic.logo_url ?? null);
            }
          }
        }
      } catch (_) {}

      // Show splash for at least 1.2s for the animation to feel intentional
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => setVisible(false), 400);
      }, 1200);
    }

    init();
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[999] bg-white flex flex-col items-center justify-center
        transition-opacity duration-400 ease-in-out ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ transitionDuration: '400ms' }}
    >
      {/* Animated logo */}
      <div className={`flex flex-col items-center gap-4 transition-all duration-700
        ${fadeOut ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
        style={{
          animation: !fadeOut ? 'splashIn 0.6s ease-out forwards' : undefined,
        }}
      >
        <AppIcon size="lg" logoUrl={logoUrl} clinicName={clinicName} />
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{clinicName}</p>
          <p className="text-sm text-gray-400 mt-0.5">Clinic Management System</p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-teal-300"
              style={{
                animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes splashIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
