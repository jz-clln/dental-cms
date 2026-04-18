import React from 'react';
import { VisitNote } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';
import { FileText } from 'lucide-react';

interface VisitNoteCardProps {
  note: VisitNote;
}

const VisitNoteCard = React.memo(function VisitNoteCard({ note }: VisitNoteCardProps) {
  return (
    <div className="flex gap-4">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-teal-50 border-2 border-teal-200 flex items-center justify-center flex-shrink-0">
          <FileText className="w-3.5 h-3.5 text-teal-600" />
        </div>
        <div className="w-px flex-1 bg-gray-100 mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-sm font-semibold text-gray-900">
            {formatDate(note.created_at.split('T')[0])}
          </p>
          <span className="text-gray-300">·</span>
          <p className="text-xs text-gray-400">
            {formatTime(note.created_at.split('T')[1]?.slice(0, 5))}
          </p>
          {note.appointment && (
            <>
              <span className="text-gray-300">·</span>
              <p className="text-xs text-teal-600 font-medium truncate">
                {note.appointment.treatment_type}
              </p>
            </>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.notes}</p>
        </div>
      </div>
    </div>
  );
});

export default VisitNoteCard;
