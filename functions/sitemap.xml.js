// Self-contained Cloudflare Pages Function for /sitemap.xml (zero external dependencies)

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  const headers = {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=60, s-maxage=60',
    'Access-Control-Allow-Origin': '*',
  };

  if (method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }

  // Serve static pre-built sitemap.xml from ASSETS if available
  if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    try {
      const assetResp = await env.ASSETS.fetch(new Request(request.url));
      if (assetResp && assetResp.ok) {
        const text = await assetResp.text();
        if (text.includes('<urlset')) {
          return new Response(text, { status: 200, headers });
        }
      }
    } catch {
      // Fallback below
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://walkathawa.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://walkathawa.com/posts</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://walkathawa.com/categories</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://walkathawa.com/collections</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

  return new Response(xml, { status: 200, headers });
}
