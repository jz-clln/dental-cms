'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { PlayCircle } from 'lucide-react';

export function ReplayTutorialButton() {
  const [show, setShow] = useState(false);

  async function handleReplay() {
    // Reset tutorial_completed so it can show again
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('staff')
      .update({ tutorial_completed: false })
      .eq('auth_user_id', user.id);
    setShow(true);
  }

  return (
    <>
      <button
        onClick={handleReplay}
        className="flex items-center gap-2 text-sm text-teal-700 font-medium
          hover:text-teal-800 hover:underline transition-colors"
      >
        <PlayCircle className="w-4 h-4" />
        Replay onboarding tutorial
      </button>

      {show && (
        <TutorialOverlay
          onComplete={() => setShow(false)}
          onSkip={() => setShow(false)}
        />
      )}
    </>
  );
}
