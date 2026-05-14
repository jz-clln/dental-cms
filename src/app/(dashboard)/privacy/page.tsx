'use client';

import { Shield, Database, Clock, UserCheck, Trash2, Mail } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

// ------------------------------------------------------------
// Section helper
// ------------------------------------------------------------

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-teal-700" />
          </div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
        </div>
      </CardHeader>
      <CardBody className="text-sm text-gray-600 leading-relaxed space-y-2">
        {children}
      </CardBody>
    </Card>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mt-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-5">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-5 h-5 text-teal-700" />
          <h1 className="text-lg font-bold text-gray-900">Privacy Notice</h1>
        </div>
        <p className="text-sm text-gray-500">
          This notice explains how Bitey collects, uses, and protects the data
          of clinics and their patients in accordance with the{' '}
          <strong className="text-gray-700">Data Privacy Act of 2012 (RA 10173)</strong>.
        </p>
        <p className="text-xs text-gray-400 mt-2">Last updated: June 2025</p>
      </div>

      {/* 1. What we collect */}
      <Section icon={Database} title="What Data We Collect">
        <p>We collect two categories of data:</p>
        <p className="font-medium text-gray-700 mt-2">Clinic & Staff Data</p>
        <BulletList items={[
          'Clinic name, address, and contact details',
          'Owner name and DTI / SEC registration number',
          'Staff names, email addresses, and roles',
          'Uploaded verification documents (DTI certificate, valid ID, PRC license, BIR registration)',
          'Logo and branding assets',
        ]} />
        <p className="font-medium text-gray-700 mt-3">Patient Data (collected by your clinic)</p>
        <BulletList items={[
          'Full name, date of birth, and contact information',
          'Dental and medical history',
          'Treatment records, tooth charts, and visit notes',
          'Appointment schedules and billing records',
          'Data privacy consent status and timestamp',
        ]} />
      </Section>

      {/* 2. Why we collect it */}
      <Section icon={UserCheck} title="Why We Collect It">
        <p>Data is collected and processed for the following purposes:</p>
        <BulletList items={[
          'To operate and maintain your clinic\'s dental management system',
          'To verify clinic identity and ensure DPA compliance',
          'To enable appointment scheduling, patient records, and billing',
          'To send important system notifications and reminders',
          'To generate reports and analytics for clinic operations',
          'To comply with legal obligations under Philippine law',
        ]} />
        <p className="mt-2">
          Patient data is processed solely on behalf of your clinic. Bitey acts as a
          data processor — your clinic remains the data controller responsible for
          obtaining patient consent.
        </p>
      </Section>

      {/* 3. How long we keep it */}
      <Section icon={Clock} title="How Long We Keep It">
        <div className="space-y-3">
          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex-1">
              <p className="font-medium text-gray-700 text-xs uppercase tracking-wide">Patient Records</p>
              <p className="mt-0.5">Retained for a minimum of <strong>10 years</strong> from the last date of service, in line with Philippine dental practice standards.</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex-1">
              <p className="font-medium text-gray-700 text-xs uppercase tracking-wide">Clinic & Staff Data</p>
              <p className="mt-0.5">Retained for the duration of your active subscription plus <strong>2 years</strong> after account closure, then securely deleted or anonymized.</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex-1">
              <p className="font-medium text-gray-700 text-xs uppercase tracking-wide">Verification Documents</p>
              <p className="mt-0.5">Stored securely and retained for the lifetime of your clinic account for audit purposes.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* 4. Patient rights */}
      <Section icon={Shield} title="Patient Rights Under the DPA">
        <p>
          Under Republic Act No. 10173, patients whose data is stored in your clinic have
          the following rights, which your clinic is responsible for honoring:
        </p>
        <BulletList items={[
          'Right to be informed — patients must be told how their data is used before collection',
          'Right to access — patients may request a copy of all personal data held about them',
          'Right to correction — patients may request updates to inaccurate or outdated data',
          'Right to erasure — patients may request deletion of their data, subject to legal retention obligations',
          'Right to data portability — patients may request their records in a portable electronic format',
          'Right to object — patients may object to processing of their data for certain purposes',
          'Right to lodge a complaint — patients may file a complaint with the National Privacy Commission (NPC)',
        ]} />
      </Section>

      {/* 5. Data deletion */}
      <Section icon={Trash2} title="How to Request Data Deletion">
        <p>
          To request the deletion of your clinic account and associated data, or to submit
          a patient data deletion request on behalf of a patient:
        </p>
        <BulletList items={[
          'Send a written request to our privacy email below',
          'Include your clinic name, registered email, and the specific data to be deleted',
          'We will process your request within 15 business days',
          'Note: certain records may be retained where required by Philippine law',
        ]} />
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Patient records subject to the 10-year retention requirement under dental
          practice regulations cannot be deleted prior to that period, even upon request.
        </div>
      </Section>

      {/* 6. Contact */}
      <Section icon={Mail} title="Contact & Data Protection Officer">
        <p>
          For privacy-related concerns, data subject requests, or to report a data breach,
          please contact us:
        </p>
        <div className="mt-2 space-y-1">
          <p><span className="font-medium text-gray-700">Email:</span> biteyclinicmanagement@gmail.com</p>
          <p><span className="font-medium text-gray-700">Platform:</span> bitey-clinic.vercel.app</p>
          <p><span className="font-medium text-gray-700">Regulator:</span>{' '}
            <a
              href="https://www.privacy.gov.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 underline hover:text-teal-800"
            >
              National Privacy Commission — privacy.gov.ph
            </a>
          </p>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          We aim to respond to all privacy inquiries within 5 business days.
        </p>
      </Section>

    </div>
  );
}