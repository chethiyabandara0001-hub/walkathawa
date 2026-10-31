import { SEOHead } from '../components/SEOHead';

export function PrivacyPolicyPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Privacy Policy' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <SEOHead
        title="Privacy Policy"
        description="Privacy Policy for walkathawa covering data storage, cookies, reader comments, and Firebase security."
        canonicalPath="/privacy-policy"
        breadcrumbs={breadcrumbs}
      />

      <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white mb-6">
        Privacy Policy
      </h1>

      <div className="space-y-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Last updated: October 30, 2026
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            1. Information We Collect
          </h2>
          <p>
            walkathawa collects minimal information required to deliver stories and
            community discussions. When readers submit a public comment on a story, we store
            the display name, comment text, and publication timestamp in Google Cloud
            Firestore.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            2. Administrator Authentication
          </h2>
          <p>
            Administrator access at <code>/admin</code> uses Google Sign-In via Firebase
            Authentication. Authentication tokens are verified strictly against our
            configured administrator email address to authorize story publishing and
            moderation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            3. Local Preferences & Cookies
          </h2>
          <p>
            We store a local browser preference (<code>monolith_theme</code>) to remember
            whether you prefer the Navy Dark or Light reading interface. No third-party
            tracking profiles are sold or shared.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            4. Data Retention & Removal
          </h2>
          <p>
            Published stories and reader comments remain part of the story archive unless
            removed by the site administrator. For removal inquiries, please contact the
            editorial administrator.
          </p>
        </section>
      </div>
    </div>
  );
}

export function TermsAndConditionsPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Terms and Conditions' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <SEOHead
        title="Terms and Conditions"
        description="Terms and Conditions governing the use of walkathawa, intellectual property, and reader comments."
        canonicalPath="/terms-and-conditions"
        breadcrumbs={breadcrumbs}
      />

      <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white mb-6">
        Terms and Conditions
      </h1>

      <div className="space-y-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Last updated: October 30, 2026
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing and reading walkathawa, you agree to abide by these Terms
            and Conditions and all applicable laws and regulations.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            2. Intellectual Property & Story Archives
          </h2>
          <p>
            All original stories, photographs, illustrations, and curated collections
            published on walkathawa are protected by copyright. You may share links
            to individual story URLs, but full reproduction without written permission is
            prohibited.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            3. Reader Comments & Conduct
          </h2>
          <p>
            Readers may post comments underneath stories. Harassment, spam, unlawful
            content, or impersonation is strictly prohibited. The administrator reserves
            the right to remove any comment at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            4. Limitation of Liability
          </h2>
          <p>
            Content is provided on an &ldquo;as-is&rdquo; editorial basis without warranties
            of any kind.
          </p>
        </section>
      </div>
    </div>
  );
}
