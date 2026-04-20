'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppIcon, ToothIcon } from '@/components/ui/ToothLogo';
import { Upload, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoUploadProps {
  clinicId: string;
  currentLogoUrl: string | null;
  clinicName: string;
  onUpdated: (url: string | null) => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

export function LogoUpload({ clinicId, currentLogoUrl, clinicName, onUpdated, toast }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    // Validate
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, or SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB.');
      return;
    }

    setUploading(true);
    const supabase = createClient();

    // Preview immediately
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop() ?? 'png';
    const path = `${clinicId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('clinic-logos')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast.error('Failed to upload logo. Please try again.');
      setPreview(currentLogoUrl);
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('clinic-logos')
      .getPublicUrl(path);

    // Add cache-buster so it refreshes immediately
    const urlWithCache = `${publicUrl}?t=${Date.now()}`;

    // Save to clinics table
    const { error: dbError } = await supabase
      .from('clinics')
      .update({ logo_url: urlWithCache })
      .eq('id', clinicId);

    if (dbError) {
      toast.error('Logo uploaded but failed to save. Please try again.');
    } else {
      toast.success('Clinic logo updated successfully.');
      setPreview(urlWithCache);
      onUpdated(urlWithCache);
    }
    setUploading(false);
  }

  async function handleRemove() {
    setRemoving(true);
    const supabase = createClient();

    await supabase.from('clinics').update({ logo_url: null }).eq('id', clinicId);

    setPreview(null);
    onUpdated(null);
    toast.success('Logo removed. Using default tooth icon.');
    setRemoving(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-5">
        {/* Current logo preview */}
        <div className="flex-shrink-0">
          <AppIcon size="lg" logoUrl={preview} clinicName={clinicName} />
          <p className="text-xs text-gray-400 text-center mt-1.5">Preview</p>
        </div>

        {/* Upload area */}
        <div className="flex-1">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all',
              dragOver
                ? 'border-teal-400 bg-teal-50'
                : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-teal-600">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="text-sm font-medium">Uploading…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {dragOver ? 'Drop your logo here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, SVG or WebP · Max 2MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <ul className="mt-2.5 space-y-1">
            {[
              'Square image works best (1:1 ratio)',
              'Minimum 256×256px recommended',
              'Will appear in sidebar, login page, and print schedule',
            ].map(tip => (
              <li key={tip} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Remove button */}
      {preview && (
        <button
          onClick={handleRemove}
          disabled={removing}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600
            font-medium transition-colors disabled:opacity-50"
        >
          {removing
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5" />
          }
          Remove logo — revert to tooth icon
        </button>
      )}
    </div>
  );
}
