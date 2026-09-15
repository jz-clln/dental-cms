// src/app/terms/page.tsx
'use client';

import { FileText, UserCheck, CreditCard, Ban, Scale, RefreshCw, AlertTriangle, Mail } from 'lucide-react';
import { LegalPageHeader, Section, BulletList, Callout } from '@/components/legal/LegalSection';

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      <LegalPageHeader
        icon={FileText}
        title="Terms of Service"
        lastUpdated="September 2026"
        description={
          <>
            These Terms govern your clinic's use of Bitey and are entered into in
            accordance with the laws of the Republic of the Philippines, including the{' '}
            <strong className="text-gray-700">Electronic Commerce Act (RA 8792)</strong>{' '}
            and the <strong className="text-gray-700">Consumer Act (RA 7394)</strong>{' '}
            where applicable. See our{' '}
            <a href="/privacy" className="text-teal-700 underline hover:text-teal-800">
              Privacy Policy
            </a>{' '}
            for how we handle personal and patient data.
          </>
        }
      />

      <Section icon={UserCheck} title="Acceptance of Terms & Eligibility">
        <p>
          By creating a clinic account, you confirm that you are authorized to act on
          behalf of the clinic and that the information you provide and including DTI/SEC
          registration, PRC license, and BIR registration, is accurate and current.
        </p>
        <BulletList items={[
          'Bitey verifies clinic identity before activating full access',
          'Accounts are for licensed dental practices operating in the Philippines',
          'You are responsible for keeping your account credentials confidential',
          'You must promptly notify us of any unauthorized use of your account',
        ]} />
      </Section>

      <Section icon={FileText} title="Description of Service">
        <p>
          Bitey provides a clinic management platform for scheduling, patient records,
          billing, and related administrative functions. Bitey is a tool provided to
          licensed dental professionals and does not itself practice dentistry, diagnose,
          or provide medical advice.
        </p>
      </Section>

      <Section icon={CreditCard} title="Subscription, Billing & Refunds">
        <BulletList items={[
          'Subscription fees are billed in Philippine Pesos (₱) unless stated otherwise',
          'Prices are inclusive of applicable taxes under the National Internal Revenue Code, unless stated otherwise',
          'Subscriptions renew automatically unless cancelled before the renewal date',
          'Refunds, where applicable, are handled in accordance with our refund policy and Philippine consumer protection law',
        ]} />
      </Section>

      <Section icon={UserCheck} title="Clinic Responsibilities & Data Roles">
        <p>
          As between your clinic and Bitey, your clinic is the{' '}
          <strong className="text-gray-700">personal information controller</strong> for
          patient data entered into the system, and Bitey acts as the{' '}
          <strong className="text-gray-700">personal information processor</strong>, per
          the Data Privacy Act of 2012. This means your clinic is responsible for:
        </p>
        <BulletList items={[
          'Obtaining valid patient consent before entering their data into Bitey',
          'Ensuring the accuracy of patient records you input',
          'Honoring patient data subject rights under the DPA',
          'Complying with dental practice and health-record regulations applicable to your clinic',
        ]} />
      </Section>

      <Section icon={Ban} title="Acceptable Use">
        <p>You agree not to:</p>
        <BulletList items={[
          'Use the platform for any unlawful purpose or in violation of Philippine law',
          'Attempt to access another clinic\'s data without authorization',
          'Reverse-engineer, decompile, or attempt to extract the platform\'s source code',
          'Upload data you do not have the right or consent to upload',
          'Interfere with or disrupt the platform\'s infrastructure or security',
        ]} />
      </Section>

      <Section icon={AlertTriangle} title="Service Availability & Liability">
        <p>
          We take reasonable measures to keep Bitey available and secure, but we do not
          guarantee uninterrupted or error-free service. To the fullest extent permitted
          under Philippine law, Bitey's liability for any claim arising from use of the
          platform is limited to the fees paid by your clinic in the 12 months preceding
          the claim.
        </p>
        <Callout variant="amber">
          Nothing in these Terms limits liability for fraud, gross negligence, or any
          liability that cannot lawfully be excluded or limited under the Civil Code of
          the Philippines.
        </Callout>
      </Section>

      <Section icon={RefreshCw} title="Suspension & Termination">
        <BulletList items={[
          'You may cancel your subscription at any time from your account settings',
          'We may suspend or terminate accounts that violate these Terms or applicable law',
          'Upon termination, patient records remain subject to the retention obligations described in our Privacy Policy',
          'Clinics may request an export of their data before account closure',
        ]} />
      </Section>

      <Section icon={Scale} title="Governing Law & Dispute Resolution">
        <p>
          These Terms are governed by the laws of the Republic of the Philippines. Any
          dispute arising from these Terms shall first be addressed through good-faith
          negotiation, and if unresolved, submitted to the exclusive jurisdiction of the
          courts of [City], Philippines, or, where agreed by both parties, resolved
          through arbitration under the Alternative Dispute Resolution Act of 2004 (RA 9285).
        </p>
      </Section>

      <Section icon={FileText} title="General Provisions">
        <BulletList items={[
          'If any provision of these Terms is found unenforceable, the remaining provisions continue in effect',
          'These Terms, together with our Privacy Policy, constitute the entire agreement between you and Bitey',
          'We may update these Terms from time to time; material changes will be notified to registered clinics',
          'Neither party is liable for delays caused by events beyond reasonable control (force majeure)',
        ]} />
      </Section>

      <Section icon={Mail} title="Contact">
        <p>Questions about these Terms can be sent to:</p>
        <div className="mt-2 space-y-1">
          <p><span className="font-medium text-ink-600">Email:</span> biteyclinicmanagement@gmail.com</p>
          <p><span className="font-medium text-ink-600">Platform:</span> bitey-clinic.vercel.app</p>
        </div>
      </Section>
    </div>
  );
}