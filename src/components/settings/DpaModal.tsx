'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScrollText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ------------------------------------------------------------
// DPA full text
// ------------------------------------------------------------

const DPA_TEXT = `DATA PRIVACY ACT COMPLIANCE AGREEMENT
Republic Act No. 10173 — Data Privacy Act of 2012

Effective Date: Upon submission of clinic verification

PARTIES
This Data Processing Agreement ("Agreement") is entered into between the clinic ("Data Controller") registered on this platform and Bitey ("Platform"), as the data processor.

1. PURPOSE OF DATA COLLECTION
The clinic collects and processes the following personal data of patients for the purpose of delivering dental health services:
• Full name, date of birth, and contact information
• Dental and medical history
• Treatment records, tooth charts, and visit notes
• Billing and payment records
• Appointment schedules

Data is collected with the express consent of the patient and is used solely for the provision of dental care and clinic operations.

2. LEGAL BASIS FOR PROCESSING
Data processing is conducted under the following legal bases as defined by the Data Privacy Act of 2012:
• Consent — patients are informed of and have agreed to data collection prior to treatment
• Contractual necessity — data is required to fulfill the dental service agreement
• Legitimate interest — operational records required for quality care continuity

3. DATA RETENTION
Patient records will be retained for a minimum of ten (10) years from the last date of service, in accordance with Philippine dental practice standards and the Data Privacy Act. Records beyond this period will be securely disposed of or anonymized.

4. DATA SUBJECT RIGHTS
Patients retain the following rights under Republic Act No. 10173:
• Right to be informed — patients must be told how their data is used
• Right to access — patients may request a copy of their personal data
• Right to correction — patients may request updates to inaccurate data
• Right to erasure — patients may request deletion of their data, subject to legal retention requirements
• Right to data portability — patients may request their records in a portable format
• Right to lodge a complaint — patients may file a complaint with the National Privacy Commission (NPC)

5. DATA SECURITY MEASURES
The clinic agrees to implement appropriate technical and organizational measures to protect patient data, including:
• Access controls limiting data access to authorized staff only
• Secure storage of physical and digital records
• Staff training on data privacy obligations
• Prompt notification of data breaches to affected patients and the NPC within 72 hours

6. THIRD-PARTY SHARING
Patient data will not be sold, rented, or shared with third parties for commercial purposes. Data may be shared with:
• Referral dental specialists with patient consent
• Government health agencies as required by law
• The Bitey platform solely for the purpose of system operations

7. CLINIC OBLIGATIONS
By submitting this verification form, the clinic owner agrees to:
• Appoint a Data Protection Officer (DPO) or designate a responsible staff member
• Maintain a Privacy Management Program
• Ensure all staff handling patient data are trained on the Data Privacy Act
• Comply with all requirements of the National Privacy Commission

8. PLATFORM OBLIGATIONS
Bitey agrees to:
• Process clinic and patient data only as instructed by the clinic
• Implement industry-standard security measures on all stored data
• Not share clinic or patient data with unauthorized third parties
• Provide clinics with tools to fulfill data subject requests

9. BREACH NOTIFICATION
In the event of a personal data breach, the clinic shall notify affected data subjects and the National Privacy Commission (NPC) within 72 hours of becoming aware of the breach, as required under NPC Circular 16-03.

10. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of the Republic of the Philippines, including Republic Act No. 10173 (Data Privacy Act of 2012) and its Implementing Rules and Regulations.

By signing below, the clinic owner confirms that they have read, understood, and agree to comply with all provisions of this Data Processing Agreement and the Data Privacy Act of 2012.`;

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface DpaModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: (signedName: string) => void;
  ownerName?: string; // pre-fill from form
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export function DpaModal({ open, onClose, onAccept, ownerName = '' }: DpaModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed]                           = useState(false);
  const [signedName, setSignedName]                   = useState(ownerName);
  const [nameError, setNameError]                     = useState('');
  const scrollRef                                     = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setHasScrolledToBottom(false);
      setAgreed(false);
      setSignedName(ownerName);
      setNameError('');
      // Scroll text back to top
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [open, ownerName]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    // Allow 20px tolerance for subpixel rendering
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setHasScrolledToBottom(true);
    }
  }

  function handleAccept() {
    if (!signedName.trim()) {
      setNameError('Please type your full name as your e-signature.');
      return;
    }
    onAccept(signedName.trim());
  }

  const canSign = hasScrolledToBottom && agreed;

  return (
    <Modal open={open} onClose={onClose} title="Data Privacy Act Agreement" size="lg">
      <div className="space-y-4">

        {/* Scroll hint */}
        {!hasScrolledToBottom && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <ScrollText className="w-3.5 h-3.5 flex-shrink-0" />
            Please scroll through the full agreement before signing.
          </div>
        )}

        {/* Scrollable DPA text */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-72 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-mono"
        >
          {DPA_TEXT}
        </div>

        {/* Scrolled badge */}
        {hasScrolledToBottom && (
          <div className="flex items-center gap-2 text-xs text-teal-700 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            You have read the full agreement.
          </div>
        )}

        {/* Checkbox */}
        <label className={cn(
          'flex items-start gap-3 cursor-pointer',
          !hasScrolledToBottom && 'opacity-40 pointer-events-none'
        )}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-700 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700 leading-snug">
            I have read and understood the Data Privacy Act Agreement. I agree to comply with
            Republic Act No. 10173 and all obligations stated above on behalf of this clinic.
          </span>
        </label>

        {/* E-signature */}
        <div className={cn(
          'space-y-1 transition-opacity',
          !canSign && 'opacity-40 pointer-events-none'
        )}>
          <p className="text-xs text-gray-500">
            Type your full name below as your electronic signature.
          </p>
          <Input
            label="Full Name (E-Signature)"
            placeholder="e.g. Juan Dela Cruz"
            value={signedName}
            onChange={e => { setSignedName(e.target.value); setNameError(''); }}
            error={nameError}
            disabled={!canSign}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            onClick={handleAccept}
            disabled={!canSign || !signedName.trim()}
          >
            Sign & Accept
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>

      </div>
    </Modal>
  );
}