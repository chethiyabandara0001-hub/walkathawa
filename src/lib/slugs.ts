/**
 * Romanized ASCII slug utilities for posts, categories, and collections.
 * Enforces lowercase ASCII [a-z0-9-], max 60 chars, no percent-encoding,
 * and deterministic numeric suffix deduplication (-2, -3, etc.).
 *
 * IMPORTANT: Kept strictly in sync with scripts/generate-sitemap.mjs and
 * public/_worker.js so build-time prerendering, sitemaps, redirects, and
 * client routing always produce identical canonical slugs.
 */

const KNOWN_TAXONOMY_SLUGS: Record<string, string> = {
  'අම්ම පුතා': 'amma-putha',
  'වයිෆ් හෝ gf': 'wife-ho-gf',
  'සහෝදර/සහෝදරී': 'sahodara-sahodari',
  'තාත්ත දුව': 'thaththa-duwa',
  'පවුලේ අන් අය සමග': 'pawule-an-aya-samaga',
  'සම ලිංගික': 'sama-lingika',
  'වැඩිමහල් බාල': 'wadimahal-bala',
  'වෙනත්': 'wenath',
};

/**
 * Legacy mismatched taxonomy slugs produced by an earlier version of slugs.ts.
 * Used to 301-redirect any previously crawled variant to the canonical slug.
 */
export const LEGACY_CATEGORY_SLUG_REDIRECTS: Record<string, string> = {
  'iskole-mis': 'iskolee-mis',
  'mage-kalla': 'mage-kaaella',
};

export const LEGACY_COLLECTION_SLUG_REDIRECTS: Record<string, string> = {
  'amathithumee': 'aemathithumii',
  'nuwanige-sellam': 'nuwanigee-sellam',
  'mage-kalla': 'mage-kaaella',
  'wife-ge-nuwaraeliye-trip-eka': 'wife-ge-nuwaraeliyee-trip-eka',
};

const SINHALA_WORD_DICTIONARY: Record<string, string> = {
  අම්මාගේ: 'ammage',
  අම්මයි: 'ammai',
  අම්මා: 'amma',
  අම්ම: 'amma',
  පුතා: 'putha',
  පුතයි: 'puthai',
  අක්කාගේ: 'akkage',
  අක්කා: 'akka',
  අක්ක: 'akka',
  නංගිගේ: 'nangige',
  නංගි: 'nangi',
  නංගී: 'nangi',
  මල්ලි: 'malli',
  වයිෆ්ගේ: 'wifege',
  වයිෆ්: 'wife',
  බිරිඳ: 'birinda',
  තාත්තා: 'thaththa',
  තාත්ත: 'thaththa',
  දුව: 'duwa',
  පවුලේ: 'paule',
  සහෝදර: 'sahodara',
  සහෝදරී: 'sahodari',
  සමලිංගික: 'samalingika',
  වැඩිමහල්: 'wadimahal',
  බාල: 'bala',
  වෙනත්: 'wenath',
  සමග: 'samaga',
  අන්: 'an',
  අය: 'aya',
  හෝ: 'ho',
  මගේ: 'mage',
  කෙල්ල: 'kella',
  සිංහල: 'sinhala',
  වල්: 'wal',
  වැල: 'wela',
  කතා: 'katha',
  කතාව: 'kathawa',
  කොටස: 'kotasa',
  කොටස්: 'kotas',
  සියලුම: 'siyaluma',
  චිත්‍ර: 'chithra',
  අලුත්: 'aluth',
  රස: 'rasa',
  ගෙදර: 'gedara',
  එහා: 'eha',
  කැම්පස්: 'campus',
  ඇන්ටි: 'aunty',
  නැන්දා: 'nanda',
  මාමා: 'mama',
  සීයා: 'seeya',
  හොර: 'hora',
  ටීචර්: 'teacher',
  ස්පා: 'spa',
};

