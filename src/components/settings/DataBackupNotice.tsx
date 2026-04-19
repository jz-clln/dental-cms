import { ShieldCheck, Database, Clock, Lock } from 'lucide-react';

export function DataBackupNotice() {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <p className="font-semibold text-green-900">Your data is safe and backed up</p>
          <p className="text-xs text-green-700 mt-0.5">Powered by Supabase — enterprise-grade infrastructure</p>
        </div>
      </div>

      {/* Feature list */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-start gap-2.5 bg-white rounded-lg px-3 py-3 border border-green-100">
          <Database className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-800">Automatic Backups</p>
            <p className="text-xs text-gray-500 mt-0.5">Daily backups retained for 7 days. Point-in-time recovery available.</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 bg-white rounded-lg px-3 py-3 border border-green-100">
          <Clock className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-800">99.9% Uptime</p>
            <p className="text-xs text-gray-500 mt-0.5">Hosted on AWS with redundancy. Your clinic is always accessible.</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 bg-white rounded-lg px-3 py-3 border border-green-100">
          <Lock className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-800">Data Isolation</p>
            <p className="text-xs text-gray-500 mt-0.5">Your clinic's data is completely private. No other clinic can access it.</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-green-700">
        Patient records are never deleted — archiving keeps them safe but hidden. All data is encrypted at rest and in transit.
      </p>
    </div>
  );
}
