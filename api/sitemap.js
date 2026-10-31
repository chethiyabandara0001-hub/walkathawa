const PROJECT_ID = 'gen-lang-client-0113753106';
const DATABASE_ID = 'ai-studio-3697506a-5277-42dc-9a15-7b72e6472d8f';
const ORIGIN = 'https://walkathawa.com';

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function buildSitemapXml() {
  const today = new Date().toISOString().split('T')[0];
  const postUrls = [];
  const discoveredCategories = new Set();
  const discoveredCollections = new Set();

  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      PROJECT_ID
    )}/databases/${encodeURIComponent(DATABASE_ID)}/documents`;

    const [postsResp, taxonomyResp] = await Promise.all([
      fetch(`${baseUrl}/posts?pageSize=500`).catch(() => null),
      fetch(`${baseUrl}/settings/taxonomy`).catch(() => null),
    ]);

    if (taxonomyResp && taxonomyResp.ok) {
      const taxData = await taxonomyResp.json();
      const catValues = taxData.fields?.categories?.arrayValue?.values || [];
      for (const v of catValues) {
        if (v.stringValue?.trim()) discoveredCategories.add(v.stringValue.trim());
      }
      const colValues = taxData.fields?.collections?.arrayValue?.values || [];
      for (const v of colValues) {
        if (v.stringValue?.trim()) discoveredCollections.add(v.stringValue.trim());
      }
    }

    if (postsResp && postsResp.ok) {
      const postsData = await postsResp.json();
      const docs = postsData.documents || [];

      for (const docItem of docs) {
        const parts = String(docItem.name || '').split('/');
        const postId = parts[parts.length - 1];
        if (!postId) continue;

        const fields = docItem.fields || {};
        const published =
          fields.published?.booleanValue !== undefined
            ? fields.published.booleanValue
            : true;
        if (!published) continue;

        const cat = fields.category?.stringValue?.trim();
        if (cat) discoveredCategories.add(cat);

        const col = fields.collection?.stringValue?.trim();
        if (col) discoveredCollections.add(col);

        const rawTime =
          fields.updatedAt?.timestampValue ||
          fields.createdAt?.timestampValue ||
          docItem.updateTime ||
          today;
        const lastmod = String(rawTime).split('T')[0] || today;

        postUrls.push({
          loc: `${ORIGIN}/posts/${encodeURIComponent(postId)}`,
          lastmod,
        });
      }
    }
  } catch (err) {
    console.error('Firestore fetch warning in sitemap:', err);
  }

  const staticEntries = [
    { loc: `${ORIGIN}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: `${ORIGIN}/posts`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: `${ORIGIN}/categories`, lastmod: today, changefreq: 'daily', priority: '0.8' },
    { loc: `${ORIGIN}/collections`, lastmod: today, changefreq: 'daily', priority: '0.8' },
    { loc: `${ORIGIN}/privacy-policy`, lastmod: today, changefreq: 'monthly', priority: '0.4' },
    {
      loc: `${ORIGIN}/terms-and-conditions`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.4',
    },
  ];

  const categoryEntries = Array.from(discoveredCategories).map((c) => ({
    loc: `${ORIGIN}/categories/${encodeURIComponent(c)}`,
    lastmod: today,
    changefreq: 'daily',
    priority: '0.8',
  }));

  const collectionEntries = Array.from(discoveredCollections).map((c) => ({
    loc: `${ORIGIN}/collections/${encodeURIComponent(c)}`,
    lastmod: today,
    changefreq: 'daily',
    priority: '0.8',
  }));

  const postEntries = postUrls.map((p) => ({
    loc: p.loc,
    lastmod: p.lastmod,
    changefreq: 'weekly',
    priority: '0.9',
  }));

  const allEntries = [
    ...staticEntries,
    ...categoryEntries,
    ...collectionEntries,
    ...postEntries,
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries
  .map(
    (item) => `  <url>
    <loc>${escapeXml(item.loc)}</loc>
    <lastmod>${escapeXml(item.lastmod)}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;
}

export default async function handler(req, res) {
  const xml = await buildSitemapXml();

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  res.status(200).send(xml);
}
