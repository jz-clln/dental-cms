'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: staff } = await supabase
        .from('staff')
        .select('id, tutorial_completed')
        .eq('auth_user_id', user.id)
        .single();

      if (!staff) { setLoading(false); return; }

      setStaffId(staff.id);

      // Show tutorial only if not completed yet
      if (!staff.tutorial_completed) {
        // Small delay so the dashboard loads first
        setTimeout(() => setShowTutorial(true), 800);
      }

      setLoading(false);
    }
    check();
  }, []);

  async function completeTutorial() {
    setShowTutorial(false);
    if (!staffId) return;

    const supabase = createClient();
    await supabase
      .from('staff')
      .update({ tutorial_completed: true })
      .eq('id', staffId);
  }

  function skipTutorial() {
    completeTutorial();
  }

  return { showTutorial, completeTutorial, skipTutorial, loading };
}
