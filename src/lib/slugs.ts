/**
 * Romanized ASCII slug utilities for posts, categories, and collections.
 * Enforces lowercase ASCII [a-z0-9-], max 60 chars, no percent-encoding,
 * and deterministic numeric suffix deduplication (-2, -3, etc.).
 */

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

const SINHALA_CONSONANTS: Record<string, string> = {
  ක: 'k',
  ඛ: 'kh',
  ග: 'g',
  ඝ: 'gh',
  ඞ: 'ng',
  ඟ: 'ng',
  ච: 'ch',
  ඡ: 'ch',
  ජ: 'j',
  ඣ: 'jh',
  ඤ: 'ny',
  ඥ: 'gn',
  ඦ: 'nj',
  ට: 't',
  ඨ: 'th',
  ඩ: 'd',
  ඪ: 'dh',
  ණ: 'n',
  ඬ: 'nd',
  ත: 'th',
  ථ: 'th',
  ද: 'd',
  ධ: 'dh',
  න: 'n',
  ඳ: 'nd',
  ප: 'p',
  ඵ: 'ph',
  බ: 'b',
  භ: 'bh',
  ම: 'm',
  ඹ: 'mb',
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

const SINHALA_INDEPENDENT_VOWELS: Record<string, string> = {
  අ: 'a',
  ආ: 'a',
  ඇ: 'a',
  ඈ: 'a',
  ඉ: 'i',
  ඊ: 'ee',
  උ: 'u',
  ඌ: 'oo',
  ඍ: 'ru',
  එ: 'e',
  ඒ: 'e',
  ඓ: 'ai',
  ඔ: 'o',
  ඕ: 'o',
  ඖ: 'au',
};

const SINHALA_VOWEL_SIGNS: Record<string, string> = {
  '\u0DCA': '', // ් virama (hal kirima)
  '\u0DCF': 'a', // ා
  '\u0DD0': 'a', // ැ
  '\u0DD1': 'a', // ෑ
  '\u0DD2': 'i', // ි
  '\u0DD3': 'ee', // ී
  '\u0DD4': 'u', // ු
  '\u0DD6': 'oo', // ූ
  '\u0DD8': 'ru', // ෘ
  '\u0DD9': 'e', // ෙ
  '\u0DDA': 'e', // ේ
  '\u0DDB': 'ai', // ෛ
  '\u0DDC': 'o', // ො
  '\u0DDD': 'o', // ෝ
  '\u0DDE': 'au', // ෞ
  '\u0DF2': 'ru',
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

  const chars = Array.from(text);
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1] || '';

    if (SINHALA_CONSONANTS[ch] !== undefined) {
      const baseConsonant = SINHALA_CONSONANTS[ch];
      if (SINHALA_VOWEL_SIGNS[next] !== undefined) {
        out += baseConsonant + SINHALA_VOWEL_SIGNS[next];
        i++; // consume vowel sign
      } else {
        out += `${baseConsonant}a`;
      }
    } else if (SINHALA_INDEPENDENT_VOWELS[ch] !== undefined) {
      out += SINHALA_INDEPENDENT_VOWELS[ch];
    } else if (SINHALA_VOWEL_SIGNS[ch] !== undefined) {
      out += SINHALA_VOWEL_SIGNS[ch];
    } else if (SINHALA_MODIFIERS[ch] !== undefined) {
      out += SINHALA_MODIFIERS[ch];
    } else {
      out += ch;
    }
  }

  return out;
}

/**
 * Generates an ASCII lowercase, hyphen-separated slug up to maxLen (default 60 chars).
 */
export function toRomanizedSlug(input: string, maxLen = 60): string {
  const romanized = romanizeSinhala(input)
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!romanized) {
    return 'sinhala-wal-katha';
  }

  if (romanized.length <= maxLen) {
    return romanized;
  }

  // Cut cleanly at a hyphen boundary if possible so words aren't chopped mid-syllable
  const sliced = romanized.slice(0, maxLen).replace(/-+$/g, '');
  const lastHyphen = sliced.lastIndexOf('-');
  if (lastHyphen >= 20) {
    return sliced.slice(0, lastHyphen);
  }
  return sliced;
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
  while (true) {
    const suffix = `-${counter}`;
    const trimmedBase = base
      .slice(0, maxLen - suffix.length)
      .replace(/-+$/g, '');
    const candidate = `${trimmedBase}${suffix}`;
    if (!usedSlugs.has(candidate)) {
      usedSlugs.add(candidate);
      return candidate;
    }
    counter++;
  }
}

/**
 * Tests whether a stored slug is an old opaque/legacy ID (e.g., `story-1793420713559`,
 * `1-0yt4x`, percent-encoded, or > 60 chars) rather than a clean romanized title slug.
 */
export function isOpaqueOrLegacySlug(slug: string, title?: string): boolean {
  if (!slug) return true;
  if (slug.length > 60) return true;
  if (/[^a-z0-9-]/.test(slug)) return true;
  if (/^story-\d+/i.test(slug)) return true;
  if (/^post-\d+/i.test(slug)) return true;
  if (/^\d+-[a-z0-9]{4,8}$/i.test(slug)) return true;
  // Detect random 4-char alphanumeric suffix from old slugifyTitle when title produces a clean slug
  if (title) {
    const cleanFromTitle = toRomanizedSlug(title, 60);
    if (
      cleanFromTitle &&
      slug.startsWith(`${cleanFromTitle.slice(0, 20)}`) &&
      /-[a-z0-9]{4}$/.test(slug) &&
      !cleanFromTitle.endsWith(slug.slice(-5))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Converts a category or collection display name (Sinhala or English) into a clean
 * romanized URL slug (<= 60 chars).
 */
export function getTaxonomySlug(name: string): string {
  return toRomanizedSlug(name, 60);
}
