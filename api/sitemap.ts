const PROJECT_ID = 'gen-lang-client-0113753106';
const DATABASE_ID = 'ai-studio-3697506a-5277-42dc-9a15-7b72e6472d8f';

interface FirestoreValue {
  stringValue?: string;
  booleanValue?: boolean;
  timestampValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
  updateTime?: string;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default async function handler(req: any, res: any) {
  const origin = 'https://walkathawa.com';
  const today = new Date().toISOString().split('T')[0];

  const postUrls: { loc: string; lastmod: string }[] = [];
  const discoveredCategories = new Set<string>();
  const discoveredCollections = new Set<string>();

  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      PROJECT_ID
    )}/databases/${encodeURIComponent(DATABASE_ID)}/documents`;

    const [postsResp, taxonomyResp] = await Promise.all([
      fetch(`${baseUrl}/posts?pageSize=500`).catch(() => null),
      fetch(`${baseUrl}/settings/taxonomy`).catch(() => null),
    ]);

    if (taxonomyResp && taxonomyResp.ok) {
      const taxData = (await taxonomyResp.json()) as FirestoreDocument;
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
      const postsData = (await postsResp.json()) as {
        documents?: FirestoreDocument[];
      };
      const docs = postsData.documents || [];

      for (const docItem of docs) {
        const parts = docItem.name.split('/');
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
        const lastmod = rawTime.split('T')[0] || today;

        postUrls.push({
          loc: `${origin}/posts/${encodeURIComponent(postId)}`,
          lastmod,
        });
      }
    }
  } catch (err) {
    console.error('Firestore fetch warning in sitemap:', err);
  }

  const staticEntries = [
    { loc: `${origin}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: `${origin}/posts`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: `${origin}/categories`, lastmod: today, changefreq: 'daily', priority: '0.8' },
    { loc: `${origin}/collections`, lastmod: today, changefreq: 'daily', priority: '0.8' },
    { loc: `${origin}/privacy-policy`, lastmod: today, changefreq: 'monthly', priority: '0.4' },
    {
      loc: `${origin}/terms-and-conditions`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.4',
    },
  ];

  const categoryEntries = Array.from(discoveredCategories).map((c) => ({
    loc: `${origin}/categories/${encodeURIComponent(c)}`,
    lastmod: today,
    changefreq: 'daily',
    priority: '0.8',
  }));

  const collectionEntries = Array.from(discoveredCollections).map((c) => ({
    loc: `${origin}/collections/${encodeURIComponent(c)}`,
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

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
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

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  res.status(200).send(xml);
}
