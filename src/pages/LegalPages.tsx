import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';

export function PrivacyPolicyPage() {
  useSeo({
    title: 'Privacy Policy | Wal Kathawa',
    description:
      'Privacy Policy for Wal Kathawa (walkathawa.com) covering data storage, cookies, reader comments, and Firebase security.',
    canonical: '/privacy-policy',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
    ],
  });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mb-6">
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
            Wal Kathawa (walkathawa.com) collects minimal information required to deliver
            stories and community discussions. When readers submit a public comment on a
            story, we store the display name, comment text, and publication timestamp in
            Google Cloud Firestore.
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
            3. Local Preferences &amp; Cookies
          </h2>
          <p>
            We store a local browser preference (<code>monolith_theme</code>) to remember
            whether you prefer the Navy Dark or Light reading interface. No personal reader
            profiles are sold or shared.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            4. Data Retention &amp; Removal
          </h2>
          <p>
            Published stories and reader comments remain part of the story archive unless
            removed by the site administrator. For removal inquiries, please visit our{' '}
            <Link to="/contact" className="text-blue-600 dark:text-blue-400 underline">
              Contact page
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}

export function TermsAndConditionsPage() {
  useSeo({
    title: 'Terms and Conditions | Wal Kathawa',
    description:
      'Terms and Conditions governing the use of Wal Kathawa (walkathawa.com), intellectual property, adult content rules, and reader comments.',
    canonical: '/terms-and-conditions',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Terms and Conditions', href: '/terms-and-conditions' },
    ],
  });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mb-6">
        Terms and Conditions
      </h1>

      <div className="space-y-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Last updated: October 30, 2026
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            1. Acceptance of Terms &amp; Age Requirement
          </h2>
          <p>
            By accessing and reading Wal Kathawa (walkathawa.com), you confirm that you are
            at least 18 years of age (or the age of majority in your jurisdiction) and agree
            to abide by these Terms and Conditions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            2. Intellectual Property &amp; Story Archives
          </h2>
          <p>
            All original stories, illustrations, and curated collections published on
            walkathawa.com are protected by copyright. You may share links to individual
            story URLs, but full reproduction without written permission is prohibited.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            3. Reader Comments &amp; Conduct
          </h2>
          <p>
            Readers may post comments underneath stories. Harassment, spam, unlawful
            content, or impersonation is strictly prohibited. The administrator reserves the
            right to remove any comment at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            4. Limitation of Liability
          </h2>
          <p>
            All fictional stories and creative works are provided on an &ldquo;as-is&rdquo;
            basis without warranties of any kind.
          </p>
        </section>
      </div>
    </div>
  );
}

export function AboutPage() {
  useSeo({
    title: 'About Wal Kathawa – Sinhala Story Archive | Wal Kathawa',
    description:
      'Learn about Wal Kathawa (walkathawa.com), Sri Lanka’s digital library for Sinhala Wal Katha, Wela Katha, and serialized Sinhala fiction.',
    canonical: '/about',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
    ],
  });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mb-6">
        About Wal Kathawa — අප ගැන
      </h1>

      <div className="space-y-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
        <p>
          <strong>Wal Kathawa (walkathawa.com)</strong> is an online Sinhala fiction and
          adult story archive dedicated to publishing original Sinhala Wal Katha (සිංහල වල්
          කතා), Wela Katha (සිංහල වැල කතා), and multi-part serialized collections for adult
          readers in Sri Lanka and around the world.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Our Mission
          </h2>
          <p>
            We provide a fast, mobile-friendly, and well-organized reading experience with
            clear Sinhala typography, categorized story collections, and daily updates.
            Readers can browse stories by category at{' '}
            <Link to="/categories" className="text-blue-600 dark:text-blue-400 underline">
              /categories
            </Link>{' '}
            or follow multi-part series at{' '}
            <Link to="/collections" className="text-blue-600 dark:text-blue-400 underline">
              /collections
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Adult Content Notice (18+)
          </h2>
          <p>
            All stories on Wal Kathawa are works of adult fiction intended strictly for
            consenting adults aged 18 and over. Characters and events depicted in our
            stories are entirely fictional.
          </p>
        </section>
      </div>
    </div>
  );
}

export function ContactPage() {
  useSeo({
    title: 'Contact Us – Wal Kathawa Editorial Team | Wal Kathawa',
    description:
      'Contact the Wal Kathawa (walkathawa.com) editorial and moderation team for story submissions, copyright inquiries, or feedback.',
    canonical: '/contact',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Contact', href: '/contact' },
    ],
  });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mb-6">
        Contact Us — අපව අමතන්න
      </h1>

      <div className="space-y-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
        <p>
          Have a question, story submission, feedback, or content removal request? Reach out
          to the <strong>Wal Kathawa</strong> editorial team using the contact details below.
        </p>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#111d38] space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Editorial &amp; Support Email
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              <a
                href="mailto:contact@walkathawa.com"
                className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                contact@walkathawa.com
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Copyright &amp; DMCA Inquiries
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Please include the exact story URL (<code>https://walkathawa.com/posts/...</code>)
              when requesting an edit or removal so our team can respond promptly within 24–48
              hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
