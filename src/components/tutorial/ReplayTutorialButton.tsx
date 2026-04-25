'use client';

import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';

export function ReplayTutorialButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          text-teal-600 border border-teal-200 bg-teal-50
          hover:bg-teal-100 hover:border-teal-300 transition-colors"
      >
        <PlayCircle className="w-4 h-4" />
        Replay Tutorial
      </button>

      {open && (
        <TutorialOverlay
          onComplete={() => setOpen(false)}
          onSkip={() => setOpen(false)}
        />
      )}
    </>
  );
}