const SINHALA_INDEPENDENT_VOWELS: Record<string, string> = {
  අ: 'a',
  ආ: 'aa',
  ඇ: 'ae',
  ඈ: 'aae',
  ඉ: 'i',
  ඊ: 'ii',
  උ: 'u',
  ඌ: 'uu',
  ඍ: 'ri',
  ඎ: 'rii',
  ඏ: 'li',
  ඐ: 'lii',
  එ: 'e',
  ඒ: 'ee',
  ඓ: 'ai',
  ඔ: 'o',
  ඕ: 'oo',
  ඖ: 'au',
};

const SINHALA_CONSONANTS: Record<string, string> = {
  ක: 'k',
  ඛ: 'kh',
  ග: 'g',
  ඝ: 'gh',
  ඞ: 'ng',
  ඟ: 'nga',
  ච: 'ch',
  ඡ: 'chh',
  ජ: 'j',
  ඣ: 'jh',
  ඤ: 'ny',
  ඥ: 'gn',
  ඦ: 'nja',
  ට: 't',
  ඨ: 'th',
  ඩ: 'd',
  ඪ: 'dh',
  ණ: 'n',
  ඬ: 'nda',
  ත: 'th',
  ථ: 'thh',
  ද: 'd',
  ධ: 'dh',
  න: 'n',
  ඳ: 'nda',
  ප: 'p',
  ඵ: 'ph',
  බ: 'b',
  භ: 'bh',
  ම: 'm',
  ඹ: 'mba',
  ය: 'y',
  ර: 'r',
  ල: 'l',
  ව: 'w',
  ශ: 'sh',
  ෂ: 'sh',
  ස: 's',
  හ: 'h',
  ළ: 'l',
  ෆ: 'f',
};

const SINHALA_VOWEL_SIGNS: Record<string, string> = {
  '\u0DCA': '', // ් virama (hal kirima)
  '\u0DCF': 'a', // ා
  '\u0DD0': 'ae', // ැ
  '\u0DD1': 'aae', // ෑ
  '\u0DD2': 'i', // ි
  '\u0DD3': 'ii', // ී
  '\u0DD4': 'u', // ු
  '\u0DD6': 'uu', // ූ
  '\u0DD8': 'ri', // ෘ
  '\u0DD9': 'e', // ෙ
  '\u0DDA': 'ee', // ේ
  '\u0DDB': 'ai', // ෛ
  '\u0DDC': 'o', // ො
  '\u0DDD': 'oo', // ෝ
  '\u0DDE': 'au', // ෞ
  '\u0DDF': 'li',
  '\u0DF2': 'rii',
  '\u0DF3': 'lii',
};

const SINHALA_MODIFIERS: Record<string, string> = {
  '\u0D82': 'n', // ං anusvara
  '\u0D83': 'h', // ඃ visarga
};

/**
 * Transliterates Sinhala Unicode text into natural Singlish/ASCII.
 * Properly handles consonant + vowel sign combinations (inherent 'a' vowel when no vowel sign follows).
 */
export function romanizeSinhala(input: string): string {
  if (!input) return '';
  let text = String(input)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip zero-width joiners
    .trim();

  // Sort dictionary keys longest-first so compound words match before prefixes
  const sortedWords = Object.keys(SINHALA_WORD_DICTIONARY).sort(
    (a, b) => b.length - a.length
  );
  for (const siWord of sortedWords) {
    if (text.includes(siWord)) {
      text = text.split(siWord).join(` ${SINHALA_WORD_DICTIONARY[siWord]} `);
    }
  }

  let out = '';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = i + 1 < text.length ? text[i + 1] : '';

    if (SINHALA_INDEPENDENT_VOWELS[ch] !== undefined) {
      out += SINHALA_INDEPENDENT_VOWELS[ch];
      continue;
    }

    if (SINHALA_CONSONANTS[ch] !== undefined) {
      const base = SINHALA_CONSONANTS[ch];
      if (next && SINHALA_VOWEL_SIGNS[next] !== undefined) {
        out += base + SINHALA_VOWEL_SIGNS[next];
        i++; // consume vowel sign
      } else {
        out += base.endsWith('a') ? base : `${base}a`;
      }
      continue;
    }

    if (SINHALA_VOWEL_SIGNS[ch] !== undefined) {
      out += SINHALA_VOWEL_SIGNS[ch];
      continue;
    }

    if (SINHALA_MODIFIERS[ch] !== undefined) {
      out += SINHALA_MODIFIERS[ch];
      continue;
    }

    out += ch;
  }

  return out;
}

