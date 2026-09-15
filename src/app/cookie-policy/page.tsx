// src/app/cookie-policy/page.tsx
//
// Follows terms/page.tsx's pattern: a single public route, not duplicated
// under (dashboard) the way privacy/page.tsx is — a cookie policy doesn't
// need its own dashboard-chrome entry point.
//
// Content reflects what the app ACTUALLY sets as of this writing: Supabase
// auth cookies + the staff-session cache (session-cookie.ts) + this page's
// own banner-dismissal cookie (cookie-consent.ts). No analytics or
// advertising cookies exist in the codebase, so none are described here —
// if that changes, this page (and CookieBanner.tsx) both need updating.
'use client';

import { Cookie, Info, Database, Ban, Scale, Settings, RefreshCw, Mail } from 'lucide-react';
import { LegalPageHeader, Section, BulletList, Callout, LabeledStat } from '@/components/legal/LegalSection';

export default function CookiePolicyPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      <LegalPageHeader
        icon={Cookie}
        title="Cookie Policy"
        lastUpdated="September 2026"
        description={
          <>
            This policy explains what cookies Bitey uses and why, in line with the
            transparency principle of the{' '}
            <strong className="text-gray-700">Data Privacy Act of 2012 (RA 10173)</strong>.
            See our{' '}
            <a href="/privacy" className="text-teal-700 underline hover:text-teal-800">
              Privacy Policy
            </a>{' '}
            for how we handle personal and patient data more broadly, and our{' '}
            <a href="/terms" className="text-teal-700 underline hover:text-teal-800">
              Terms of Service
            </a>{' '}
            for the rules governing your use of the platform.
          </>
        }
      />

      <Section icon={Info} title="What Are Cookies">
        <p>
          Cookies are small text files stored in your browser when you visit a website.
          They let a site recognize your browser across page loads. For example, to keep
          you signed in without asking you to log in on every single page.
        </p>
      </Section>

      <Section icon={Database} title="Cookies We Use">
        <p>
          Bitey uses only <strong>strictly necessary</strong> cookies. The kind required
          for the platform to function. We do not use any cookie that isn&apos;t listed here.
        </p>
        <div className="space-y-3 mt-3">
          <LabeledStat label="Supabase Authentication (sb-*)">
            Keeps you signed in between page loads and identifies your account to our
            backend. Without this cookie, you would need to log in again on every page.
            Expires when you log out or after your session naturally expires.
          </LabeledStat>
          <LabeledStat label="staff-session">
            A signed, secure cookie that caches whether your staff account is active and
            which clinic you belong to, so this doesn&apos;t need to be re-checked on every
            page you visit. It cannot be read or edited from your browser, only our
            server can create or verify it. Expires automatically after 5 minutes and is
            silently reissued while you remain active.
          </LabeledStat>
          <LabeledStat label="cookie_notice_dismissed">
            Remembers that you&apos;ve seen and dismissed the cookie notice banner, so it
            doesn&apos;t show again on your next visit. Expires after 1 year.
          </LabeledStat>
        </div>
      </Section>

      <Section icon={Ban} title="Cookies We Don't Use">
        <p>Bitey does not currently use, and does not set:</p>
        <BulletList items={[
          'Analytics or usage-tracking cookies',
          'Advertising or marketing cookies',
          'Third-party tracking cookies of any kind',
          'Cookies that sell or share data with advertisers',
        ]} />
        <p className="mt-2">
          If this changes in the future, we will update this page and, where legally
          required, request your consent before setting any new non-essential cookie.
        </p>
      </Section>

      <Section icon={Scale} title="Why We Don't Ask for Consent">
        <p>
          Cookie laws such as the EU&apos;s ePrivacy Directive (and similar frameworks) require
          opt-in consent for <em>non-essential</em> cookies and for typically analytics or
          advertising. Cookies that are strictly necessary for a service to function, like
          the ones listed above, are generally exempt from that consent requirement - 
          disclosure, not permission, is what applies to them.
        </p>
        <Callout variant="teal">
          This is why our cookie banner is a simple notice rather than an "Accept /
          Reject" prompt: there is nothing optional here to opt out of. Every cookie we
          set is required for the platform to work.
        </Callout>
      </Section>

      <Section icon={Settings} title="How to Control Cookies">
        <p>
          Most browsers let you view, block, or delete cookies through their settings.
          You&apos;re free to do this at any time.
        </p>
        <Callout variant="amber">
          Because every cookie Bitey sets is strictly necessary, blocking or deleting them
          will sign you out and may prevent the platform from working and for including staying
          logged in, loading your clinic&apos;s data, or dismissing this notice again on
          future visits.
        </Callout>
      </Section>

      <Section icon={RefreshCw} title="Changes to This Policy">
        <p>
          We may update this policy if the cookies we use change and for example, if we
          introduce analytics in the future. Material changes will be reflected here with
          an updated "Last updated" date, and where legally required, we will seek your
          consent before any new non-essential cookie is set.
        </p>
      </Section>

      <Section icon={Mail} title="Contact">
        <p>Questions about our use of cookies can be sent to:</p>
        <div className="mt-2 space-y-1">
          <p><span className="font-medium text-ink-600">Email:</span> biteyclinicmanagement@gmail.com</p>
          <p><span className="font-medium text-ink-600">Platform:</span> bitey-clinic.vercel.app</p>
        </div>
      </Section>
    </div>
  );
}