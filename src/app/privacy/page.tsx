// src/app/privacy/page.tsx
'use client';

import { Shield, Database, UserCheck, Clock, Globe, AlertTriangle, Baby, Trash2, Mail } from 'lucide-react';
import { LegalPageHeader, Section, BulletList, Callout, LabeledStat } from '@/components/legal/LegalSection';

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      <LegalPageHeader
        icon={Shield}
        title="Privacy Policy"
        lastUpdated="September 2026"
        description={
          <>
            This policy explains how Bitey collects, uses, stores, and protects
            personal and sensitive personal information in accordance with the{' '}
            <strong className="text-gray-700">Data Privacy Act of 2012 (RA 10173)</strong>,
            its Implementing Rules and Regulations, and applicable National Privacy
            Commission (NPC) issuances. See our{' '}
            <a href="/terms" className="text-teal-700 underline hover:text-teal-800">
              Terms of Service
            </a>{' '}
            for the rules governing your use of the platform itself.
          </>
        }
      />

      <Section icon={Database} title="What Data We Collect">
        <p>We collect two categories of data:</p>
        <p className="font-medium text-ink-600 mt-2">Clinic & Staff Data</p>
        <BulletList items={[
          'Clinic name, address, and contact details',
          'Owner name and DTI / SEC registration number',
          'Staff names, email addresses, and roles',
          'Uploaded verification documents (DTI certificate, valid ID, PRC license, BIR registration)',
          'Logo and branding assets',
          'Account activity and login logs, for security purposes',
        ]} />
        <p className="font-medium text-ink-600 mt-3">Patient Data (collected by your clinic)</p>
        <BulletList items={[
          'Full name, date of birth, and contact information',
          'Dental and medical history',
          'Treatment records, tooth charts, and visit notes',
          'Appointment schedules and billing records',
          'Data privacy consent status and timestamp',
        ]} />
        <Callout variant="amber">
          Dental and medical history are classified as <strong>sensitive personal
          information</strong> under Section 3(l) of the DPA. This data is subject to
          stricter consent, access, and security requirements than ordinary personal data.
        </Callout>
      </Section>

      <Section icon={UserCheck} title="Why We Collect It & Legal Basis">
        <p>We process data under the following legal bases recognized by the DPA:</p>
        <BulletList items={[
          'Consent — for sensitive personal information such as patient health records (Sec. 13)',
          'Contract performance — to provide the clinic management services you signed up for (Sec. 12(b))',
          'Legal obligation — to comply with BIR, PRC, and other Philippine regulatory requirements (Sec. 12(c))',
          'Legitimate interest — for security monitoring and service improvement, balanced against your rights (Sec. 12(f))',
        ]} />
        <p className="mt-2">
          Patient data is processed solely on behalf of your clinic. Bitey acts as a{' '}
          <strong className="text-gray-700">personal information processor</strong>; your
          clinic remains the <strong className="text-gray-700">personal information
          controller</strong> responsible for obtaining valid patient consent and honoring
          patient rights under the DPA.
        </p>
      </Section>

      <Section icon={Shield} title="How We Protect It">
        <p>
          In line with NPC Circular 16-01, we maintain organizational, physical, and
          technical security measures appropriate to the sensitivity of the data, including:
        </p>
        <BulletList items={[
          'Encryption of data in transit and at rest',
          'Role-based access controls limiting staff data access to what their role requires',
          'Regular access logging and monitoring for unauthorized activity',
          'Secure, access-controlled hosting infrastructure',
          'Periodic review of our security practices',
        ]} />
      </Section>

      <Section icon={Globe} title="Data Sharing & Cross-Border Transfer">
        <p>We do not sell personal or patient data. We may share limited data with:</p>
        <BulletList items={[
          'Cloud hosting and infrastructure providers, solely to operate the platform',
          'Payment processors, solely to process clinic subscription payments',
          'Government authorities, where required by Philippine law or a valid legal order',
        ]} />
        <Callout variant="teal">
          Some service providers may process data outside the Philippines. Where this
          occurs, we require contractual safeguards consistent with DPA cross-border
          transfer requirements to ensure your data receives an equivalent level of protection.
        </Callout>
      </Section>

      <Section icon={Clock} title="How Long We Keep It">
        <div className="space-y-3">
          <LabeledStat label="Patient Records">
            Retained for a minimum of <strong>10 years</strong> from the last date of
            service, in line with Philippine dental practice record-keeping standards.
          </LabeledStat>
          <LabeledStat label="Clinic & Staff Data">
            Retained for the duration of your active subscription plus{' '}
            <strong>2 years</strong> after account closure, then securely deleted or anonymized.
          </LabeledStat>
          <LabeledStat label="Verification Documents">
            Stored securely and retained for the lifetime of your clinic account for audit purposes.
          </LabeledStat>
        </div>
      </Section>

      <Section icon={Baby} title="Children's Data">
        <p>
          Where a clinic's patients include minors, Bitey processes that data only on the
          clinic's instructions. Clinics are responsible for obtaining consent from a
          parent or legal guardian before entering a minor's health data into the system,
          consistent with the DPA's requirements for processing children's personal data.
        </p>
      </Section>

      <Section icon={UserCheck} title="Data Subject Rights Under the DPA">
        <p>
          Under Republic Act No. 10173, individuals whose data is held in the system have
          the following rights:
        </p>
        <BulletList items={[
          'Right to be informed — before data is collected and how it will be used',
          'Right to access — to request a copy of personal data held about them',
          'Right to correction — to request updates to inaccurate or outdated data',
          'Right to erasure or blocking — subject to legal retention obligations',
          'Right to data portability — to request records in a portable electronic format',
          'Right to object — to processing for certain purposes',
          'Right to damages — for damages sustained due to inaccurate, unlawfully obtained, or unauthorized use of data',
          'Right to lodge a complaint — with the National Privacy Commission (NPC)',
        ]} />
        <p className="mt-2">Clinics are responsible for honoring these rights for their patients.</p>
      </Section>

      <Section icon={AlertTriangle} title="Data Breach Notification">
        <p>
          If a personal data breach is likely to give rise to a real risk of serious harm,
          we will notify the National Privacy Commission and affected data subjects within
          the timeframe required by NPC Circular 16-03 (generally within 72 hours of
          discovery), and will assist clinics in meeting their own notification obligations
          as data controllers.
        </p>
      </Section>

      <Section icon={Trash2} title="How to Request Data Deletion">
        <p>
          To request deletion of your clinic account and associated data, or to submit a
          patient data deletion request on behalf of a patient:
        </p>
        <BulletList items={[
          'Send a written request to our privacy email below',
          'Include your clinic name, registered email, and the specific data to be deleted',
          'We will process your request within 15 business days',
        ]} />
        <Callout variant="amber">
          Patient records subject to the 10-year retention requirement under dental
          practice regulations cannot be deleted prior to that period, even upon request.
        </Callout>
      </Section>

      <Section icon={Mail} title="Contact & Data Protection Officer">
        <p>
          For privacy-related concerns, data subject requests, or to report a data breach,
          please contact us:
        </p>
        <div className="mt-2 space-y-1">
          <p><span className="font-medium text-ink-600">Email:</span> biteyclinicmanagement@gmail.com</p>
          <p><span className="font-medium text-ink-600">Platform:</span> bitey-clinic.vercel.app</p>
          <p>
            <span className="font-medium text-ink-600">Regulator:</span>{' '}
            <a href="https://www.privacy.gov.ph" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline hover:text-teal-800">
              National Privacy Commission — privacy.gov.ph
            </a>
          </p>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          We aim to respond to all privacy inquiries within 5 business days. This policy
          may be updated periodically; material changes will be notified to registered clinics.
        </p>
      </Section>
    </div>
  );
}