/**
 * Generates an ASCII lowercase, hyphen-separated slug up to maxLen (default 60 chars).
 */
export function toRomanizedSlug(input: string, maxLen = 60): string {
  const romanized = romanizeSinhala(input)
    .toLowerCase()
    .replace(/['’`"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!romanized) {
    return 'sinhala-wal-katha';
  }

  if (romanized.length <= maxLen) {
    return romanized;
  }

  // Cut cleanly at a hyphen boundary if possible so words aren't chopped mid-syllable
  const sliced = romanized.slice(0, maxLen).replace(/-+$/g, '');
  const lastHyphen = sliced.lastIndexOf('-');
  if (lastHyphen >= 16) {
    return sliced.slice(0, lastHyphen);
  }
  return sliced || 'sinhala-wal-katha';
}

/**
 * Deduplicates a slug against a Set of used slugs by appending -2, -3, etc.,
 * while strictly keeping total length <= 60 chars.
 */
export function deduplicateSlug(
  rawTitleOrSlug: string,
  usedSlugs: Set<string>,
  maxLen = 60
): string {
  const base = toRomanizedSlug(rawTitleOrSlug, maxLen);
  if (!usedSlugs.has(base)) {
    usedSlugs.add(base);
    return base;
  }

  let counter = 2;
  while (counter < 10000) {
    const suffix = `-${counter}`;
    const trimmedBase = base
      .slice(0, Math.max(1, maxLen - suffix.length))
      .replace(/-+$/g, '');
    const candidate = `${trimmedBase}${suffix}`;
    if (!usedSlugs.has(candidate)) {
      usedSlugs.add(candidate);
      return candidate;
    }
    counter++;
  }

  const fallback = `${base.slice(0, 50)}-${Date.now().toString(36)}`;
  usedSlugs.add(fallback);
  return fallback;
}

/**
 * Tests whether a stored slug is an old opaque/legacy ID (e.g., `story-1793420713559`,
 * `1-0yt4x`, percent-encoded, or > 60 chars) rather than a clean romanized title slug.
 */
export function isOpaqueOrLegacySlug(slug: string, titleOrId?: string): boolean {
  if (!slug) return true;
  const s = String(slug).trim();
  if (!s) return true;
  if (s.length > 60) return true;
  if (/[^a-z0-9-]/.test(s)) return true;
  if (/^(story|post)-\d{3,}$/i.test(s)) return true;
  if (/^\d+-[a-z0-9]{4,8}$/i.test(s)) return true;
  if (/^[a-z0-9]{18,}$/i.test(s) && !s.includes('-')) return true;
  if (titleOrId && s === titleOrId && (/^(story|post)-/i.test(s) || /^\d+-/.test(s))) {
    return true;
  }
  return false;
}

/**
 * Converts a category or collection display name (Sinhala or English) into a clean
 * romanized URL slug (<= 60 chars) matching prerenderedData.json & sitemap.xml.
 */
export function getTaxonomySlug(name: string): string {
  const clean = String(name || '').trim();
  if (!clean) return 'all';
  const lower = clean.toLowerCase();
  if (KNOWN_TAXONOMY_SLUGS[lower]) {
    return KNOWN_TAXONOMY_SLUGS[lower];
  }
  return toRomanizedSlug(clean, 60);
}
