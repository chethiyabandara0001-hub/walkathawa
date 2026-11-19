import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://walkathawa.com';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc2822(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

export function buildRssXmlFromPosts(posts = []) {
  const published = (Array.isArray(posts) ? posts : [])
    .filter((p) => p && p.published !== false && p.slug)
    .sort((a, b) => {
      const tA = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
      const tB = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
      return tB - tA;
    })
    .slice(0, 50);

  const lastBuildDate =
    published.length > 0
      ? toRfc2822(published[0].updatedAt || published[0].createdAt)
      : new Date().toUTCString();

  const itemsXml = published
    .map((post) => {
      const link = `${ORIGIN}/posts/${post.slug}`;
      const rawDesc = String(post.excerpt || post.content || post.title || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 240);
      const categoryTag = post.category
        ? `\n      <category>${escapeXml(post.category)}</category>`
        : '';
      return `    <item>
      <title>${escapeXml(post.title || post.slug)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${escapeXml(toRfc2822(post.createdAt || post.updatedAt))}</pubDate>
      <description>${escapeXml(rawDesc)}</description>${categoryTag}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Wal Kathawa – Sinhala Wal Katha &amp; Wela Katha</title>
    <link>${ORIGIN}/</link>
    <description>දිනපතා අලුත් වන සිංහල වල් කතා සහ වැල කතා. Latest Sinhala Wal Katha stories on Wal Kathawa.</description>
    <language>si-LK</language>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <atom:link href="${ORIGIN}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;
}

export async function buildRssFeedXml() {
  try {
    const raw = await fs.readFile(
      path.join(rootDir, 'src', 'data', 'prerenderedData.json'),
      'utf8'
    );
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.posts) && parsed.posts.length > 0) {
      return buildRssXmlFromPosts(parsed.posts);
    }
  } catch {
    // fallback to static public/rss.xml
  }
  try {
    return await fs.readFile(path.join(rootDir, 'public', 'rss.xml'), 'utf8');
  } catch {
    return buildRssXmlFromPosts([]);
  }
}

export default async function handler(req, res) {
  const xml = await buildRssFeedXml();
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }
  return res.status(200).send(xml);
}
